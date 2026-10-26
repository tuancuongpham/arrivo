import { pixelBuffer } from '../core/canvas';
import { clamp, pack, smoothstep } from '../core/geom';
import { cssColorToRGBA } from '../core/theme';
import { buildThreshold } from '../core/threshold';
import { defineEffect, type Effect, type Stage } from '../core/types';

export interface ThermalOptions {
  palette: 'iron' | 'rainbow';
  /** Show a crosshair and temperature readout while loading. */
  readout: boolean;
}

const DEFAULTS: ThermalOptions = { palette: 'iron', readout: true };

const STOPS: Record<ThermalOptions['palette'], [number, string][]> = {
  iron: [
    [0, '#000014'],
    [0.18, '#2a0b5c'],
    [0.38, '#8c1a8c'],
    [0.55, '#d6303a'],
    [0.72, '#f7811e'],
    [0.88, '#fbd24c'],
    [1, '#ffffe8'],
  ],
  rainbow: [
    [0, '#0b1d6b'],
    [0.25, '#1d9edb'],
    [0.5, '#4ccf6a'],
    [0.75, '#f5d33b'],
    [1, '#e8412c'],
  ],
};

/** 256-entry colour table for a palette. */
function lut(name: ThermalOptions['palette']): Uint8ClampedArray {
  const stops = STOPS[name].map(([at, c]) => [at, cssColorToRGBA(c) ?? [0, 0, 0, 255]] as const);
  const out = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    let j = 1;
    while (j < stops.length - 1 && stops[j][0] < v) j++;
    const [a0, c0] = stops[j - 1];
    const [a1, c1] = stops[j];
    const k = clamp((v - a0) / (a1 - a0 || 1));
    for (let ch = 0; ch < 3; ch++) out[i * 3 + ch] = c0[ch] + (c1[ch] - c0[ch]) * k;
  }
  return out;
}

function heatField(stage: Stage, cell: number) {
  const cols = Math.ceil(stage.width / cell);
  const rows = Math.ceil(stage.height / cell);
  const k = 0.03 * cell;
  return { cols, rows, at: (i: number, j: number, t: number): number => clamp(stage.fbm(i * k + t * 0.0002, j * k - t * 0.00015) * 1.5 - 0.25) };
}

/** A thermal camera: blobs of heat while loading; the real picture cools into place from the origin. */
export const thermal: Effect<ThermalOptions> = defineEffect({
  name: 'thermal',
  show: 'end',
  duration: 900,
  css: '.arrivo[data-arrivo-effect="thermal"] .arrivo-sk-line,.arrivo[data-arrivo-effect="thermal"] .arrivo-sk-block{background:linear-gradient(90deg,#2a0b5c,#d6303a,#fbd24c);opacity:.35}',

  idle(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const table = lut(o.palette);
    const cell = Math.max(5, Math.sqrt((stage.width * stage.height) / 9000));
    const field = heatField(stage, cell);
    const buf = pixelBuffer(field.cols, field.rows);
    const { ctx, box, theme } = stage;
    return {
      frame(t) {
        let hot = 0;
        for (let j = 0; j < field.rows; j++) {
          for (let i = 0; i < field.cols; i++) {
            const h = field.at(i, j, t);
            hot = Math.max(hot, h);
            const c = ((h * 255) | 0) * 3;
            buf.px[j * field.cols + i] = pack(table[c], table[c + 1], table[c + 2], 235);
          }
        }
        buf.flush();
        ctx.save();
        ctx.clip(stage.clip);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(buf.canvas, 0, 0, field.cols * cell, field.rows * cell);
        ctx.restore();
        if (o.readout && box.w >= 120 && box.h >= 40) {
          const cx = box.x + box.w / 2;
          const cy = box.y + box.h / 2;
          ctx.strokeStyle = 'rgba(255,255,255,.85)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx - 8, cy);
          ctx.lineTo(cx - 3, cy);
          ctx.moveTo(cx + 3, cy);
          ctx.lineTo(cx + 8, cy);
          ctx.moveTo(cx, cy - 8);
          ctx.lineTo(cx, cy - 3);
          ctx.moveTo(cx, cy + 3);
          ctx.lineTo(cx, cy + 8);
          ctx.stroke();
          ctx.font = `500 11px ${theme.mono}`;
          ctx.fillStyle = 'rgba(255,255,255,.9)';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${(28 + hot * 11).toFixed(1)}°C`, cx + 12, cy);
        }
      },
    };
  },

  reveal(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const table = lut(o.palette);
    const px = stage.pixels(true, 60_000);
    const buf = pixelBuffer(px.width, px.height);
    const cool = buildThreshold({ kind: 'ink', width: px.width, height: px.height, origin: { x: stage.origin.x * px.scale, y: stage.origin.y * px.scale }, fbm: (x, y) => stage.fbm(x / px.scale, y / px.scale), random: stage.random, cell: 3 });
    const n = px.width * px.height;
    const heat = new Uint16Array(n);
    for (let i = 0; i < n; i++) {
      const lum = (0.2126 * px.data[i * 4] + 0.7152 * px.data[i * 4 + 1] + 0.0722 * px.data[i * 4 + 2]) / 255;
      const blob = stage.noise((i % px.width) * 0.08, Math.floor(i / px.width) * 0.08);
      heat[i] = ((clamp(lum * 0.75 + blob * 0.25) * 255) | 0) * 3;
    }
    const full = stage.raster(true);
    const { ctx } = stage;
    return {
      frame(p) {
        for (let y = 0; y < px.height; y++) {
          for (let x = 0; x < px.width; x++) {
            const i = y * px.width + x;
            const tv = cool.values[((y / 3) | 0) * cool.cols + ((x / 3) | 0)];
            const c = smoothstep(tv * 0.75, tv * 0.75 + 0.25, p);
            const h = heat[i];
            const d = i * 4;
            buf.px[i] = pack(
              table[h] + (px.data[d] - table[h]) * c,
              table[h + 1] + (px.data[d + 1] - table[h + 1]) * c,
              table[h + 2] + (px.data[d + 2] - table[h + 2]) * c,
              px.data[d + 3],
            );
          }
        }
        buf.flush();
        ctx.save();
        ctx.clip(stage.clip);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(buf.canvas, 0, 0, stage.width, stage.height);
        if (p > 0.85) {
          ctx.globalAlpha = (p - 0.85) / 0.15;
          ctx.drawImage(full, 0, 0, stage.width, stage.height);
        }
        ctx.restore();
      },
    };
  },
});
