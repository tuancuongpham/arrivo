import { ctx2d, makeCanvas } from '../core/canvas';
import { clamp, easeOut } from '../core/geom';
import { rgba } from '../core/theme';
import { defineEffect, type Stage } from '../core/types';
import { makeGrain } from './util';

export interface CrtOptions {
  /** On-screen display in the corner while searching, or `false`. */
  channel: string | false;
  /** Blinking caption while searching, or `false`. */
  message: string | false;
}

const DEFAULTS: CrtOptions = { channel: 'CH 03', message: 'No signal' };
const OSD = '#5DCAA5';

function scanlines(stage: Stage, alpha: number): void {
  const { ctx } = stage;
  ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(3)})`;
  for (let y = 0; y < stage.height; y += 3) ctx.fillRect(0, y, stage.width, 1);
}

/**
 * Split an opaque raster into pure red, green and blue layers by multiplying with each
 * primary; added back together they rebuild it. Done on the GPU, no pixel loops.
 */
function channels(src: HTMLCanvasElement): HTMLCanvasElement[] {
  return ['#ff0000', '#00ff00', '#0000ff'].map((tint) => {
    const c = makeCanvas(src.width, src.height);
    const x = ctx2d(c);
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = tint;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  });
}

/** An old TV finding the channel: static, tearing, a rolling picture, colour fringes converging, a flash. */
export const crt = defineEffect<CrtOptions>({
  name: 'crt',
  show: 'end',
  duration: 1500,
  css: '.arrivo[data-arrivo-effect="crt"] .arrivo-sk-line,.arrivo[data-arrivo-effect="crt"] .arrivo-sk-block{background:repeating-linear-gradient(0deg,color-mix(in srgb,currentColor 16%,transparent) 0 1px,color-mix(in srgb,currentColor 8%,transparent) 1px 3px)}',

  idle(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const grain = makeGrain(stage);
    const { ctx, theme } = stage;
    const anchor = stage.targets.find((t) => t.kind === 'media') ?? stage.box;
    return {
      frame(t) {
        ctx.save();
        ctx.clip(stage.clip);
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, stage.width, stage.height);
        grain(ctx, t, 0.85);
        ctx.fillStyle = 'rgba(255,255,255,.08)';
        ctx.fillRect(0, ((t * 0.08) % (stage.height + 40)) - 20, stage.width, 14);
        scanlines(stage, 0.22);
        if (anchor.h >= 40 && anchor.w >= 90) {
          ctx.font = `500 11px ${theme.mono}`;
          ctx.textBaseline = 'top';
          ctx.textAlign = 'left';
          ctx.fillStyle = OSD;
          if (o.channel) ctx.fillText(o.channel, anchor.x + 8, anchor.y + 7);
          if (o.message && Math.floor(t / 520) % 2) ctx.fillText(o.message, anchor.x + 8, anchor.y + anchor.h - 19);
        }
        ctx.restore();
      },
    };
  },

  reveal(stage) {
    const full = stage.raster(true);
    // Split a raster whose surface runs edge to edge, so shifted channels never expose
    // the black base along target edges as coloured outlines.
    const flat = makeCanvas(full.width, full.height);
    const fx = ctx2d(flat);
    fx.fillStyle = rgba(stage.theme.surface);
    fx.fillRect(0, 0, flat.width, flat.height);
    fx.drawImage(stage.raster(false), 0, 0);
    const layers = channels(flat);
    const grain = makeGrain(stage);
    // Compose the channels unclipped, then clip once: clipping the black base directly
    // leaves a dark anti-aliased rim around every target.
    const picture = makeCanvas(full.width, full.height);
    const px = ctx2d(picture);
    px.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);
    const { ctx, dpr } = stage;
    const slice = Math.max(3, Math.round(stage.height / 120));
    return {
      frame(p, t) {
        const e = easeOut(p);
        const tear = 16 * (1 - e) * (1 - e);
        const roll = (1 - e) ** 3 * stage.height * 0.8 * Math.cos(p * 9);
        const split = 5 * (1 - e);
        px.globalCompositeOperation = 'source-over';
        px.fillStyle = '#000';
        px.fillRect(0, 0, stage.width, stage.height);
        px.globalCompositeOperation = 'lighter';
        layers.forEach((layer, k) => {
          const off = (k - 1) * split;
          for (let y = 0; y < stage.height; y += slice) {
            const h = Math.min(slice, stage.height - y);
            const shift = tear * (stage.noise(y * 0.06, t * 0.004) - 0.5) * 2 + off;
            const yy = (((y + roll) % stage.height) + stage.height) % stage.height;
            px.drawImage(layer, 0, y * dpr, layer.width, h * dpr, shift, yy, stage.width, h);
          }
        });
        ctx.save();
        ctx.clip(stage.clip);
        ctx.drawImage(picture, 0, 0, stage.width, stage.height);
        grain(ctx, t, clamp(1 - p * 1.7) * 0.85);
        scanlines(stage, 0.2 * (1 - p) + 0.04);
        const flash = p > 0.5 && p < 0.8 ? Math.sin(((p - 0.5) / 0.3) * Math.PI) * 0.3 : 0;
        if (flash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${flash.toFixed(3)})`;
          ctx.fillRect(0, 0, stage.width, stage.height);
        }
        if (p > 0.85) {
          ctx.globalAlpha = (p - 0.85) / 0.15;
          ctx.drawImage(full, 0, 0, stage.width, stage.height);
        }
        ctx.restore();
      },
    };
  },
});
