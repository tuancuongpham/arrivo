import { ctx2d, makeCanvas } from '../core/canvas';
import { clamp, roundRectPath } from '../core/geom';
import { rgba } from '../core/theme';
import { defineEffect, type Effect, type Glyph, type Stage, type Target } from '../core/types';

export interface FlapOptions {
  /** Ordered faces each flap cycles through. Characters outside it land after a few random flips. */
  charset: string;
  /** Most flips a cell makes before landing. */
  flips: number;
  /** Milliseconds per flip while revealing. */
  flipMs: number;
  /** A soft mechanical click per flip. Needs a prior user gesture for audio to start. */
  sound: boolean;
}

const DEFAULTS: FlapOptions = {
  charset: ' 0123456789.,:+-%ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  flips: 9,
  flipMs: 40,
  sound: false,
};

const IMAGE = '\u0000image';
const BLANK = '\u0000blank';
const IDLE_FLIP_MS = 110;

interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  baseline: number;
  font: string;
  color: string;
  media: boolean;
  /** Face at rest, face flipping in, flip progress (1 = at rest). */
  cur: string;
  next: string;
  f: number;
  /** Loading: start of the current flip and when the next one is due. */
  at: number;
  due: number;
  /** Reveal: starting face, faces after each flip, start delay. */
  start: string;
  seq: string[];
  delay: number;
  step: number;
}

/**
 * Faces a flap shows on its way to `target`, ending with `target`. Inside the charset the
 * flaps count up in order like a real Solari board; outside it they shuffle, then land.
 */
export function planFlips(target: string, charset: string, maxFlips: number, random: () => number): { start: string; seq: string[] } {
  const faces = Array.from(charset);
  const n = Math.max(2, Math.round(3 + random() * (Math.max(3, maxFlips) - 3)));
  const ti = faces.indexOf(target);
  if (ti < 0) {
    const pick = (): string => faces[1 + Math.floor(random() * (faces.length - 1))] ?? target;
    const seq = Array.from({ length: n - 1 }, pick);
    seq.push(target);
    return { start: pick(), seq };
  }
  const at = (k: number): string => faces[(((ti - k) % faces.length) + faces.length) % faces.length];
  const seq: string[] = [];
  for (let k = n - 1; k >= 0; k--) seq.push(at(k));
  return { start: at(n), seq };
}

let audio: AudioContext | null = null;
let clickBuffer: AudioBuffer | null = null;
let lastClick = 0;

function click(): void {
  if (typeof AudioContext === 'undefined') return;
  const t = performance.now();
  if (t - lastClick < 18) return;
  lastClick = t;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') {
      void audio.resume();
      return;
    }
    if (!clickBuffer) {
      clickBuffer = audio.createBuffer(1, Math.round(audio.sampleRate * 0.012), audio.sampleRate);
      const d = clickBuffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
    }
    const src = audio.createBufferSource();
    src.buffer = clickBuffer;
    const band = audio.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1800 + Math.random() * 900;
    band.Q.value = 1.2;
    const gain = audio.createGain();
    gain.gain.value = 0.06;
    src.connect(band).connect(gain).connect(audio.destination);
    src.start();
  } catch {
    // Audio is a garnish; ignore browsers that refuse it.
  }
}

function baseCell(r: { x: number; y: number; w: number; h: number }, face: string): Cell {
  return { ...r, baseline: 0, font: '', color: '', media: false, cur: face, next: face, f: 1, at: 0, due: 0, start: face, seq: [], delay: 0, step: -1 };
}

function textCell(g: Glyph, face: string): Cell {
  return { ...baseCell(g, face), baseline: g.baseline, font: g.font, color: g.color };
}

function mediaCell(t: Target): Cell {
  return { ...baseCell(t, BLANK), media: true };
}

/** Skeleton bars have no text, so tile them with small mono flaps. */
function blockCells(t: Target, stage: Stage, face: () => string): Cell[] {
  const h = Math.min(t.h, 28);
  const w = h * 0.62;
  const rows = Math.max(1, Math.floor((t.h + 4) / (h + 4)));
  const cols = Math.max(1, Math.floor(t.w / w));
  const font = `500 ${Math.round(h * 0.74)}px ${stage.theme.mono}`;
  const out: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const y = t.y + r * (h + 4);
      out.push({ ...baseCell({ x: t.x + c * w, y, w, h }, face()), baseline: y + h * 0.78, font, color: rgba(stage.theme.muted) });
    }
  }
  return out;
}

interface Sprite {
  img: HTMLCanvasElement;
  w: number;
}

let measure: CanvasRenderingContext2D | null = null;

