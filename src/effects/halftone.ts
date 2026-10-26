import { clamp, easeOut, roundRectPath } from '../core/geom';
import { rgba } from '../core/theme';
import { defineEffect, type Effect, type Rect, type Stage } from '../core/types';

export interface HalftoneOptions {
  /** Screen spacing for images, in CSS pixels; grows on large areas to keep dot counts sane. */
  spacing: number;
  /** Upper bound of dots per ink. */
  maxDots: number;
}

const DEFAULTS: HalftoneOptions = { spacing: 5.5, maxDots: 1800 };
const INKS = ['#00AEEF', '#EC008C', '#FFE600', '#231F20'];
const ANGLES = [15, 75, 0, 45];

interface Dot {
  x: number;
  y: number;
  v: number;
  d: number;
}

/** Points of a screen rotated by `angle` around the stage origin that fall inside `rects`. */
function screen(stage: Stage, rects: readonly Rect[], spacing: number, angle: number, value: (x: number, y: number) => number): Dot[] {
  const { origin } = stage;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const far = Math.max(1, Math.hypot(stage.width, stage.height) / 2);
  const dots: Dot[] = [];
  for (const r of rects) {
    let u0 = Infinity;
    let u1 = -Infinity;
    let v0 = Infinity;
    let v1 = -Infinity;
    for (const [cx, cy] of [
      [r.x, r.y],
      [r.x + r.w, r.y],
      [r.x, r.y + r.h],
      [r.x + r.w, r.y + r.h],
    ]) {
      const dx = cx - origin.x;
      const dy = cy - origin.y;
      const u = dx * ca + dy * sa;
      const v = -dx * sa + dy * ca;
      u0 = Math.min(u0, u);
      u1 = Math.max(u1, u);
      v0 = Math.min(v0, v);
      v1 = Math.max(v1, v);
    }
    for (let v = Math.floor(v0 / spacing) * spacing; v <= v1; v += spacing) {
      for (let u = Math.floor(u0 / spacing) * spacing; u <= u1; u += spacing) {
        const x = origin.x + u * ca - v * sa;
        const y = origin.y + u * sa + v * ca;
        if (x < r.x || y < r.y || x >= r.x + r.w || y >= r.y + r.h) continue;
        const val = value(x, y);
        if (val > 0.02) dots.push({ x, y, v: val, d: Math.hypot(x - origin.x, y - origin.y) / far });
      }
    }
  }
  return dots;
}

function drawDots(ctx: CanvasRenderingContext2D, dots: readonly Dot[], radius: (d: Dot) => number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const d of dots) {
    const r = radius(d);
    if (r > 0.15) {
      ctx.moveTo(d.x + r, d.y);
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
    }
  }
  ctx.fill();
}

const area = (rects: readonly Rect[]): number => rects.reduce((s, r) => s + r.w * r.h, 0);

/** Screen spacings that keep dot counts bounded however much content there is. */
function spacings(rects: readonly Rect[], text: readonly Rect[], o: HalftoneOptions) {
  return {
    media: Math.max(o.spacing, Math.sqrt(area(rects) / o.maxDots)),
    text: Math.max(2.4, Math.sqrt(area(text) / 5000)),
    skeleton: Math.max(4, Math.sqrt(area(text) / 2500)),
  };
}

const breathe = (d: Dot, t: number): number => 0.55 + 0.45 * Math.sin(t / 380 - (d.x + d.y) * 0.035);

/** Newspaper print: four rotated CMYK screens grow in from the origin, then hand over to the real image. */
export const halftone: Effect<HalftoneOptions> = defineEffect({
  name: 'halftone',
  show: 'end',
  duration: 1500,
  css: '.arrivo[data-arrivo-effect="halftone"] .arrivo-sk-line,.arrivo[data-arrivo-effect="halftone"] .arrivo-sk-block{background:radial-gradient(circle,color-mix(in srgb,currentColor 22%,transparent) 32%,transparent 36%) 0 0/5px 5px}',

  idle(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const media = stage.targets.filter((t) => t.kind !== 'text');
    const text = stage.targets.filter((t) => t.kind === 'text');
    const angle = Math.PI / 4;
    const sp = spacings(media, text, o);
    const dots = screen(stage, media, sp.media, angle, () => 1).concat(screen(stage, text, sp.skeleton, angle, () => 1));
    const { ctx, theme } = stage;
    return {
      frame(t) {
        ctx.save();
        ctx.clip(stage.clip);
        drawDots(ctx, dots, (d) => 1.7 * breathe(d, t), rgba(theme.muted));
        ctx.restore();
      },
    };
  },

  reveal(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const opaque = stage.pixels(true);
    const alpha = stage.pixels(false);
    const at = (px: typeof opaque, x: number, y: number): number =>
      (Math.min(px.height - 1, Math.floor(y * px.scale)) * px.width + Math.min(px.width - 1, Math.floor(x * px.scale))) * 4;
    const media = stage.targets.filter((t) => t.kind !== 'text');
    const text = stage.targets.filter((t) => t.kind === 'text');
    const sp = spacings(media, text, o);
    const spacing = sp.media;
    const cmyk = (x: number, y: number, k: number): number => {
      const i = at(opaque, x, y);
      const r = opaque.data[i] / 255;
      const g = opaque.data[i + 1] / 255;
      const b = opaque.data[i + 2] / 255;
      const K = 1 - Math.max(r, g, b);
      if (k === 3) return K;
      if (K > 0.999) return 0;
      return (1 - [r, g, b][k] - K) / (1 - K);
    };
    const inks = INKS.map((color, k) => ({
      color,
      dots: screen(stage, media, spacing, (ANGLES[k] * Math.PI) / 180, (x, y) => cmyk(x, y, k)),
    }));
    const textDots = screen(stage, text, sp.text, Math.PI / 4, (x, y) => alpha.data[at(alpha, x, y) + 3] / 255);
    const skeleton = screen(stage, media, spacing, Math.PI / 4, () => 1).concat(screen(stage, text, sp.skeleton, Math.PI / 4, () => 1));
    const full = stage.raster(true);
    const { ctx, theme } = stage;
    const maxR = spacing * 0.62;
    return {
      frame(p, t) {
        const paper = clamp(p / 0.2);
        const grow = (d: Dot): number => easeOut(clamp((p * 1.4 - d.d * 0.4) / 0.7));
        ctx.save();
        ctx.clip(stage.clip);
        if (paper < 1) {
          ctx.globalAlpha = 1 - paper;
          drawDots(ctx, skeleton, (d) => 1.7 * breathe(d, t), rgba(theme.muted));
        }
        ctx.globalAlpha = paper;
        ctx.fillStyle = '#fff';
        for (const m of media) {
          ctx.beginPath();
          roundRectPath(ctx, m.x, m.y, m.w, m.h, m.radius);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'multiply';
        for (const ink of inks) drawDots(ctx, ink.dots, (d) => maxR * Math.sqrt(d.v) * grow(d), ink.color);
        ctx.globalCompositeOperation = 'source-over';
        drawDots(ctx, textDots, (d) => sp.text * 0.6 * Math.sqrt(d.v) * grow(d), rgba(theme.ink));
        if (p > 0.78) {
          ctx.globalAlpha = easeOut((p - 0.78) / 0.22);
          ctx.drawImage(full, 0, 0, stage.width, stage.height);
        }
        ctx.restore();
      },
    };
  },
});
