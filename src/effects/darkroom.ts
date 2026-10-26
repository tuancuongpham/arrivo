import { easeInOut } from '../core/geom';
import { cssColorToRGBA, mix, rgba } from '../core/theme';
import { buildThreshold, ThresholdPainter } from '../core/threshold';
import { defineEffect, type Effect, type Stage } from '../core/types';
import { makeGrain } from './util';

export interface DarkroomOptions {
  /** Film grain strength, 0–1. */
  grain: number;
  /** Colour of the undeveloped emulsion, mixed into the surface. */
  tint: string;
}

const DEFAULTS: DarkroomOptions = { grain: 0.5, tint: '#A9B8C9' };

function emulsion(stage: Stage, o: DarkroomOptions): string {
  const tint = cssColorToRGBA(o.tint) ?? [169, 184, 201, 255];
  return rgba(mix(stage.theme.surface, tint, stage.theme.dark ? 0.28 : 0.42));
}

/** Instant film developing: a milky emulsion clears from the middle while contrast and colour come up. */
export const darkroom: Effect<DarkroomOptions> = defineEffect({
  name: 'darkroom',
  show: 'start',
  duration: 1900,
  css: '.arrivo[data-arrivo-effect="darkroom"] .arrivo-sk-line,.arrivo[data-arrivo-effect="darkroom"] .arrivo-sk-block{background:color-mix(in srgb,#A9B8C9 38%,transparent)}',

  idle(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const film = emulsion(stage, o);
    const grain = makeGrain(stage, 90, 255);
    const { ctx } = stage;
    return {
      frame(t) {
        ctx.save();
        ctx.clip(stage.clip);
        ctx.fillStyle = film;
        ctx.fillRect(0, 0, stage.width, stage.height);
        const x = ((t * 0.05) % (stage.width + 260)) - 130;
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 90, 0);
        ctx.lineTo(x + 30, stage.height);
        ctx.lineTo(x - 60, stage.height);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.clip(stage.clip);
        grain(ctx, t, 0.12 * o.grain, 'multiply');
        ctx.restore();
      },
    };
  },

  reveal(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const film = emulsion(stage, o);
    const grain = makeGrain(stage, 90, 255);
    const grid = buildThreshold({ kind: 'ink', width: stage.width, height: stage.height, origin: stage.origin, fbm: stage.fbm, random: stage.random, cell: 6 });
    const painter = new ThresholdPainter(stage, grid, { color: stage.theme.ink, width: 0, alpha: 0, trail: 0, hard: false, softness: 0.3 });
    const { root, ctx } = stage;
    const saved = root.style.filter;
    return {
      frame(p, t) {
        const e = easeInOut(p);
        root.style.filter =
          p >= 1
            ? saved
            : `sepia(${(0.85 * (1 - e)).toFixed(3)}) saturate(${(0.2 + 0.8 * e).toFixed(3)}) contrast(${(0.5 + 0.5 * e).toFixed(3)}) brightness(${(1.45 - 0.45 * e).toFixed(3)}) blur(${(1.4 * (1 - e)).toFixed(2)}px)`;
        painter.draw(Math.min(1, p * 1.15), (lx) => {
          lx.fillStyle = film;
          lx.fillRect(0, 0, stage.width, stage.height);
        });
        ctx.save();
        ctx.clip(stage.clip);
        grain(ctx, t, 0.12 * o.grain * (1 - e), 'multiply');
        ctx.restore();
      },
      dispose() {
        root.style.filter = saved;
      },
    };
  },
});
