import { clamp, easeOut, fillRoundRect, roundRectPath } from '../core/geom';
import { rgba } from '../core/theme';
import { defineEffect, type Effect, type Rect, type Stage } from '../core/types';

export interface RedactOptions {
  /** Rubber stamp shown while loading, or `false`. */
  stamp: string | false;
  /** A soft highlight sweeping over the bars while loading. */
  shimmer: boolean;
}

const DEFAULTS: RedactOptions = { stamp: 'Classified', shimmer: true };

interface Bar extends Rect {
  r: number;
}

/** One bar per word, sized to the real word, plus one per image or block; in reading order. */
function barsFor(stage: Stage): Bar[] {
  const bars: Bar[] = [];
  for (const w of stage.words()) {
    const pad = w.h * 0.1;
    bars.push({ x: w.x - 1.5, y: w.y + pad, w: w.w + 3, h: w.h - pad * 2, r: 2 });
  }
  for (const t of stage.targets) {
    if (t.kind !== 'text') bars.push({ x: t.x, y: t.y, w: t.w, h: t.h, r: Math.max(2, t.radius) });
  }
  const line = (b: Bar): number => Math.round((b.y + b.h / 2) / 4);
  return bars.sort((a, b) => line(a) - line(b) || a.x - b.x);
}

function drawStamp(stage: Stage, text: string, t: number, alpha: number): void {
  const { box, ctx, theme } = stage;
  if (alpha <= 0 || box.w < 140 || box.h < 24) return;
  ctx.save();
  ctx.font = `500 11px ${theme.mono}`;
  const w = ctx.measureText(text).width + 16;
  ctx.globalAlpha = alpha * (0.8 + 0.2 * Math.sin(t / 260));
  ctx.translate(box.x + box.w - w / 2 - 6, box.y + 12);
  ctx.rotate(-0.1);
  ctx.strokeStyle = ctx.fillStyle = rgba(theme.danger);
  ctx.lineWidth = 1;
  ctx.beginPath();
  roundRectPath(ctx, -w / 2, -9, w, 18, 4);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0.5);
  ctx.restore();
}

export const redact: Effect<RedactOptions> = defineEffect({
  name: 'redact',
  show: 'start',
  duration: 1250,
  css: '.arrivo[data-arrivo-effect="redact"] .arrivo-sk-line{background:color-mix(in srgb,currentColor 78%,transparent);border-radius:2px}',

  idle(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const bars = barsFor(stage);
    const { ctx, theme } = stage;
    const band = new Path2D();
    for (const b of bars) band.rect(b.x, b.y, b.w, b.h);
    return {
      frame(t) {
        ctx.fillStyle = rgba(theme.ink);
        for (const b of bars) fillRoundRect(ctx, b.x, b.y, b.w, b.h, b.r);
        if (o.shimmer) {
          const x = ((t * 0.22) % (stage.width + 200)) - 100;
          ctx.save();
          ctx.clip(band);
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = rgba(theme.surface);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + 46, 0);
          ctx.lineTo(x + 16, stage.height);
          ctx.lineTo(x - 30, stage.height);
          ctx.fill();
          ctx.restore();
        }
        if (o.stamp) drawStamp(stage, o.stamp, t, 1);
      },
    };
  },

  reveal(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const bars = barsFor(stage);
    const { ctx, theme } = stage;
    const D = 1250;
    const each = Math.min(260, D * 0.35);
    const step = bars.length > 1 ? (D - each) / (bars.length - 1) : 0;
    return {
      frame(p, t) {
        const rt = p * D;
        ctx.fillStyle = rgba(theme.ink);
        bars.forEach((b, i) => {
          const q = easeOut(clamp((rt - i * step) / each));
          if (q < 1) fillRoundRect(ctx, b.x + b.w * q, b.y, b.w * (1 - q), b.h, b.r);
        });
        if (o.stamp) drawStamp(stage, o.stamp, t, 1 - clamp(p * 2.5));
      },
    };
  },
});
