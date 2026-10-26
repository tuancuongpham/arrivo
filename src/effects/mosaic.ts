import { pixelBuffer } from '../core/canvas';
import { MaxHeap } from '../core/geom';
import { buildSAT, quadNode, splitQuad, type QuadNode } from '../core/quadtree';
import { rgba } from '../core/theme';
import { defineEffect, type Effect, type Rect, type Stage } from '../core/types';

export interface MosaicOptions {
  /** Starting block size in CSS pixels. */
  block: number;
  /** Analysis resolution cap; larger areas are analysed downsampled. */
  maxPixels: number;
}

const DEFAULTS: MosaicOptions = { block: 24, maxPixels: 200_000 };

function tiles(stage: Stage, size: number): Rect[] {
  const out: Rect[] = [];
  for (const t of stage.targets) {
    for (let y = t.y; y < t.y + t.h; y += size) {
      for (let x = t.x; x < t.x + t.w; x += size) {
        out.push({ x, y, w: Math.min(size, t.x + t.w - x), h: Math.min(size, t.y + t.h - y) });
      }
    }
  }
  return out;
}

/**
 * Progressive-JPEG nostalgia with a twist: blocks split by how much detail they hide, so
 * edges and faces sharpen first while flat sky stays chunky a little longer.
 */
export const mosaic: Effect<MosaicOptions> = defineEffect({
  name: 'mosaic',
  show: 'end',
  duration: 800,
  css: '.arrivo[data-arrivo-effect="mosaic"] .arrivo-sk-line,.arrivo[data-arrivo-effect="mosaic"] .arrivo-sk-block{border-radius:0;background:repeating-linear-gradient(90deg,color-mix(in srgb,currentColor 12%,transparent) 0 1.4em,color-mix(in srgb,currentColor 7%,transparent) 1.4em 2.8em)}',

  idle(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const blocks = tiles(stage, o.block);
    const { ctx, theme } = stage;
    return {
      frame(t) {
        ctx.save();
        ctx.clip(stage.clip);
        ctx.fillStyle = rgba(theme.muted);
        for (const b of blocks) {
          ctx.globalAlpha = 0.22 + 0.18 * Math.sin(t / 260 - (b.x + b.y) * 0.03);
          ctx.fillRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        }
        ctx.restore();
      },
    };
  },

  reveal(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const px = stage.pixels(true, o.maxPixels);
    const s = px.scale;
    const sat = buildSAT(px.data, px.width, px.height);
    const size = Math.max(2, Math.round(o.block * s));
    const roots: QuadNode[] = [];
    for (const t of stage.targets) {
      const x0 = Math.max(0, Math.floor(t.x * s));
      const y0 = Math.max(0, Math.floor(t.y * s));
      const x1 = Math.min(px.width, Math.ceil((t.x + t.w) * s));
      const y1 = Math.min(px.height, Math.ceil((t.y + t.h) * s));
      for (let y = y0; y < y1; y += size) {
        for (let x = x0; x < x1; x += size) roots.push(quadNode(sat, x, y, Math.min(size, x1 - x), Math.min(size, y1 - y)));
      }
    }
    const buf = pixelBuffer(px.width, px.height);
    const paint = (n: QuadNode): void => {
      for (let y = n.y; y < n.y + n.h; y++) buf.px.fill(n.color, y * buf.width + n.x, y * buf.width + n.x + n.w);
    };
    const heap = new MaxHeap<QuadNode>();
    for (const n of roots) {
      paint(n);
      heap.push(n);
    }
    let leaves = roots.length;
    const area = roots.reduce((sum, n) => sum + n.w * n.h, 0);
    const growth = Math.max(1, area / 3 / Math.max(1, roots.length));
    const full = stage.raster(true);
    const { ctx } = stage;
    return {
      frame(p) {
        const goal = roots.length * growth ** (p ** 1.3);
        while (leaves < goal) {
          const top = heap.peek();
          if (!top || top.e <= 1) break;
          heap.pop();
          const kids = splitQuad(sat, top);
          for (const k of kids) {
            paint(k);
            heap.push(k);
          }
          leaves += kids.length - 1;
        }
        buf.flush();
        ctx.save();
        ctx.clip(stage.clip);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(buf.canvas, 0, 0, stage.width, stage.height);
        ctx.imageSmoothingEnabled = true;
        if (p > 0.9) {
          ctx.globalAlpha = (p - 0.9) / 0.1;
          ctx.drawImage(full, 0, 0, stage.width, stage.height);
        }
        ctx.restore();
      },
    };
  },
});
