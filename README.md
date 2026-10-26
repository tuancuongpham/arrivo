# Arrivo

Loading effects for React that reveal your real content in place, instead of a pulsing grey skeleton.

**[Live demo](https://tuancuongpham.github.io/arrivo/)**: all thirteen effects on realistic cards, each one playing as you scroll to it.

Published on npm as [`@brottin/arrivo`](https://www.npmjs.com/package/@brottin/arrivo).

While `loading` is true, the content is hidden and an effect plays exactly where it will land. When `loading` turns false, the new content is revealed in its final position: no spinner, no layout jump. Thirteen effects ship today, from a split-flap departure board to a CRT finding its channel.

*Arrivo* is Italian for "arrival", and what you call out when you are on your way.

## Principles

- **Content stays in the DOM.** Nothing is cloned or moved. Effects draw on one canvas overlay (`pointer-events: none`, `aria-hidden`), then hand back to the real elements.
- **No layout shift.** Content is hidden with `visibility`, so it keeps its space throughout.
- **Accessible.** Screen readers get the real text, the wrapper carries `aria-busy` while loading, and `prefers-reduced-motion` turns every reveal into a 150 ms fade.
- **Cheap.** One shared `requestAnimationFrame` loop for the whole page. Off-screen reveals pause, a watchdog falls back to fades on struggling devices, and a reveal that gets no frames at all (an occluded window, a frozen webview) shows its content after 2 s instead of staying hidden.
- **Zero runtime dependencies.** React ≥ 17 is a peer dependency, and a framework-agnostic core is available.

## Install

```sh
npm i @brottin/arrivo
```

## Quick start

```tsx
import { Reveal, Skeleton } from '@brottin/arrivo';
import { ink, flap } from '@brottin/arrivo/effects';

// Re-fetching: the effect plays over the previous layout, then reveals the new data.
<Reveal effect={ink} options={{ variant: 'radar' }} loading={isLoading}>
  <ProductCard data={data} />
</Reveal>

// First load: show a skeleton until there is something to reveal.
<Reveal effect={flap} loading={!stats} skeleton={<Skeleton lines={2} widths={['40%', '70%']} />}>
  {stats && <Kpi value={stats.users} />}
</Reveal>
```

Effects are plain objects imported from `@brottin/arrivo/effects`, so bundlers only include the ones you use.

## Effects

| Effect | Loading | Reveal | Good for |
|---|---|---|---|
| `flap` | Split-flap cells flutter | Each cell flips in order until it lands on its character | KPIs, prices, timetables |
| `redact` | Black bars sized to every real word, a rubber stamp | Bars lift in reading order | Articles, documents, balances |
| `mosaic` | Shimmering pixel blocks | Quadtree refinement: detailed regions sharpen first | Product photos, galleries |
| `halftone` | Breathing dot screen | Four rotated CMYK screens grow in, then hand over to the image | Editorial, blogs, portfolios |
| `crt` | Static, scanlines, on-screen display | Tearing, rolling picture, RGB fringes converge, flash | Video, media, games |
| `ink` | Watercolour wash | Threshold-map reveal (see variants below) | Anything |
| `swarm` | Dust drifting on a flow field | Every mote flies to a point of ink in the content | Hero sections, profiles |
| `darkroom` | Milky undeveloped film | The emulsion clears while contrast and colour develop | Photos, memories |
| `tetris` | A tiny game plays itself | The well fills up, then clears line by line | Games, leaderboards |
| `fuse` | A fuse burns along the content like a progress bar | A firework bursts and lights the content up; `theme: 'tet'` for Lunar New Year | Milestones, confirmations |
| `equalizer` | Bars bounce like an audio visualiser | Bars settle into the shape of the text | Music, podcasts |
| `thermal` | Heat blobs and a temperature readout | The real picture cools into place | Monitoring, infrastructure |
| `snow` | Snow falls and settles on the content | The frost melts away from the origin | Weather, seasonal pages |

`ink` is one engine with eight looks. Each cell gets a threshold, and it is uncovered once progress passes that threshold. Swap the map and you get a different reveal:

| `variant` | Reveal |
|---|---|
| `ink` (default) | Bleeds outward with a wet, noisy edge |
| `radar` | Sweeps clockwise from twelve o'clock |
| `ripple` | Rings outward |
| `hilbert` | Crawls along a space-filling curve |
| `bayer` | Ordered-dither dissolve |
| `voronoi` | Pops in glass shards |
| `receipt` | Prints line by line |
| `dissolve` | Random scatter |

### Effect options

| Effect | Options |
|---|---|
| `flap` | `charset`, `flips` (max flips per cell), `flipMs`, `sound` (soft clicks via WebAudio) |
| `redact` | `stamp` (text or `false`), `shimmer` |
| `mosaic` | `block` (starting block size), `maxPixels` |
| `halftone` | `spacing`, `maxDots` |
| `crt` | `channel`, `message` (OSD text or `false`) |
| `ink` | `variant`, `cell` |
| `swarm` | `maxParticles`, `size` |
| `darkroom` | `grain`, `tint` |
| `tetris` | `cell`, `palette`, `dropMs` |
| `fuse` | `progress` (0–1 or a getter), `theme: 'default' \| 'tet'` |
| `equalizer` | `bar`, `gap`, `tone: 'muted' \| 'accent'` |
| `thermal` | `palette: 'iron' \| 'rainbow'`, `readout` |
| `snow` | `density` |

## `<Reveal>`

| Prop | Default | |
|---|---|---|
| `effect` | — | Effect object from `@brottin/arrivo/effects` |
| `options` | — | Effect-specific options |
| `loading` | `false` | Hide the content and play the loading state; flipping to `false` reveals |
| `skeleton` | — | Rendered instead of `children` while `loading` |
| `revealOnMount` | `true` | Reveal once on mount when not loading |
| `revealOnHydrate` | `false` | Also animate server-rendered content during hydration |
| `origin` | `'center'` | `'center'`, `'top-left'`, `'pointer'` or `{ x, y }` in viewport pixels |
| `duration` | `'fast'` | Milliseconds, `'fast'` or `'cinematic'` (1.8× slower) |
| `speed` | `1` | Playback multiplier for loading and reveal |
| `lazy` | `true` | Wait until on screen before revealing |
| `selector` | — | Animate only matching descendants |
| `minIdle` | per effect | Minimum loading time before a reveal |
| `reducedMotion` | `'auto'` | `true`/`false` to override `prefers-reduced-motion` |
| `seed` | `1` | Seed for every random choice the effect makes |
| `onRevealComplete` | — | Called when a reveal finishes |
| `as` | `'div'` | Wrapper element |

Other props are passed to the wrapper. A ref exposes `replay({ origin })`, `hide()` and `element`. The wrapper dispatches a bubbling `arrivo` event with `detail: { active, state }` when it starts and stops.

`useReveal(options)` is the same thing as a hook, for custom wrappers: `const { ref, state, replay, hide } = useReveal({ effect: ink, loading })`.

### Marking content

| Attribute | Effect |
|---|---|
| `data-arrivo="static"` | Chrome that stays visible while loading (labels, buttons) |
| `data-arrivo="frame"` | Keeps an element's own box visible (a chip's background) while its children hide and animate. Put the text in a child element |
| `data-arrivo="block"` | Treat an element without text (a progress bar) as a target |
| `data-arrivo="media"` | Treat an element as an image-like target |
| `data-arrivo="skip"` | Ignore a subtree |

Text runs and `img`, `canvas`, `video` and `svg` elements are found automatically. Cross-origin images without CORS headers can't be read back, so they reveal as neutral blocks.

### `<Skeleton>`

`<Skeleton lines={3} widths={['90%', '70%']} />` for text, and `<Skeleton height={150} />` or `<Skeleton circle width={48} />` for blocks. Each bar is a reveal target, and the active effect styles it with plain CSS, so it looks right before JavaScript runs.

## Theming

Effects take their colours from the page: ink follows `color`, and the surface is the nearest opaque background. Override them with custom properties on the wrapper or any ancestor:

```css
.card {
  --arrivo-ink: #1f1e1c;
  --arrivo-surface: #ffffff;
  --arrivo-muted: #a8a6a0;
  --arrivo-accent: #185fa5;
  --arrivo-danger: #e24b4a;
  --arrivo-cell: rgba(0, 0, 0, 0.07);
  --arrivo-font-mono: 'JetBrains Mono', monospace;
}
```

Colours are re-read on every run, so light/dark switches just work. Any CSS colour is accepted, including `oklch()`.

## Without React

```ts
import { createReveal } from '@brottin/arrivo/core';
import { thermal } from '@brottin/arrivo/effects';

const reveal = createReveal(document.querySelector('#stats')!, { effect: thermal, loading: true });
const data = await fetchStats();
render(data);
reveal.setLoading(false);
```

## SSR

Styles are injected on first use. To avoid a flash before hydration, include them in your HTML:

```ts
import { ARRIVO_CSS } from '@brottin/arrivo';
// <style>{ARRIVO_CSS}</style>
```

The React entry is marked `'use client'` for the Next.js App Router. Server-rendered content is not animated on hydration unless you set `revealOnHydrate`.

## Writing an effect

An effect is two functions. `idle()` draws the loading state, and `reveal()` draws progress `p` from 0 to 1. Both receive a `Stage`: the canvas context (already scaled for the device pixel ratio), the measured targets, their union `box`, a `clip` path, theme colours, seeded `random`/`noise`/`fbm`, and `words()`, `chars()`, `raster()` and `pixels()` to read the content.

```ts
import { defineEffect, rgba } from '@brottin/arrivo/core';

export const wipe = defineEffect<{ angle: number }>({
  name: 'wipe',
  show: 'start', // reveal the DOM now and uncover it; 'end' draws the content, then fades to the DOM
  duration: 800,
  idle(stage) {
    return {
      frame(t) {
        stage.ctx.fillStyle = rgba(stage.theme.muted, 0.3 + 0.2 * Math.sin(t / 300));
        stage.ctx.fill(stage.clip);
      },
    };
  },
  reveal(stage) {
    return {
      frame(p) {
        stage.ctx.save();
        stage.ctx.clip(stage.clip);
        stage.ctx.fillStyle = rgba(stage.theme.surface);
        stage.ctx.fillRect(stage.width * p, 0, stage.width * (1 - p), stage.height);
        stage.ctx.restore();
      },
    };
  },
});
```

`idle()` can return `handoff()` to pass state to `reveal()`, which is how the swarm keeps its particles. `buildThreshold` and `ThresholdPainter` are exported if you want a new threshold-map reveal.

## Performance

`npm run bench` runs every effect at 320×180, 640×360 and 1280×720 in headless Edge and times each frame on the CPU. At 640×360, every effect averages under 3 ms per frame, both loading and revealing. The bench fails above 4 ms. Large areas are handled by adaptive caps: coarser threshold cells, fewer halftone dots, at most 1800 particles, and device pixel ratio capped at 2 and lowered for canvases over 1.5 MP.

Sizes, minified and gzipped:
- The core is 8.5 KB.
- The React entry is 9.5 KB, core included.
- Each effect adds 0.7 KB (redact) to 3.4 KB (fuse).

## Development

```sh
npm run dev         # playground at http://localhost:5173
npm run typecheck
npm test            # unit tests (Vitest)
npm run test:e2e    # end-to-end tests (Playwright; uses the installed Edge, PW_CHANNEL=chrome to switch)
npm run bench       # frame-time budget check
npm run build       # dist/: ESM and CJS with .d.ts and .d.cts types for @brottin/arrivo, @brottin/arrivo/core and @brottin/arrivo/effects
npm run build:playground   # static demo site in playground/dist (relative base, so it works under any path)
```

The playground has three pages:
- `/`: the demo site. A hero that tours every effect, a gallery of all thirteen on realistic cards, the eight threshold maps, a sandbox and install notes. Photographs come from Unsplash through [Lorem Picsum](https://picsum.photos), which sends CORS headers so effects can read the pixels. Add `?e2e` for fixed data, local canvas art instead of photos and short latencies, which is what the end-to-end tests use.
- `/frames.html`: a filmstrip of every effect at fixed moments, useful for visual review. Add `?dark` for a dark surface or `?only=crt` for a single effect.
- `/bench.html`: the frame-time table.

Every push to `main` publishes the demo to [GitHub Pages](https://tuancuongpham.github.io/arrivo/) through `.github/workflows/pages.yml`.

## License

MIT