/**
 * Glyph sprites keyed by font, colour, line box and character. A frame is then a batch of
 * image copies rather than hundreds of fillText calls, and the cache stays small because
 * cell width is not part of the key.
 */
class Glyphs {
  private map = new Map<string, Sprite>();

  constructor(private dpr: number) {}

  get(c: Cell, ch: string): Sprite | null {
    if (!ch || ch === ' ') return null;
    const ascent = c.baseline - c.y;
    const key = `${c.font}|${c.color}|${Math.round(c.h * 4)}|${Math.round(ascent * 4)}|${ch}`;
    const hit = this.map.get(key);
    if (hit) return hit;
    measure ??= ctx2d(makeCanvas(1, 1));
    measure.font = c.font;
    const w = Math.max(1, measure.measureText(ch).width + 2);
    const img = makeCanvas(Math.ceil(w * this.dpr), Math.max(2, Math.ceil(c.h * this.dpr)));
    const x = ctx2d(img);
    x.scale(img.width / w, img.height / c.h);
    x.font = c.font;
    x.fillStyle = c.color;
    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    x.fillText(ch, w / 2, ascent);
    const sprite = { img, w };
    this.map.set(key, sprite);
    return sprite;
  }
}

/** Copy part of a glyph sprite, centred in the cell. `from`/`to` are fractions of its height. */
function blit(ctx: CanvasRenderingContext2D, g: Sprite | null, c: Cell, from: number, to: number, y: number, h: number): void {
  if (!g || h <= 0) return;
  const ih = g.img.height;
  ctx.drawImage(g.img, 0, ih * from, g.img.width, ih * (to - from), c.x + (c.w - g.w) / 2, y, g.w, h);
}

/** One cell: the incoming face's top half, the outgoing face's bottom half, and the flap in between. */
function drawTextCell(ctx: CanvasRenderingContext2D, glyphs: Glyphs, c: Cell, cellFill: string): void {
  if (c.f >= 1) {
    blit(ctx, glyphs.get(c, c.cur), c, 0, 1, c.y, c.h);
    return;
  }
  const H = c.h / 2;
  const next = glyphs.get(c, c.next);
  const cur = glyphs.get(c, c.cur);
  blit(ctx, next, c, 0, 0.5, c.y, H);
  blit(ctx, cur, c, 0.5, 1, c.y + H, H);
  const top = c.f < 0.5;
  const s = Math.max(0.02, top ? 1 - c.f * 2 : (c.f - 0.5) * 2);
  const fy = top ? c.y + H * (1 - s) : c.y + H;
  ctx.fillStyle = cellFill;
  ctx.fillRect(c.x + 0.8, fy, c.w - 1.6, H * s);
  if (top) blit(ctx, cur, c, 0, 0.5, fy, H * s);
  else blit(ctx, next, c, 0.5, 1, fy, H * s);
  ctx.globalAlpha = (1 - s) * 0.35;
  ctx.fillStyle = '#000';
  ctx.fillRect(c.x, fy, c.w, H * s);
  ctx.globalAlpha = 1;
}

function mediaFace(ctx: CanvasRenderingContext2D, stage: Stage, c: Cell, value: string, image: HTMLCanvasElement | null): void {
  ctx.fillStyle = rgba(stage.theme.cell);
  ctx.beginPath();
  roundRectPath(ctx, c.x + 0.8, c.y, c.w - 1.6, c.h, 4);
  ctx.fill();
  if (value === IMAGE && image) {
    const d = stage.dpr;
    ctx.drawImage(image, c.x * d, c.y * d, c.w * d, c.h * d, c.x, c.y, c.w, c.h);
  } else {
    ctx.fillStyle = rgba(stage.theme.muted, 0.35);
    ctx.fillRect(c.x, c.y, c.w, c.h);
  }
}

function mediaHalf(ctx: CanvasRenderingContext2D, stage: Stage, c: Cell, value: string, top: boolean, s: number, image: HTMLCanvasElement | null): void {
  const m = c.y + c.h / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(c.x, top ? c.y : m, c.w, c.h / 2);
  ctx.clip();
  if (s < 1) {
    ctx.translate(0, m);
    ctx.scale(1, Math.max(s, 0.02));
    ctx.translate(0, -m);
  }
  mediaFace(ctx, stage, c, value, image);
  if (s < 1) {
    ctx.globalAlpha = (1 - s) * 0.35;
    ctx.fillStyle = '#000';
    ctx.fillRect(c.x, c.y, c.w, c.h);
  }
  ctx.restore();
}

