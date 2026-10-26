import { expect, test, type Page } from '@playwright/test';

const EFFECTS = ['flap', 'redact', 'mosaic', 'halftone', 'crt', 'ink', 'swarm', 'darkroom', 'tetris', 'fuse', 'equalizer', 'thermal', 'snow'];

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/** True when every pixel of the card's overlay canvas is transparent. */
const overlayIsBlank = (page: Page, id: string): Promise<boolean> =>
  page.getByTestId(`reveal-${id}`).evaluate((el) => {
    const c = el.querySelector('canvas.arrivo-ov') as HTMLCanvasElement;
    const ctx = c.getContext('2d');
    if (!ctx) return false;
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return false;
    return true;
  });

for (const id of EFFECTS) {
  test(`${id}: loads, reveals in place and cleans up`, async ({ page }) => {
    const errors = collectErrors(page);
    // `?e2e` fixes the mock data, so a replay lands exactly the same layout.
    await page.goto('/?e2e');
    const card = page.getByTestId(`card-${id}`);
    const reveal = page.getByTestId(`reveal-${id}`);
    await card.scrollIntoViewIfNeeded();
    await expect(reveal).toHaveAttribute('data-arrivo-state', 'shown', { timeout: 15_000 });
    await expect(reveal).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
    const before = await reveal.boundingBox();

    await card.getByRole('button', { name: /^Replay/ }).click();
    await expect(reveal).toHaveAttribute('aria-busy', 'true');
    await expect(reveal).toHaveAttribute('data-arrivo-state', 'hidden');
    await expect(reveal).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });

    expect(await reveal.boundingBox()).toEqual(before);
    await expect(reveal).toHaveAttribute('data-arrivo-state', 'shown');
    expect(await overlayIsBlank(page, id)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('every effect paints its loading state over hidden content', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?e2e');
  await page.getByLabel('Hold loading').check();
  await page.getByRole('button', { name: 'Replay all', exact: true }).click();
  for (const id of EFFECTS) {
    const card = page.getByTestId(`card-${id}`);
    const reveal = page.getByTestId(`reveal-${id}`);
    await card.scrollIntoViewIfNeeded();
    await expect(reveal).toHaveAttribute('data-arrivo-state', 'hidden');
    await page.waitForTimeout(300);
    expect(await overlayIsBlank(page, id), `${id} should draw while loading`).toBe(false);
  }
  await page.getByLabel('Hold loading').uncheck();
  for (const id of EFFECTS) {
    await page.getByTestId(`card-${id}`).scrollIntoViewIfNeeded();
    await expect(page.getByTestId(`reveal-${id}`)).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
  }
  expect(errors).toEqual([]);
});

test('the reveal emits arrivo events around a reload', async ({ page }) => {
  await page.goto('/?e2e');
  const card = page.getByTestId('card-ink');
  await card.scrollIntoViewIfNeeded();
  const reveal = page.getByTestId('reveal-ink');
  await expect(reveal).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
  await reveal.evaluate((el) => {
    const w = window as unknown as { __events: boolean[] };
    w.__events = [];
    el.addEventListener('arrivo', (e) => w.__events.push((e as CustomEvent<{ active: boolean }>).detail.active));
  });
  await card.getByRole('button', { name: /^Replay/ }).click();
  await expect(reveal).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __events: boolean[] }).__events)).toEqual([true, false]);
});

test('reduced motion swaps the effect for a short fade', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?e2e');
  const card = page.getByTestId('card-mosaic');
  const reveal = page.getByTestId('reveal-mosaic');
  await card.scrollIntoViewIfNeeded();
  await expect(reveal).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
  await reveal.evaluate((el) => {
    const w = window as unknown as { __fade: { loaded?: number; done?: number } };
    w.__fade = {};
    const cardEl = el.closest('[data-loading]') as HTMLElement;
    new MutationObserver(() => {
      if (cardEl.dataset.loading === 'false' && w.__fade.loaded === undefined) w.__fade.loaded = performance.now();
      if (w.__fade.loaded !== undefined && !el.hasAttribute('aria-busy') && w.__fade.done === undefined) w.__fade.done = performance.now();
    }).observe(cardEl as HTMLElement, { attributes: true, subtree: true, attributeFilter: ['data-loading', 'aria-busy'] });
  });
  await card.getByRole('button', { name: /^Replay/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __fade: { done?: number } }).__fade.done), { timeout: 10_000 }).toBeDefined();
  const fade = await page.evaluate(() => {
    const f = (window as unknown as { __fade: { loaded: number; done: number } }).__fade;
    return f.done - f.loaded;
  });
  expect(fade).toBeLessThanOrEqual(300);
});

