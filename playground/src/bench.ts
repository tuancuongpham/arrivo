import { createStage, ensureStyles, type Effect } from '@brottin/arrivo/core';
import * as fx from '@brottin/arrivo/effects';

/**
 * Drives each effect with a fake clock at three sizes and times every frame on the CPU.
 * `scripts/bench.mjs` reads `window.__bench` and checks the budget.
 */

interface Row {
  effect: string;
  size: string;
  idleInit: number;
  idleAvg: number;
  idleMax: number;
  revealInit: number;
  revealAvg: number;
  revealMax: number;
}

declare global {
  interface Window {
    __bench?: { done: boolean; results: Row[] };
  }
}

const SIZES: [number, number][] = [
  [320, 180],
  [640, 360],
  [1280, 720],
];
const FRAMES = 60;
const TEXT =
  'Spinner bắt người ta chờ. Màn hé lộ cho họ thấy thứ đang tới, ngay tại vị trí cuối cùng, không nhảy layout. Khi dữ liệu về, mắt người dùng đã biết nhìn vào đâu.';

const effects = Object.entries(fx).filter((e): e is [string, Effect<any, any>] => typeof e[1] === 'object' && e[1] !== null && 'idle' in e[1]);

function paint(c: HTMLCanvasElement): void {
  const r = c.getBoundingClientRect();
  c.width = Math.round(r.width * 2);
  c.height = Math.round(r.height * 2);
  const x = c.getContext('2d');
  if (!x) return;
  x.scale(2, 2);
  x.fillStyle = '#B5D4F4';
  x.fillRect(0, 0, r.width, r.height);
  x.fillStyle = '#FAC775';
  x.beginPath();
  x.arc(r.width * 0.7, r.height * 0.35, r.height * 0.15, 0, 7);
  x.fill();
  x.fillStyle = '#1D9E75';
  x.fillRect(0, r.height * 0.7, r.width, r.height * 0.3);
}

function build(w: number, h: number): { root: HTMLElement; canvas: HTMLCanvasElement } {
  const host = document.getElementById('stage-host') as HTMLElement;
  host.textContent = '';
  const root = document.createElement('div');
  root.className = 'arrivo';
  root.style.cssText = `width:${w}px;height:${h}px;background:#fff;color:#1f1e1c;font:14px/1.5 system-ui,sans-serif;padding:12px;box-sizing:border-box;overflow:hidden`;
  const img = document.createElement('canvas');
  img.style.cssText = `display:block;width:100%;height:${Math.round(h * 0.5)}px;border-radius:8px`;
  const title = document.createElement('div');
  title.style.cssText = 'font-weight:600;font-size:18px;margin:8px 0 4px';
  title.textContent = 'Loader nên hé lộ, đừng biến mất';
  const body = document.createElement('p');
  body.style.margin = '0';
  body.textContent = `${TEXT} ${TEXT} ${TEXT}`;
  const canvas = document.createElement('canvas');
  canvas.className = 'arrivo-ov';
  root.append(img, title, body, canvas);
  host.append(root);
  paint(img);
  return { root, canvas };
}

const avg = (a: number[]): number => a.reduce((s, v) => s + v, 0) / a.length;
const round = (v: number): number => Math.round(v * 100) / 100;

async function run(): Promise<void> {
  ensureStyles();
  const results: Row[] = [];
  for (const [name, effect] of effects) {
    for (const [w, h] of SIZES) {
      const { root, canvas } = build(w, h);
      const stage = createStage({ root, canvas, seed: 1 });
      let t0 = performance.now();
      const idle = effect.idle(stage, {});
      const idleInit = performance.now() - t0;
      const idleTimes: number[] = [];
      let t = 0;
      for (let i = 0; i < FRAMES; i++) {
        t += 16.7;
        const a = performance.now();
        stage.clear();
        idle.frame(t);
        idleTimes.push(performance.now() - a);
      }
      const handoff = idle.handoff?.();
      idle.dispose?.();
      const stage2 = createStage({ root, canvas, seed: 1 });
      t0 = performance.now();
      const reveal = effect.reveal(stage2, {}, handoff);
      const revealInit = performance.now() - t0;
      const revealTimes: number[] = [];
      for (let i = 0; i <= FRAMES; i++) {
        t += 16.7;
        const a = performance.now();
        stage2.clear();
        reveal.frame(i / FRAMES, t);
        revealTimes.push(performance.now() - a);
      }
      reveal.dispose?.();
      results.push({
        effect: name,
        size: `${w}×${h}`,
        idleInit: round(idleInit),
        idleAvg: round(avg(idleTimes)),
        idleMax: round(Math.max(...idleTimes)),
        revealInit: round(revealInit),
        revealAvg: round(avg(revealTimes)),
        revealMax: round(Math.max(...revealTimes)),
      });
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  window.__bench = { done: true, results };
  const head = '<tr><th>Hiệu ứng</th><th>Kích thước</th><th>Idle init</th><th>Idle avg</th><th>Idle max</th><th>Reveal init</th><th>Reveal avg</th><th>Reveal max</th></tr>';
  const cell = (v: number, budget = 4): string => `<td class="${v > budget ? 'over' : ''}">${v.toFixed(2)}</td>`;
  const rows = results
    .map((r) => `<tr><td>${r.effect}</td><td>${r.size}</td>${cell(r.idleInit, 50)}${cell(r.idleAvg)}${cell(r.idleMax, 16)}${cell(r.revealInit, 50)}${cell(r.revealAvg)}${cell(r.revealMax, 16)}</tr>`)
    .join('');
  (document.getElementById('out') as HTMLElement).innerHTML = `<table>${head}${rows}</table>`;
  (document.getElementById('status') as HTMLElement).textContent = 'Xong. Thời gian tính bằng ms CPU mỗi frame.';
}

void run();