function drawMediaCell(stage: Stage, c: Cell, image: HTMLCanvasElement | null): void {
  const ctx = stage.ctx;
  if (c.f >= 1) {
    mediaHalf(ctx, stage, c, c.cur, true, 1, image);
    mediaHalf(ctx, stage, c, c.cur, false, 1, image);
    return;
  }
  mediaHalf(ctx, stage, c, c.next, true, 1, image);
  mediaHalf(ctx, stage, c, c.cur, false, 1, image);
  if (c.f < 0.5) mediaHalf(ctx, stage, c, c.cur, true, 1 - c.f * 2, image);
  else mediaHalf(ctx, stage, c, c.next, false, (c.f - 0.5) * 2, image);
}

function drawCells(stage: Stage, glyphs: Glyphs, cells: Cell[], image: HTMLCanvasElement | null): void {
  const { ctx, theme } = stage;
  const cellFill = rgba(theme.cell);
  ctx.fillStyle = cellFill;
  ctx.beginPath();
  for (const c of cells) if (!c.media) roundRectPath(ctx, c.x + 0.8, c.y, c.w - 1.6, c.h, Math.min(3, c.w / 4));
  ctx.fill();
  for (const c of cells) {
    if (c.media) drawMediaCell(stage, c, image);
    else drawTextCell(ctx, glyphs, c, cellFill);
  }
  ctx.fillStyle = rgba(theme.surface);
  ctx.beginPath();
  for (const c of cells) ctx.rect(c.x, c.y + c.h / 2 - 0.5, c.w, 1);
  ctx.fill();
}

export const flap: Effect<FlapOptions> = defineEffect({
  name: 'flap',
  show: 'end',
  duration: 750,
  css: '.arrivo[data-arrivo-effect="flap"] .arrivo-sk-line{background:repeating-linear-gradient(90deg,color-mix(in srgb,currentColor 13%,transparent) 0 .55em,transparent .55em .64em)}',

  idle(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const pool = Array.from(o.charset).filter((ch) => ch !== ' ');
    const pick = (): string => pool[Math.floor(stage.random() * pool.length)] ?? '0';
    const cells: Cell[] = stage.chars().map((g) => textCell(g, pick()));
    for (const t of stage.targets) {
      if (t.kind === 'media') cells.push(mediaCell(t));
      else if (t.kind === 'block') cells.push(...blockCells(t, stage, pick));
    }
    for (const c of cells) c.due = stage.random() * 400;
    const glyphs = new Glyphs(stage.dpr);
    return {
      frame(t) {
        for (const c of cells) {
          if (!c.media) {
            if (c.f < 1) {
              c.f = (t - c.at) / IDLE_FLIP_MS;
              if (c.f >= 1) {
                c.f = 1;
                c.cur = c.next;
              }
            } else if (t > c.due) {
              c.next = pick();
              c.f = 0;
              c.at = t;
              c.due = t + 160 + stage.random() * 520;
              if (o.sound) click();
            }
          }
        }
        drawCells(stage, glyphs, cells, null);
      },
    };
  },

  reveal(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const { box } = stage;
    const cells: Cell[] = [];
    for (const g of stage.chars()) {
      const c = textCell(g, ' ');
      const plan = planFlips(g.text, o.charset, o.flips, stage.random);
      c.start = c.cur = plan.start;
      c.seq = plan.seq;
      cells.push(c);
    }
    for (const t of stage.targets) {
      if (t.kind !== 'media') continue;
      const c = mediaCell(t);
      c.seq = [IMAGE];
      cells.push(c);
    }
    const lineTops = Array.from(new Set(cells.map((c) => Math.round(c.y / 4)))).sort((a, b) => a - b);
    let end = 0;
    for (const c of cells) {
      const line = lineTops.indexOf(Math.round(c.y / 4));
      c.delay = ((c.x - box.x) / Math.max(1, box.w)) * 180 + line * 48 + stage.random() * 30 + (c.media ? 150 : 0);
      end = Math.max(end, c.delay + c.seq.length * o.flipMs);
    }
    const duration = end + 80;
    const image = cells.some((c) => c.media) ? stage.raster(true) : null;
    const glyphs = new Glyphs(stage.dpr);
    return {
      duration,
      frame(p) {
        const rt = p * duration;
        for (const c of cells) {
          const k = (rt - c.delay) / o.flipMs;
          if (k <= 0) {
            c.cur = c.start;
            c.f = 1;
          } else {
            const s = Math.floor(k);
            if (s >= c.seq.length) {
              c.cur = c.seq[c.seq.length - 1];
              c.f = 1;
            } else {
              c.cur = s === 0 ? c.start : c.seq[s - 1];
              c.next = c.seq[s];
              c.f = clamp(k - s);
              if (o.sound && s !== c.step) click();
              c.step = s;
            }
          }
        }
        drawCells(stage, glyphs, cells, image);
      },
    };
  },
});
