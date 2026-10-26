import { clamp, easeOut, fillRoundRect } from '../core/geom';
import { rgba } from '../core/theme';
import { buildThreshold, ThresholdPainter } from '../core/threshold';
import { defineEffect, type Effect, type Stage } from '../core/types';
import { drawGhosts, readingOrder } from './util';

export interface FuseOptions {
  /** Loading progress 0–1 (or a getter). Without it the spark eases towards the end and waits there. */
  progress?: number | (() => number);
  /** `'tet'`: red cord, gold sparks and drifting apricot blossoms for Lunar New Year. */
  theme: 'default' | 'tet';
}

const DEFAULTS: FuseOptions = { theme: 'default' };

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  colour: string;
}

interface Petal {
  x: number;
  y: number;
  vy: number;
  spin: number;
  a: number;
  r: number;
}

/** The cord: one horizontal run along the bottom of each target; the spark hops between runs. */
interface Path {
  segs: { x0: number; x1: number; y: number; at: number }[];
  length: number;
}

export interface FuseState {
  at: number;
  sparks: Spark[];
  petals: Petal[];
}

/** One cord along the bottom of every target, in reading order. */
function cord(stage: Stage): Path {
  let at = 0;
  const segs = readingOrder(stage.targets).map((t) => {
    const seg = { x0: t.x, x1: t.x + t.w, y: t.y + t.h - 1, at };
    at += t.w;
    return seg;
  });
  return { segs, length: at || 1 };
}

function pointAt(path: Path, d: number): { x: number; y: number } {
  const { segs } = path;
  if (!segs.length) return { x: 0, y: 0 };
  let s = segs[0];
  for (const seg of segs) if (seg.at <= d) s = seg;
  return { x: Math.min(s.x1, s.x0 + Math.max(0, d - s.at)), y: s.y };
}

function strokePath(ctx: CanvasRenderingContext2D, path: Path, from: number, to: number): void {
  if (to <= from) return;
  ctx.beginPath();
  for (const s of path.segs) {
    const a = Math.max(from, s.at);
    const b = Math.min(to, s.at + (s.x1 - s.x0));
    if (b <= a) continue;
    ctx.moveTo(s.x0 + (a - s.at), s.y);
    ctx.lineTo(s.x0 + (b - s.at), s.y);
  }
  ctx.stroke();
}

function palette(stage: Stage, o: FuseOptions) {
  return o.theme === 'tet'
    ? { cord: '#E24B4A', ash: 'rgba(121,31,31,.45)', spark: ['#FAC775', '#EF9F27', '#F09595'], burst: ['#E24B4A', '#FAC775', '#EF9F27', '#F7C1C1'] }
    : {
        cord: rgba(stage.theme.muted, 0.8),
        ash: rgba(stage.theme.muted, 0.3),
        spark: ['#FAC775', '#EF9F27', '#F0997B'],
        burst: [rgba(stage.theme.accent), '#FAC775', '#ED93B1', '#5DCAA5'],
      };
}

