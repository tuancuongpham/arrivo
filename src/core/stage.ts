import { clearCtx, ctx2d, makeCanvas } from './canvas';
import { roundRectPath } from './geom';
import { createNoise } from './noise';
import { mulberry32 } from './random';
import { cssColorToRGBA, readTheme, rgba } from './theme';
import type { Glyph, Origin, Pixels, Rect, Stage, Target, Theme } from './types';

export interface StageInit {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Animate only these descendants instead of every text run and media element. */
  selector?: string;
  origin?: Origin;
  /** Last pointer position in viewport coordinates, for `origin: 'pointer'`. */
  pointer?: { x: number; y: number } | null;
  seed?: number;
}

/** Above this many device pixels the overlay drops towards 1× density. */
const MAX_CANVAS_PIXELS = 1_500_000;
/** `chars()` stops here; split-flap on whole paragraphs would be unreadable anyway. */
const MAX_CHARS = 600;
const MEDIA_TAGS = new Set(['IMG', 'CANVAS', 'VIDEO', 'SVG', 'PICTURE']);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT']);

interface FontInfo {
  font: string;
  color: string;
  transform: string;
  letterSpacing: string;
  ascent: number;
  descent: number;
}

let measureCtx: CanvasRenderingContext2D | null = null;
const metrics = (): CanvasRenderingContext2D => (measureCtx ??= ctx2d(makeCanvas(1, 1)));

function fontInfo(el: Element, cache: Map<Element, FontInfo>): FontInfo {
  const hit = cache.get(el);
  if (hit) return hit;
  const cs = getComputedStyle(el);
  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const m = metrics();
  m.font = font;
  const tm = m.measureText('Hg');
  const size = parseFloat(cs.fontSize) || 16;
  const info: FontInfo = {
    font,
    color: cs.color,
    transform: cs.textTransform,
    letterSpacing: cs.letterSpacing,
    ascent: tm.fontBoundingBoxAscent || tm.actualBoundingBoxAscent || size * 0.8,
    descent: tm.fontBoundingBoxDescent || tm.actualBoundingBoxDescent || size * 0.2,
  };
  cache.set(el, info);
  return info;
}

const baselineOf = (r: Rect, f: FontInfo): number => r.y + (r.h - f.ascent - f.descent) / 2 + f.ascent;

function transformText(s: string, transform: string, wordStart: boolean): string {
  if (transform === 'uppercase') return s.toUpperCase();
  if (transform === 'lowercase') return s.toLowerCase();
  if (transform === 'capitalize' && wordStart) return s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

function graphemes(s: string): { segment: string; index: number }[] {
  if (segmenter) return Array.from(segmenter.segment(s), (g) => ({ segment: g.segment, index: g.index }));
  const out: { segment: string; index: number }[] = [];
  let i = 0;
  for (const ch of s) {
    out.push({ segment: ch, index: i });
    i += ch.length;
  }
  return out;
}

function radiusOf(el: Element, r: Rect): number {
  const v = getComputedStyle(el).borderTopLeftRadius;
  const n = parseFloat(v) || 0;
  return v.endsWith('%') ? (n / 100) * Math.min(r.w, r.h) : n;
}

/** Join fragments that sit on one visual line, so a line made of several spans reads as one bar. */
function mergeLines(rects: Target[]): Target[] {
  const out: Target[] = [];
  rects.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const r of rects) {
    const host = out.find((o) => {
      const overlap = Math.min(o.y + o.h, r.y + r.h) - Math.max(o.y, r.y);
      const minH = Math.min(o.h, r.h);
      const gap = Math.max(r.x - (o.x + o.w), o.x - (r.x + r.w));
      return overlap >= minH * 0.6 && gap <= Math.max(6, minH * 0.5) && Math.max(o.h, r.h) <= minH * 1.6;
    });
    if (!host) {
      out.push({ ...r });
      continue;
    }
    const x0 = Math.min(host.x, r.x);
    const y0 = Math.min(host.y, r.y);
    host.w = Math.max(host.x + host.w, r.x + r.w) - x0;
    host.h = Math.max(host.y + host.h, r.y + r.h) - y0;
    host.x = x0;
    host.y = y0;
  }
  return out;
}

