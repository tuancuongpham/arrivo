import { pixelBuffer } from '../core/canvas';
import { clamp, easeInOut, pack } from '../core/geom';
import { defineEffect, type Stage } from '../core/types';

export interface SwarmOptions {
  maxParticles: number;
  /** Particle size in CSS pixels. */
  size: number;
}

const DEFAULTS: SwarmOptions = { maxParticles: 1800, size: 1.5 };

interface Particle {
  x: number;
  y: number;
}

/** Particles are plotted at CSS resolution and scaled up, which keeps clearing and uploading the buffer cheap. */
function plotter(stage: Stage, size: number) {
  const buf = pixelBuffer(stage.width, stage.height);
  const s = Math.max(1, Math.round(size));
  const { width: w, height: h, px } = buf;
  return {
    clear: () => px.fill(0),
    dot(x: number, y: number, c: number): void {
      const X = x | 0;
      const Y = y | 0;
      if (X < 0 || Y < 0 || X > w - s || Y > h - s) return;
      for (let j = 0; j < s; j++) px.fill(c, (Y + j) * w + X, (Y + j) * w + X + s);
    },
    flush(): void {
      buf.flush();
      const { ctx } = stage;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buf.canvas, 0, 0, stage.width, stage.height);
      ctx.imageSmoothingEnabled = true;
    },
  };
}

/** Points of ink in the final content, spaced so there are at most `max` of them. */
function inkPoints(stage: Stage, max: number): [number, number, number, number, number][] {
  const px = stage.pixels(false);
  let ink = 0;
  for (let i = 3; i < px.data.length; i += 4) if (px.data[i] > 110) ink++;
  const area = ink / (px.scale * px.scale);
  const step = Math.max(2, Math.sqrt(area / max));
  const out: [number, number, number, number, number][] = [];
  for (let y = 0; y < stage.height; y += step) {
    const row = Math.min(px.height - 1, Math.floor(y * px.scale)) * px.width;
    for (let x = 0; x < stage.width; x += step) {
      const i = (row + Math.min(px.width - 1, Math.floor(x * px.scale))) * 4;
      if (px.data[i + 3] > 110) out.push([x, y, px.data[i], px.data[i + 1], px.data[i + 2]]);
    }
  }
  return out;
}

/** Dust drifts on a flow field while loading, then every mote flies to a point of ink in the real content. */
export const swarm = defineEffect<SwarmOptions, Particle[]>({
  name: 'swarm',
  show: 'end',
  duration: 1600,
  css: '.arrivo[data-arrivo-effect="swarm"] .arrivo-sk-line,.arrivo[data-arrivo-effect="swarm"] .arrivo-sk-block{background:radial-gradient(circle,color-mix(in srgb,currentColor 30%,transparent) 30%,transparent 34%) 0 0/6px 5px}',

  idle(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const { box, theme } = stage;
    const n = Math.round(clamp((box.w * box.h) / 60, 300, o.maxParticles));
    const ps: Particle[] = Array.from({ length: n }, () => ({ x: box.x + stage.random() * box.w, y: box.y + stage.random() * box.h }));
    const out = plotter(stage, o.size);
    const colour = pack(theme.muted[0], theme.muted[1], theme.muted[2], 150);
    let last = -1;
    return {
      frame(t) {
        const k = last < 0 ? 1 : clamp((t - last) / 16.7, 0, 4);
        last = t;
        out.clear();
        for (const p of ps) {
          const a = stage.noise(p.x * 0.012, p.y * 0.012 + t * 0.0003) * Math.PI * 4;
          p.x += (Math.cos(a) * 0.5 + (stage.random() - 0.5) * 0.7) * k;
          p.y += (Math.sin(a) * 0.5 + (stage.random() - 0.5) * 0.7) * k;
          if (p.x < box.x) p.x += box.w;
          else if (p.x > box.x + box.w) p.x -= box.w;
          if (p.y < box.y) p.y += box.h;
          else if (p.y > box.y + box.h) p.y -= box.h;
          out.dot(p.x, p.y, colour);
        }
        out.flush();
      },
      handoff: () => ps,
    };
  },

  reveal(stage, options, from) {
    const o = { ...DEFAULTS, ...options };
    const goals = inkPoints(stage, o.maxParticles);
    for (let i = goals.length - 1; i > 0; i--) {
      const j = Math.floor(stage.random() * (i + 1));
      [goals[i], goals[j]] = [goals[j], goals[i]];
    }
    const { box, theme, origin } = stage;
    const far = Math.max(1, Math.hypot(stage.width, stage.height) / 2);
    const ms = theme.muted;
    const motes = goals.map((g, i) => {
      const start = from?.[i] ?? { x: box.x + stage.random() * box.w, y: box.y + stage.random() * box.h };
      return {
        sx: start.x,
        sy: start.y,
        tx: g[0],
        ty: g[1],
        r: g[2],
        g: g[3],
        b: g[4],
        delay: (Math.hypot(g[0] - origin.x, g[1] - origin.y) / far) * 0.4,
        swirl: (stage.random() - 0.5) * 40,
      };
    });
    const out = plotter(stage, o.size);
    return {
      frame(p) {
        out.clear();
        for (const m of motes) {
          const q = easeInOut(clamp((p - m.delay) / 0.55));
          const dx = m.tx - m.sx;
          const dy = m.ty - m.sy;
          const len = Math.hypot(dx, dy) || 1;
          const sw = Math.sin(q * Math.PI) * m.swirl;
          const c = pack(
            (ms[0] + (m.r - ms[0]) * q) | 0,
            (ms[1] + (m.g - ms[1]) * q) | 0,
            (ms[2] + (m.b - ms[2]) * q) | 0,
            (150 + 105 * q) | 0,
          );
          out.dot(m.sx + dx * q - (dy / len) * sw, m.sy + dy * q + (dx / len) * sw, c);
        }
        out.flush();
      },
    };
  },
});
