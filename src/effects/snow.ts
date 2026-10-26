import { clamp } from '../core/geom';
import { rgba } from '../core/theme';
import { buildThreshold, ThresholdPainter } from '../core/threshold';
import { defineEffect, type Effect, type Stage, type Target } from '../core/types';
import { makeGrain } from './util';

export interface SnowOptions {
  /** Flakes per 10 000 px² of content. */
  density: number;
}

const DEFAULTS: SnowOptions = { density: 6 };
const COLUMN = 2;

interface Flake {
  x: number;
  y: number;
  vy: number;
  phase: number;
  r: number;
}

interface Cap {
  t: Target;
  /** Snow height per 2px column, in CSS pixels. */
  h: Float32Array;
  max: number;
}

interface Drop {
  x: number;
  y: number;
  vy: number;
  life: number;
}

export interface SnowState {
  flakes: Flake[];
  caps: Cap[];
}

function colours(stage: Stage) {
  return stage.theme.dark
    ? { cover: '#D9E1EA', cap: '#F1EFE8', edge: '#FFFFFF', flake: 'rgba(255,255,255,.9)', drop: 'rgba(181,212,244,.8)' }
    : { cover: '#DCE8F5', cap: '#FFFFFF', edge: '#85B7EB', flake: 'rgba(133,183,235,.9)', drop: 'rgba(55,138,221,.55)' };
}

function makeCaps(stage: Stage): Cap[] {
  return stage.targets
    .filter((t) => t.w >= 6)
    .map((t) => ({ t, h: new Float32Array(Math.max(1, Math.ceil(t.w / COLUMN))), max: Math.min(10, Math.max(3, t.h * 0.6)) }));
}

function spawn(stage: Stage, top = false): Flake {
  const { box } = stage;
  return {
    x: box.x + stage.random() * box.w,
    y: top ? box.y - 6 : box.y + stage.random() * box.h,
    vy: 0.35 + stage.random() * 0.55,
    phase: stage.random() * Math.PI * 2,
    r: 1 + stage.random() * 0.9,
  };
}

function drawCaps(stage: Stage, caps: Cap[], c: ReturnType<typeof colours>, scale = 1): void {
  const { ctx } = stage;
  for (const cap of caps) {
    const { t, h } = cap;
    if (Math.max(...h) * scale < 0.4) continue;
    const top = new Path2D();
    top.moveTo(t.x, t.y + 1 - h[0] * scale);
    for (let i = 0; i < h.length; i++) top.lineTo(Math.min(t.x + t.w, t.x + i * COLUMN + COLUMN / 2), t.y + 1 - h[i] * scale);
    const body = new Path2D(top);
    body.lineTo(t.x + t.w, t.y + 1);
    body.lineTo(t.x, t.y + 1);
    body.closePath();
    ctx.fillStyle = c.cap;
    ctx.fill(body);
    // Outline only the snow's surface, never the base it rests on.
    ctx.strokeStyle = c.edge;
    ctx.lineWidth = 1;
    ctx.stroke(top);
  }
}

