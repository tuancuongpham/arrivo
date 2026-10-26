// Runs playground/bench.html in a real browser and checks the per-frame budget.
// Uses the installed Edge by default; set PW_CHANNEL=chrome or chromium to switch.
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const BUDGET_MS = 4;
const SIZE = '640×360';
const port = 5198;

const server = await createServer({
  configFile: 'playground/vite.config.ts',
  server: { port, strictPort: true },
  logLevel: 'warn',
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/bench.html`);
  await page.waitForFunction(() => window.__bench?.done, null, { timeout: 180_000 });
  const rows = await page.evaluate(() => window.__bench.results);
  console.table(rows);
  const over = rows.filter((r) => r.size === SIZE && (r.idleAvg > BUDGET_MS || r.revealAvg > BUDGET_MS));
  if (over.length) {
    console.error(`Over the ${BUDGET_MS} ms/frame budget at ${SIZE}: ${over.map((r) => r.effect).join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log(`Every effect averages under ${BUDGET_MS} ms/frame at ${SIZE}.`);
  }
} finally {
  await browser?.close();
  await server.close();
}
