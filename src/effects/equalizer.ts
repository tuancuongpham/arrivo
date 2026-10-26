import { clamp, easeInOut } from '../core/geom';
import { rgba } from '../core/theme';
import { defineEffect, type Stage, type Target } from '../core/types';

export interface EqualizerOptions {
  /** Bar width in CSS pixels. */
  bar: number;
  gap: number;
  /** Bar colour: the muted ink or the accent. */
  tone: 'muted' | 'accent';
}

const DEFAULTS: EqualizerOptions = { bar: 3, gap: 1, tone: 'muted' };
const LEVELS = 8;

interface Column {
  x: number;
  t: Target;
  /** Seed offset so neighbouring targets don't bounce in sync. */
  seed: number;
}

function columns(stage: Stage, o: EqualizerOptions): Column[] {
  const out: Column[] = [];
  stage.targets.forEach((t, ti) => {
    const n = Math.max(1, Math.floor((t.w + o.gap) / (o.bar + o.gap)));
    for (let i = 0; i < n; i++) out.push({ x: t.x + i * (o.bar + o.gap), t, seed: ti * 7.13 + i * 0.35 });
  });
  return out;
}

/** Quantised to eight steps, like the ▁▂▃▄▅▆▇█ block glyphs. */
const quantise = (v: number): number => Math.max(1, Math.round(clamp(v) * LEVELS)) / LEVELS;

const bounce = (stage: Stage, c: Column, t: number): number => quantise(0.12 + 0.88 * stage.noise(c.seed, t * 0.004) ** 1.4);

/** How much ink each column of the final content holds: the height its bar settles at. */
function inkLevel(stage: Stage, c: Column, o: EqualizerOptions): number {
  const px = stage.pixels(c.t.kind === 'text' ? false : true);
  const s = px.scale;
  const x0 = Math.max(0, Math.floor(c.x * s));
  const x1 = Math.min(px.width, Math.max(x0 + 1, Math.ceil((c.x + o.bar) * s)));
  const y0 = Math.max(0, Math.floor(c.t.y * s));
  const y1 = Math.min(px.height, Math.ceil((c.t.y + c.t.h) * s));
  if (y1 <= y0) return 0;
  if (c.t.kind === 'text') {
    let rows = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (px.data[(y * px.width + x) * 4 + 3] > 80) {
          rows++;
          break;
        }
      }
    }
    return rows / (y1 - y0);
  }
  let sum = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * px.width + x) * 4;
      sum += (0.2126 * px.data[i] + 0.7152 * px.data[i + 1] + 0.0722 * px.data[i + 2]) / 255;
      n++;
    }
  }
  return 0.35 + 0.65 * (1 - sum / Math.max(1, n));
}

function drawBars(stage: Stage, cols: Column[], level: (c: Column, i: number) => number, o: EqualizerOptions, colour: string): void {
  const { ctx } = stage;
  ctx.fillStyle = colour;
  cols.forEach((c, i) => {
    const h = c.t.h * level(c, i);
    ctx.fillRect(c.x, c.t.y + c.t.h - h, o.bar, h);
  });
}

/** Columns bounce like an audio visualiser, then settle to the shape of the real text and hand over. */
export const equalizer = defineEffect<EqualizerOptions>({
  name: 'equalizer',
  show: 'end',
  duration: 1300,
  css: '.arrivo[data-arrivo-effect="equalizer"] .arrivo-sk-line,.arrivo[data-arrivo-effect="equalizer"] .arrivo-sk-block{background:repeating-linear-gradient(90deg,color-mix(in srgb,currentColor 18%,transparent) 0 3px,transparent 3px 4px)}',

  idle(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const cols = columns(stage, o);
    const colour = rgba(o.tone === 'accent' ? stage.theme.accent : stage.theme.muted, 0.75);
    return {
      frame(t) {
        drawBars(stage, cols, (c) => bounce(stage, c, t), o, colour);
      },
    };
  },

  reveal(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const cols = columns(stage, o);
    const goal = cols.map((c) => quantise(inkLevel(stage, c, o)));
    const colour = o.tone === 'accent' ? stage.theme.accent : stage.theme.muted;
    const full = stage.raster(true);
    const { ctx, box } = stage;
    return {
      frame(p, t) {
        const fade = clamp((p - 0.55) / 0.45);
        drawBars(
          stage,
          cols,
          (c, i) => {
            const k = easeInOut(clamp((p - ((c.x - box.x) / Math.max(1, box.w)) * 0.2) / 0.35));
            return bounce(stage, c, t) + (goal[i] - bounce(stage, c, t)) * k;
          },
          o,
          rgba(colour, 0.75 * (1 - fade)),
        );
        if (fade > 0) {
          ctx.save();
          ctx.clip(stage.clip);
          ctx.globalAlpha = fade;
          ctx.drawImage(full, 0, 0, stage.width, stage.height);
          ctx.restore();
        }
      },
    };
  },
});
