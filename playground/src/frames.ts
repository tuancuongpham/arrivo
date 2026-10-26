import { createStage, ensureStyles, type Effect, type Stage } from '@brottin/arrivo/core';
import * as fx from '@brottin/arrivo/effects';

/**
 * Filmstrip of every effect at fixed moments (loading, then reveal progress), drawn with a
 * fake clock. `?dark` renders on a dark surface; `?only=name` limits to one effect.
 */

const params = new URLSearchParams(location.search);
const dark = params.has('dark');
const only = params.get('only');
const W = 260;
const H = 168;
const MOMENTS = [0.15, 0.4, 0.65, 0.9];

const surface = dark ? '#222220' : '#ffffff';
const ink = dark ? '#f1efe8' : '#1f1e1c';

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
  x.arc(r.width * 0.72, r.height * 0.38, r.height * 0.18, 0, 7);
  x.fill();
  x.fillStyle = '#5DCAA5';
  x.fillRect(0, r.height * 0.62, r.width, r.height * 0.38);
  x.fillStyle = '#1D9E75';
  x.fillRect(0, r.height * 0.8, r.width, r.height * 0.2);
  x.fillStyle = '#2C2C2A';
  x.beginPath();
  x.arc(r.width * 0.3, r.height * 0.55, r.height * 0.16, 0, 7);
  x.fill();
}

function build(): { root: HTMLElement; canvas: HTMLCanvasElement } {
  const host = document.getElementById('stage-host') as HTMLElement;
  host.textContent = '';
  const root = document.createElement('div');
  root.className = 'arrivo';
  root.style.cssText = `width:${W}px;height:${H}px;background:${surface};color:${ink};font:13px/1.45 system-ui,sans-serif;padding:10px 12px;box-sizing:border-box;overflow:hidden`;
  const img = document.createElement('canvas');
  img.style.cssText = 'display:block;width:100%;height:78px;border-radius:8px';
  const title = document.createElement('div');
  title.style.cssText = 'font-weight:600;font-size:16px;margin:8px 0 2px;display:flex;justify-content:space-between';
  title.innerHTML = '<span>Bản in Đồi gió</span><span style="font-family:ui-monospace,monospace">12.480</span>';
  const body = document.createElement('div');
  body.textContent = 'Hé lộ đúng chỗ, không nhảy layout.';
  const canvas = document.createElement('canvas');
  canvas.className = 'arrivo-ov';
  root.append(img, title, body, canvas);
  host.append(root);
  paint(img);
  return { root, canvas };
}

function snapshot(stage: Stage, showContent: boolean, label: string): HTMLElement {
  const c = document.createElement('canvas');
  c.className = 'snap';
  c.width = stage.canvas.width;
  c.height = stage.canvas.height;
  c.style.width = `${W}px`;
  c.style.height = `${H}px`;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  x.fillStyle = surface;
  x.fillRect(0, 0, c.width, c.height);
  if (showContent) x.drawImage(stage.raster(true), 0, 0);
  x.drawImage(stage.canvas, 0, 0);
  const fig = document.createElement('figure');
  const cap = document.createElement('figcaption');
  cap.textContent = label;
  fig.append(c, cap);
  return fig;
}

async function run(): Promise<void> {
  ensureStyles();
  if (dark) document.body.classList.add('dark');
  const out = document.getElementById('out') as HTMLElement;
  const effects = Object.entries(fx).filter((e): e is [string, Effect<any, any>] => typeof e[1] === 'object' && e[1] !== null && 'idle' in e[1]);
  for (const [name, effect] of effects) {
    if (only && only !== name) continue;
    const row = document.createElement('div');
    row.className = 'row';
    const label = document.createElement('div');
    label.className = 'name';
    label.textContent = name;
    row.append(label);
    const { root, canvas } = build();
    const stage = createStage({ root, canvas, seed: 3 });
    const idle = effect.idle(stage, {});
    let t = 0;
    for (; t < 1600; t += 16.7) {
      stage.clear();
      idle.frame(t);
    }
    row.append(snapshot(stage, false, 'loading'));
    const handoff = idle.handoff?.();
    idle.dispose?.();
    const stage2 = createStage({ root, canvas, seed: 3 });
    const reveal = effect.reveal(stage2, {}, handoff);
    let next = 0;
    for (let i = 0; i <= 60 && next < MOMENTS.length; i++) {
      const p = i / 60;
      t += 16.7;
      stage2.clear();
      reveal.frame(p, t);
      if (p >= MOMENTS[next]) {
        row.append(snapshot(stage2, effect.show === 'start', `p = ${MOMENTS[next]}`));
        next++;
      }
    }
    reveal.dispose?.();
    out.append(row);
    await new Promise((r) => setTimeout(r, 0));
  }
  document.body.dataset.done = '1';
}

void run();