function collect(root: HTMLElement, canvas: HTMLCanvasElement, selector: string | undefined, ox: number, oy: number) {
  const targets: Target[] = [];
  const lines: Target[] = [];
  const texts: Text[] = [];
  const range = document.createRange();
  const rel = (r: DOMRect): Rect => ({ x: r.left - ox, y: r.top - oy, w: r.width, h: r.height });

  const addElement = (el: Element, kind: 'media' | 'block'): void => {
    const b = el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) return;
    const r = rel(b);
    targets.push({ ...r, kind, el, radius: radiusOf(el, r) });
  };

  const addText = (node: Text): void => {
    const s = node.data;
    const a = s.search(/\S/);
    if (a < 0) return;
    let b = s.length;
    while (b > a && /\s/.test(s[b - 1])) b--;
    range.setStart(node, a);
    range.setEnd(node, b);
    const el = node.parentElement ?? root;
    let any = false;
    for (const cr of Array.from(range.getClientRects())) {
      if (cr.width < 0.5 || cr.height < 0.5) continue;
      const r = rel(cr);
      lines.push({ ...r, kind: 'text', el, radius: Math.min(4, r.h / 3) });
      any = true;
    }
    if (any) texts.push(node);
  };

  const visit = (el: Element): boolean => {
    const mode = el.getAttribute('data-arrivo');
    if (mode === 'skip' || mode === 'static' || SKIP_TAGS.has(el.tagName)) return false;
    if (mode === 'block') {
      addElement(el, 'block');
      return false;
    }
    if (mode === 'media' || MEDIA_TAGS.has(el.tagName.toUpperCase())) {
      addElement(el, 'media');
      return false;
    }
    return true;
  };

  const walk = (node: Node): void => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child === canvas) continue;
      if (child.nodeType === Node.TEXT_NODE) addText(child as Text);
      else if (child.nodeType === Node.ELEMENT_NODE && visit(child as Element)) walk(child);
    }
  };

  if (selector) {
    for (const el of Array.from(root.querySelectorAll(selector))) if (visit(el)) walk(el);
  } else {
    walk(root);
  }
  targets.push(...mergeLines(lines));
  return { targets, texts };
}

const readableCache = new Map<string, boolean>();

/** Whether drawing `el` would taint a canvas (cross-origin media without CORS). */
function readable(el: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): boolean {
  const key = el instanceof HTMLCanvasElement ? '' : el.currentSrc || (el instanceof HTMLImageElement ? el.src : '');
  const hit = key ? readableCache.get(key) : undefined;
  if (hit !== undefined) return hit;
  let ok = true;
  try {
    const x = ctx2d(makeCanvas(1, 1), { willReadFrequently: true });
    x.drawImage(el, 0, 0, 1, 1);
    x.getImageData(0, 0, 1, 1);
  } catch {
    ok = false;
  }
  if (key) readableCache.set(key, ok);
  return ok;
}

function objectPosition(v: string): [number, number] {
  const f = (s?: string): number => {
    if (!s) return 0.5;
    if (s.endsWith('%')) return parseFloat(s) / 100;
    if (s === 'left' || s === 'top') return 0;
    if (s === 'right' || s === 'bottom') return 1;
    return 0.5;
  };
  const parts = v.split(/\s+/);
  return [f(parts[0]), f(parts[1])];
}

