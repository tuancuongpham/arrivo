import { pixelBuffer } from '../core/canvas';
import { clamp, pack } from '../core/geom';
import { rgba } from '../core/theme';
import { buildThreshold, ThresholdPainter, type ThresholdKind } from '../core/threshold';
import { defineEffect, type Effect, type Stage } from '../core/types';

export interface InkOptions {
  /**
   * Shape of the reveal: `ink` bleeds with a wet edge, `radar` sweeps clockwise, `ripple`
   * rings outward, `hilbert` crawls along a space-filling curve, `bayer` dithers, `voronoi`
   * pops in shards, `receipt` prints line by line, `dissolve` scatters.
   */
  variant: ThresholdKind;
  /** Threshold cell size in CSS pixels (defaults per variant). */
  cell?: number;
}

const DEFAULTS: InkOptions = { variant: 'ink' };

/** A slow watercolour wash, computed coarse and smoothed up. */
export function makeWash(stage: Stage, alpha = 150) {
  const cell = Math.max(6, Math.sqrt((stage.width * stage.height) / 12_000));
  const cols = Math.ceil(stage.width / cell);
  const rows = Math.ceil(stage.height / cell);
  const buf = pixelBuffer(cols, rows);
  const [r, g, b] = stage.theme.muted;
  const k = 0.22 * (6 / cell);
  return (ctx: CanvasRenderingContext2D, t: number): void => {
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const n = stage.fbm(i * k + t * 0.00035, j * k - t * 0.00025);
        buf.px[j * cols + i] = pack(r, g, b, (clamp(n * 1.3 - 0.25) * alpha) | 0);
      }
    }
    buf.flush();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(buf.canvas, 0, 0, cols * cell, rows * cell);
  };
}

/** Threshold-map reveals. One engine, eight looks; `ink` is the wet-edged default. */
export const ink: Effect<InkOptions> = defineEffect({
  name: 'ink',
  show: 'start',
  duration: 800,
  css: '.arrivo[data-arrivo-effect="ink"] .arrivo-sk-line,.arrivo[data-arrivo-effect="ink"] .arrivo-sk-block{background:radial-gradient(120% 140% at 30% 40%,color-mix(in srgb,currentColor 14%,transparent),color-mix(in srgb,currentColor 6%,transparent))}',

  idle(stage) {
    const wash = makeWash(stage);
    const { ctx } = stage;
    return {
      frame(t) {
        ctx.save();
        ctx.clip(stage.clip);
        wash(ctx, t);
        ctx.restore();
      },
    };
  },

  reveal(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const grid = buildThreshold({
      kind: o.variant,
      width: stage.width,
      height: stage.height,
      origin: stage.origin,
      fbm: stage.fbm,
      random: stage.random,
      cell: o.cell,
    });
    const painter = new ThresholdPainter(stage, grid);
    const wash = makeWash(stage);
    const surface = rgba(stage.theme.surface);
    return {
      frame(p, t) {
        painter.draw(p, (lx) => {
          lx.fillStyle = surface;
          lx.fillRect(0, 0, stage.width, stage.height);
          wash(lx, t);
        });
      },
    };
  },
});