test('the sandbox goes from skeleton to content and switches effects', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?e2e');
  const sandbox = page.locator('section', { has: page.getByRole('heading', { name: 'Same layout, any effect.' }) });
  await sandbox.scrollIntoViewIfNeeded();
  const reveals = sandbox.locator('.arrivo');
  await expect(reveals).toHaveCount(3);
  for (const r of await reveals.all()) await expect(r).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
  await expect(sandbox.locator('.arrivo-sk-line')).toHaveCount(0);
  await sandbox.getByRole('radio', { name: 'Tetris' }).click();
  await sandbox.getByRole('button', { name: 'Simulate fetch' }).click();
  for (const r of await reveals.all()) await expect(r).toHaveAttribute('data-arrivo-effect', 'tetris');
  for (const r of await reveals.all()) await expect(r).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test('the hero tour steps to the next effect and reveals it', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?e2e');
  const hero = page.getByTestId('hero-reveal');
  await expect(hero).toHaveAttribute('data-arrivo-effect', 'halftone');
  await expect(hero).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Next effect' }).click();
  await expect(hero).toHaveAttribute('data-arrivo-effect', 'flap');
  await expect(hero).toHaveAttribute('aria-busy', 'true');
  await expect(hero).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
  await expect(page.locator('#top').getByText('Split-flap', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('picking a threshold map replays the ink reveal with it', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?e2e');
  const reveal = page.getByTestId('threshold-reveal');
  await reveal.scrollIntoViewIfNeeded();
  await expect(reveal).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
  const voronoi = page.getByRole('radio', { name: /^Voronoi/ });
  await voronoi.click();
  await expect(voronoi).toHaveAttribute('aria-checked', 'true');
  await expect(reveal).toHaveAttribute('aria-busy', 'true');
  await expect(reveal).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
  await expect(reveal.getByText("variant: 'voronoi'")).toBeVisible();
  expect(errors).toEqual([]);
});

test('nothing scrolls sideways on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/?e2e');
  await expect(page.getByTestId('hero-reveal')).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  const dock = page.getByRole('toolbar', { name: 'Demo controls' });
  await dock.scrollIntoViewIfNeeded();
  // Every dock control fits without scrolling the toolbar.
  expect(await dock.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
  await expect(page.getByRole('button', { name: 'Replay all', exact: true })).toBeInViewport();
});

test('a card waits until it is scrolled into view before it loads', async ({ page }) => {
  await page.goto('/?e2e');
  const card = page.getByTestId('card-snow');
  // Well past the e2e latency: an eager card would have loaded by now.
  await page.waitForTimeout(1500);
  await expect(card).toHaveAttribute('data-loading', 'true');
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute('data-loading', 'false', { timeout: 15_000 });
  await expect(page.getByTestId('reveal-snow')).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
});

/** How long one replay keeps the card busy, measured in the page from aria-busy on to off. */
async function replayBusyMs(page: Page, id: string): Promise<number> {
  const card = page.getByTestId(`card-${id}`);
  const reveal = page.getByTestId(`reveal-${id}`);
  await card.scrollIntoViewIfNeeded();
  await expect(reveal).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
  await reveal.evaluate((el) => {
    const w = window as unknown as { __busy: { on?: number; off?: number } };
    w.__busy = {};
    new MutationObserver(() => {
      if (el.getAttribute('aria-busy') === 'true') w.__busy.on ??= performance.now();
      else if (w.__busy.on !== undefined) w.__busy.off ??= performance.now();
    }).observe(el, { attributes: true, attributeFilter: ['aria-busy'] });
  });
  await card.getByRole('button', { name: /^Replay/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __busy: { off?: number } }).__busy.off), { timeout: 15_000 }).toBeDefined();
  return page.evaluate(() => {
    const b = (window as unknown as { __busy: { on: number; off: number } }).__busy;
    return b.off - b.on;
  });
}

test('a fast load fades in instead of playing the effect', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?e2e');
  const slow = await replayBusyMs(page, 'halftone');
  await page.goto('/?e2e&latency=60');
  const fast = await replayBusyMs(page, 'halftone');
  // A 600 ms request plus the effect's reveal, against a 60 ms request plus a 150 ms fade.
  expect(slow).toBeGreaterThan(900);
  expect(fast).toBeLessThan(450);
  expect(errors).toEqual([]);
});