function drawFitted(x: CanvasRenderingContext2D, src: CanvasImageSource, iw: number, ih: number, t: Rect, cs: CSSStyleDeclaration): void {
  const [px, py] = objectPosition(cs.objectPosition);
  let sx = 0;
  let sy = 0;
  let sw = iw;
  let sh = ih;
  let dx = t.x;
  let dy = t.y;
  let dw = t.w;
  let dh = t.h;
  const fit = cs.objectFit;
  if (fit === 'cover') {
    const s = Math.max(t.w / iw, t.h / ih);
    sw = t.w / s;
    sh = t.h / s;
    sx = (iw - sw) * px;
    sy = (ih - sh) * py;
  } else if (fit === 'contain' || fit === 'scale-down' || fit === 'none') {
    let s = fit === 'none' ? 1 : Math.min(t.w / iw, t.h / ih);
    if (fit === 'scale-down') s = Math.min(1, s);
    dw = iw * s;
    dh = ih * s;
    dx = t.x + (t.w - dw) * px;
    dy = t.y + (t.h - dh) * py;
  }
  x.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawMedia(x: CanvasRenderingContext2D, t: Target, theme: Theme): void {
  x.save();
  x.beginPath();
  roundRectPath(x, t.x, t.y, t.w, t.h, t.radius);
  x.clip();
  const el = t.el instanceof HTMLPictureElement ? (t.el.querySelector('img') ?? t.el) : t.el;
  let drawn = false;
  try {
    if (el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0 && readable(el)) {
      drawFitted(x, el, el.naturalWidth, el.naturalHeight, t, getComputedStyle(el));
      drawn = true;
    } else if (el instanceof HTMLVideoElement && el.readyState >= 2 && readable(el)) {
      drawFitted(x, el, el.videoWidth, el.videoHeight, t, getComputedStyle(el));
      drawn = true;
    } else if (el instanceof HTMLCanvasElement && el.width > 0 && el.height > 0 && readable(el)) {
      x.drawImage(el, t.x, t.y, t.w, t.h);
      drawn = true;
    }
  } catch {
    drawn = false;
  }
  if (!drawn) {
    const bg = cssColorToRGBA(getComputedStyle(t.el).backgroundColor);
    x.fillStyle = bg && bg[3] > 0 ? rgba(bg) : rgba(theme.muted, 0.55);
    x.fillRect(t.x, t.y, t.w, t.h);
  }
  x.restore();
}

function resolveOrigin(o: Origin | undefined, pointer: StageInit['pointer'], ox: number, oy: number, w: number, h: number, box: Rect) {
  if (o && typeof o === 'object') return { x: o.x - ox, y: o.y - oy };
  if (o === 'top-left') return { x: box.x, y: box.y };
  if (o === 'pointer' && pointer) {
    const x = pointer.x - ox;
    const y = pointer.y - oy;
    if (x >= -w * 0.25 && x <= w * 1.25 && y >= -h * 0.25 && y <= h * 1.25) return { x, y };
  }
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

/** Measure `root` and size `canvas` over it. Cheap to call; every reveal measures afresh. */
export function createStage(init: StageInit): Stage {
  const { root, canvas } = init;
  const rb = root.getBoundingClientRect();
  const ox = rb.left + root.clientLeft;
  const oy = rb.top + root.clientTop;
  const width = Math.max(1, Math.round(root.clientWidth || rb.width));
  const height = Math.max(1, Math.round(root.clientHeight || rb.height));
  const native = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const dpr =
    width * height * native * native > MAX_CANVAS_PIXELS ? Math.max(1, Math.sqrt(MAX_CANVAS_PIXELS / (width * height))) : native;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = ctx2d(canvas);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const found = collect(root, canvas, init.selector, ox, oy);
  const targets = found.targets.length
    ? found.targets
    : [{ x: 0, y: 0, w: width, h: height, kind: 'block' as const, el: root, radius: 8 }];

  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const clip = new Path2D();
  for (const t of targets) {
    x0 = Math.min(x0, t.x);
    y0 = Math.min(y0, t.y);
    x1 = Math.max(x1, t.x + t.w);
    y1 = Math.max(y1, t.y + t.h);
    roundRectPath(clip, t.x, t.y, t.w, t.h, t.radius);
  }
  const box: Rect = { x: Math.floor(x0), y: Math.floor(y0), w: Math.ceil(x1) - Math.floor(x0), h: Math.ceil(y1) - Math.floor(y0) };
  const theme = readTheme(root, canvas);
  const seed = init.seed ?? 1;
  const random = mulberry32(seed * 7919 + 17);
  const noise = createNoise(seed);
  const origin = resolveOrigin(init.origin, init.pointer, ox, oy, width, height, box);
  const rel = (r: DOMRect): Rect => ({ x: r.left - ox, y: r.top - oy, w: r.width, h: r.height });

  let wordsMemo: Glyph[] | null = null;
  let charsMemo: Glyph[] | null = null;
  const rasters = new Map<boolean, HTMLCanvasElement>();
  const pixelMemo = new Map<string, Pixels>();

  const words = (): Glyph[] => {
    if (wordsMemo) return wordsMemo;
    const out: Glyph[] = [];
    const fonts = new Map<Element, FontInfo>();
    const range = document.createRange();
    for (const node of found.texts) {
      const f = fontInfo(node.parentElement ?? root, fonts);
      const re = /\S+/gu;
      let m: RegExpExecArray | null;
      while ((m = re.exec(node.data))) {
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        const rects = range.getClientRects();
        const tracking = f.letterSpacing === 'normal' ? undefined : f.letterSpacing;
        if (rects.length === 1) {
          const r = rel(rects[0]);
          out.push({ ...r, text: transformText(m[0], f.transform, true), font: f.font, color: f.color, baseline: baselineOf(r, f), tracking });
          continue;
        }
        for (const g of graphemes(m[0])) {
          range.setStart(node, m.index + g.index);
          range.setEnd(node, m.index + g.index + g.segment.length);
          const cr = range.getBoundingClientRect();
          if (cr.width <= 0) continue;
          const r = rel(cr);
          out.push({ ...r, text: transformText(g.segment, f.transform, g.index === 0), font: f.font, color: f.color, baseline: baselineOf(r, f), tracking });
        }
      }
    }
    return (wordsMemo = out);
  };

  const chars = (): Glyph[] => {
    if (charsMemo) return charsMemo;
    const out: Glyph[] = [];
    const fonts = new Map<Element, FontInfo>();
    const range = document.createRange();
    outer: for (const node of found.texts) {
      const f = fontInfo(node.parentElement ?? root, fonts);
      let prevSpace = true;
      for (const g of graphemes(node.data)) {
        const space = /^\s+$/.test(g.segment);
        if (!space) {
          range.setStart(node, g.index);
          range.setEnd(node, g.index + g.segment.length);
          const cr = range.getBoundingClientRect();
          if (cr.width > 0 && cr.height > 0) {
            const r = rel(cr);
            out.push({ ...r, text: transformText(g.segment, f.transform, prevSpace), font: f.font, color: f.color, baseline: baselineOf(r, f) });
            if (out.length >= MAX_CHARS) break outer;
          }
        }
        prevSpace = space;
      }
    }
    return (charsMemo = out);
  };

  const raster = (opaque: boolean): HTMLCanvasElement => {
    const hit = rasters.get(opaque);
    if (hit) return hit;
    const c = makeCanvas(canvas.width, canvas.height);
    const x = ctx2d(c, { willReadFrequently: true });
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (opaque) {
      x.fillStyle = rgba(theme.surface);
      x.fill(clip);
    }
    for (const t of targets) if (t.kind !== 'text') drawMedia(x, t, theme);
    x.textBaseline = 'alphabetic';
    x.textAlign = 'left';
    const tracked = 'letterSpacing' in x;
    for (const w of words()) {
      x.font = w.font;
      x.fillStyle = w.color;
      if (tracked) x.letterSpacing = w.tracking ?? '0px';
      x.fillText(w.text, w.x, w.baseline);
    }
    rasters.set(opaque, c);
    return c;
  };

  const pixels = (opaque: boolean, maxPixels = 250_000): Pixels => {
    const key = `${opaque}:${maxPixels}`;
    const hit = pixelMemo.get(key);
    if (hit) return hit;
    const scale = Math.min(1, Math.sqrt(maxPixels / (width * height)));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const x = ctx2d(makeCanvas(w, h), { willReadFrequently: true });
    x.drawImage(raster(opaque), 0, 0, w, h);
    let data: Uint8ClampedArray;
    try {
      data = x.getImageData(0, 0, w, h).data;
    } catch {
      data = new Uint8ClampedArray(w * h * 4);
    }
    const out: Pixels = { data, width: w, height: h, scale: w / width };
    pixelMemo.set(key, out);
    return out;
  };

  return {
    root,
    canvas,
    ctx,
    dpr,
    width,
    height,
    origin,
    targets,
    box,
    clip,
    theme,
    seed,
    random,
    noise: noise.value,
    fbm: noise.fbm,
    words,
    chars,
    raster,
    pixels,
    clear: () => clearCtx(ctx),
  };
}
