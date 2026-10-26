import { ctx2d, makeCanvas, pixelBuffer } from '../core/canvas';
import { fillRoundRect, pack } from '../core/geom';
import { rgba } from '../core/theme';
import type { Rect, Stage } from '../core/types';

/**
 * Grey grain, two CSS pixels per speck, tiled as patterns so any area costs the same.
 * Returns a painter that fills the current clip with a randomly shifted tile.
 */
export function makeGrain(stage: Stage, lo = 40, hi = 255) {
  const tiles = [0, 1, 2].map(() => {
    const half = pixelBuffer(80, 80);
    for (let i = 0; i < half.px.length; i++) {
      const v = (lo + stage.random() * (hi - lo)) | 0;
      half.px[i] = pack(v, v, v, 255);
    }
    half.flush();
    const tile = makeCanvas(160, 160);
    const x = ctx2d(tile);
    x.imageSmoothingEnabled = false;
    x.drawImage(half.canvas, 0, 0, 160, 160);
    return tile;
  });
  const patterns = tiles.map((c) => stage.ctx.createPattern(c, 'repeat'));
  return (ctx: CanvasRenderingContext2D, t: number, alpha: number, composite: GlobalCompositeOperation = 'source-over'): void => {
    const pattern = patterns[Math.floor(t / 45) % patterns.length];
    if (alpha <= 0 || !pattern) return;
    const dx = Math.floor(stage.random() * 160);
    const dy = Math.floor(stage.random() * 160);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = composite;
    ctx.translate(-dx, -dy);
    ctx.fillStyle = pattern;
    ctx.fillRect(dx, dy, stage.width, stage.height);
    ctx.restore();
  };
}

/** Faint bars where content will land, under effects that don't cover every target themselves. */
export function drawGhosts(stage: Stage, alpha = 0.16): void {
  const { ctx, theme } = stage;
  ctx.fillStyle = rgba(theme.muted, alpha);
  for (const t of stage.targets) fillRoundRect(ctx, t.x, t.y, t.w, t.h, Math.max(3, Math.min(t.radius, 10)));
}

/** Targets in reading order: line by line, left to right. */
export function readingOrder<T extends Rect>(rects: readonly T[]): T[] {
  const line = (r: Rect): number => Math.round((r.y + r.h / 2) / 6);
  return [...rects].sort((a, b) => line(a) - line(b) || a.x - b.x);
}