/** Snow falls and settles on the content while it loads; when it lands, the frost melts away from the origin. */
export const snow: Effect<SnowOptions, SnowState> = defineEffect({
  name: 'snow',
  show: 'start',
  duration: 1700,
  minIdle: 800,
  css: '.arrivo[data-arrivo-effect="snow"] .arrivo-sk-line,.arrivo[data-arrivo-effect="snow"] .arrivo-sk-block{background:color-mix(in srgb,#B5D4F4 45%,transparent);border-top:2px solid #EEF4FB}',

  idle(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const c = colours(stage);
    const caps = makeCaps(stage);
    const count = Math.round(clamp((stage.box.w * stage.box.h * o.density) / 10_000, 12, 220));
    const flakes = Array.from({ length: count }, () => spawn(stage));
    const grain = makeGrain(stage, 170, 255);
    const { ctx, box } = stage;
    let last = -1;
    return {
      frame(t) {
        const k = last < 0 ? 1 : Math.min(4, (t - last) / 16.7);
        last = t;
        ctx.save();
        ctx.clip(stage.clip);
        ctx.fillStyle = c.cover;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(0, 0, stage.width, stage.height);
        ctx.restore();
        ctx.save();
        ctx.clip(stage.clip);
        grain(ctx, t, 0.18, 'multiply');
        ctx.restore();
        for (const f of flakes) {
          f.y += f.vy * k;
          f.x += Math.sin(t * 0.002 + f.phase) * 0.3 * k;
          for (const cap of caps) {
            const { t: r } = cap;
            if (f.x < r.x || f.x >= r.x + r.w) continue;
            const i = Math.min(cap.h.length - 1, Math.floor((f.x - r.x) / COLUMN));
            if (f.y >= r.y - cap.h[i] && f.y <= r.y + 4) {
              const add = 0.5 + stage.random() * 0.5;
              cap.h[i] = Math.min(cap.max, cap.h[i] + add);
              if (i > 0) cap.h[i - 1] = Math.min(cap.max, cap.h[i - 1] + add * 0.5);
              if (i < cap.h.length - 1) cap.h[i + 1] = Math.min(cap.max, cap.h[i + 1] + add * 0.5);
              Object.assign(f, spawn(stage, true));
              break;
            }
          }
          if (f.y > box.y + box.h + 6) Object.assign(f, spawn(stage, true));
        }
        drawCaps(stage, caps, c);
        ctx.fillStyle = c.flake;
        for (const f of flakes) {
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      handoff: () => ({ flakes, caps }),
    };
  },

  reveal(stage, options, from) {
    const c = colours(stage);
    const fresh = makeCaps(stage);
    const caps = fresh.map((cap, i) => {
      const old = from?.caps[i];
      if (old && old.h.length === cap.h.length) cap.h.set(old.h);
      return cap;
    });
    const flakes = from?.flakes ?? [];
    const drops: Drop[] = [];
    const grid = buildThreshold({ kind: 'ink', width: stage.width, height: stage.height, origin: stage.origin, fbm: stage.fbm, random: stage.random, cell: 4 });
    const painter = new ThresholdPainter(stage, grid, { color: [133, 183, 235, 255], width: 0.04, alpha: 0.35, trail: 0, hard: false, softness: 0.08 });
    const grain = makeGrain(stage, 170, 255);
    const surface = rgba(stage.theme.surface);
    const { ctx, box } = stage;
    let last = -1;
    return {
      frame(p, t) {
        const k = last < 0 ? 1 : Math.min(4, (t - last) / 16.7);
        last = t;
        painter.draw(p, (lx) => {
          lx.fillStyle = surface;
          lx.fillRect(0, 0, stage.width, stage.height);
          lx.fillStyle = c.cover;
          lx.globalAlpha = 0.9;
          lx.fillRect(0, 0, stage.width, stage.height);
          lx.globalAlpha = 1;
          grain(lx, t, 0.18, 'multiply');
        });
        const melt = (1 - clamp(p * 1.25)) ** 1.5;
        drawCaps(stage, caps, c, melt);
        if (melt > 0.05 && stage.random() < 0.5 * k) {
          const cap = caps[Math.floor(stage.random() * caps.length)];
          if (cap) {
            const i = Math.floor(stage.random() * cap.h.length);
            if (cap.h[i] > 1) drops.push({ x: cap.t.x + i * COLUMN, y: cap.t.y + 1, vy: 0.5, life: 1 });
          }
        }
        ctx.fillStyle = c.drop;
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          d.vy += 0.12 * k;
          d.y += d.vy * k;
          d.life -= 0.02 * k;
          if (d.life <= 0 || d.y > box.y + box.h + 10) {
            drops.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = d.life;
          ctx.beginPath();
          ctx.arc(d.x, d.y, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = clamp(1 - p * 1.5);
        ctx.fillStyle = c.flake;
        for (const f of flakes) {
          f.y += f.vy * k;
          f.x += Math.sin(t * 0.002 + f.phase) * 0.3 * k;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
  },
});