function stepSparks(stage: Stage, sparks: Spark[], dt: number): void {
  const { ctx } = stage;
  ctx.lineCap = 'round';
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life -= dt;
    if (s.life <= 0) {
      sparks.splice(i, 1);
      continue;
    }
    const k = dt / 16.7;
    const px = s.x;
    const py = s.y;
    s.vx *= 0.985 ** k;
    s.vy = s.vy * 0.985 ** k + 0.05 * k;
    s.x += s.vx * k;
    s.y += s.vy * k;
    ctx.globalAlpha = clamp(s.life / s.max);
    ctx.strokeStyle = s.colour;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawPetals(stage: Stage, petals: Petal[], dt: number, spawn: boolean): void {
  const { ctx, box } = stage;
  if (spawn && petals.length < 14 && stage.random() < dt / 260) {
    petals.push({ x: box.x + stage.random() * box.w, y: box.y - 6, vy: 0.25 + stage.random() * 0.35, spin: (stage.random() - 0.5) * 0.04, a: stage.random() * 6, r: 2 + stage.random() * 1.5 });
  }
  const k = dt / 16.7;
  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i];
    p.y += p.vy * k;
    p.x += Math.sin(p.y * 0.05 + p.a) * 0.3 * k;
    p.a += p.spin * k;
    if (p.y > box.y + box.h + 8) {
      petals.splice(i, 1);
      continue;
    }
    ctx.fillStyle = '#FAC775';
    for (let j = 0; j < 5; j++) {
      const a = p.a + (j * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(a) * p.r, p.y + Math.sin(a) * p.r, p.r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#BA7517';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function emit(stage: Stage, sparks: Spark[], at: { x: number; y: number }, colours: string[], n: number): void {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (stage.random() - 0.5) * 2.4;
    const v = 0.6 + stage.random() * 1.2;
    const max = 260 + stage.random() * 320;
    sparks.push({ x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, colour: colours[Math.floor(stage.random() * colours.length)] });
  }
}

/** A fuse burns along the skeleton like a progress bar; when the data lands, a firework lights the content up. */
export const fuse: Effect<FuseOptions, FuseState> = defineEffect({
  name: 'fuse',
  show: 'start',
  duration: 1800,
  minIdle: 700,
  css: '.arrivo[data-arrivo-effect="fuse"] .arrivo-sk-line{background:linear-gradient(transparent calc(100% - 2px),color-mix(in srgb,currentColor 35%,transparent) 0)}',

  idle(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const path = cord(stage);
    const colours = palette(stage, o);
    const state: FuseState = { at: 0, sparks: [], petals: [] };
    const { ctx } = stage;
    let last = -1;
    return {
      frame(t) {
        const dt = last < 0 ? 16.7 : Math.min(64, t - last);
        last = t;
        const given = typeof o.progress === 'function' ? o.progress() : o.progress;
        const progress = given === undefined ? 0.92 * (1 - Math.exp(-t / 2400)) : clamp(given) * 0.98;
        state.at = progress * path.length;
        drawGhosts(stage, 0.13);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = colours.ash;
        ctx.setLineDash([]);
        strokePath(ctx, path, 0, state.at);
        ctx.strokeStyle = colours.cord;
        ctx.setLineDash([4, 3]);
        strokePath(ctx, path, state.at, path.length);
        ctx.setLineDash([]);
        const head = pointAt(path, state.at);
        emit(stage, state.sparks, head, colours.spark, stage.random() < 0.6 ? 1 : 2);
        stepSparks(stage, state.sparks, dt);
        ctx.fillStyle = colours.spark[0];
        ctx.beginPath();
        ctx.arc(head.x, head.y, 2.4 + Math.sin(t / 40) * 0.6, 0, Math.PI * 2);
        ctx.fill();
        if (o.theme === 'tet') drawPetals(stage, state.petals, dt, true);
      },
      handoff: () => state,
    };
  },

  reveal(stage, options, from) {
    const o = { ...DEFAULTS, ...options };
    const path = cord(stage);
    const colours = palette(stage, o);
    const sparks = from?.sparks ?? [];
    const petals = from?.petals ?? [];
    const startAt = Math.min(from?.at ?? 0, path.length);
    const centre = stage.origin;
    const grid = buildThreshold({ kind: 'ripple', width: stage.width, height: stage.height, origin: centre, fbm: stage.fbm, random: stage.random });
    const painter = new ThresholdPainter(stage, grid);
    const surface = rgba(stage.theme.surface);
    const ghost = rgba(stage.theme.muted, 0.13);
    const reach = Math.max(stage.box.w, stage.box.h);
    const { ctx } = stage;
    let burst = false;
    let lastT = -1;
    return {
      frame(p, t) {
        const dt = lastT < 0 ? 16.7 : Math.min(64, t - lastT);
        lastT = t;
        const run = easeOut(clamp(p / 0.25));
        const at = startAt + (path.length - startAt) * run;
        const cover = (lx: CanvasRenderingContext2D): void => {
          lx.fillStyle = surface;
          lx.fillRect(0, 0, stage.width, stage.height);
          lx.fillStyle = ghost;
          for (const g of stage.targets) fillRoundRect(lx, g.x, g.y, g.w, g.h, Math.max(3, Math.min(g.radius, 10)));
        };
        if (p < 0.35) {
          ctx.save();
          ctx.clip(stage.clip);
          cover(ctx);
          ctx.restore();
        } else painter.draw(clamp((p - 0.35) / 0.6), cover);
        if (p < 0.3) {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = colours.cord;
          ctx.setLineDash([4, 3]);
          strokePath(ctx, path, at, path.length);
          ctx.setLineDash([]);
          const head = pointAt(path, at);
          emit(stage, sparks, head, colours.spark, 3);
          if (p >= 0.25) {
            ctx.strokeStyle = colours.spark[0];
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(head.x, head.y);
            const k = clamp((p - 0.25) / 0.05);
            ctx.lineTo(head.x + (centre.x - head.x) * k, head.y + (centre.y - head.y) * k);
            ctx.stroke();
          }
        } else if (!burst) {
          burst = true;
          for (let i = 0; i < 140; i++) {
            const a = stage.random() * Math.PI * 2;
            const v = (1.5 + stage.random() * 3.5) * Math.max(0.6, reach / 320);
            const max = 600 + stage.random() * 700;
            sparks.push({ x: centre.x, y: centre.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, colour: colours.burst[i % colours.burst.length] });
          }
        }
        stepSparks(stage, sparks, dt);
        if (o.theme === 'tet') drawPetals(stage, petals, dt, p < 0.6);
      },
    };
  },
});
