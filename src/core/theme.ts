import type { RGBA, Theme } from './types';

const DEFAULT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

/** `rgba()` string for canvas fills; `alpha` multiplies the colour's own alpha. */
export function rgba(c: RGBA, alpha = 1): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${((c[3] / 255) * alpha).toFixed(3)})`;
}

export function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    Math.round(a[3] + (b[3] - a[3]) * t),
  ];
}

export function luma(c: RGBA): number {
  return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
}

const clamp255 = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));

function toGamma(c: number): number {
  const v = Math.max(0, Math.min(1, c));
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
}

function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    clamp255(toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) * 255),
    clamp255(toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) * 255),
    clamp255(toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) * 255),
  ];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number): number => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [clamp255(f(0) * 255), clamp255(f(8) * 255), clamp255(f(4) * 255)];
}

/** Parse a number or percentage; `percentOf` is what 100% maps to. */
function num(token: string | undefined, percentOf: number): number {
  if (!token || token === 'none') return 0;
  if (token.endsWith('%')) return (parseFloat(token) / 100) * percentOf;
  return parseFloat(token);
}

function hue(token: string | undefined): number {
  if (!token || token === 'none') return 0;
  const v = parseFloat(token);
  if (token.endsWith('turn')) return v * 360;
  if (token.endsWith('rad')) return (v * 180) / Math.PI;
  if (token.endsWith('grad')) return v * 0.9;
  return v;
}

/**
 * Parse the colour formats browsers serialise computed styles into: hex, `rgb()`, `hsl()`,
 * `color(srgb …)`, `oklab()` and `oklch()`. Returns null for anything else.
 */
export function parseColor(input: string): RGBA | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (s === 'transparent') return [0, 0, 0, 0];
  if (s[0] === '#') {
    const h = s.slice(1);
    if (!/^[0-9a-f]+$/.test(h)) return null;
    if (h.length === 3 || h.length === 4) {
      const v = h.split('').map((c) => parseInt(c + c, 16));
      return [v[0], v[1], v[2], h.length === 4 ? v[3] : 255];
    }
    if (h.length === 6 || h.length === 8) {
      const v = [0, 2, 4, 6].map((i) => parseInt(h.slice(i, i + 2), 16));
      return [v[0], v[1], v[2], h.length === 8 ? v[3] : 255];
    }
    return null;
  }
  const m = /^([a-z-]+)\((.*)\)$/.exec(s);
  if (!m) return null;
  const fn = m[1];
  let parts = m[2].replace(/,/g, ' ').replace(/\//g, ' / ').trim().split(/\s+/);
  let alpha = 1;
  const slash = parts.indexOf('/');
  if (slash >= 0) {
    alpha = num(parts[slash + 1], 1);
    parts = parts.slice(0, slash);
  }
  const a255 = (): number => clamp255(alpha * 255);
  switch (fn) {
    case 'rgb':
    case 'rgba': {
      if (parts.length === 4) alpha = num(parts[3], 1);
      return [clamp255(num(parts[0], 255)), clamp255(num(parts[1], 255)), clamp255(num(parts[2], 255)), a255()];
    }
    case 'hsl':
    case 'hsla': {
      if (parts.length === 4) alpha = num(parts[3], 1);
      const sat = parts[1]?.endsWith('%') ? num(parts[1], 1) : num(parts[1], 1) / 100;
      const lig = parts[2]?.endsWith('%') ? num(parts[2], 1) : num(parts[2], 1) / 100;
      const [r, g, b] = hslToRgb(hue(parts[0]), sat, lig);
      return [r, g, b, a255()];
    }
    case 'color': {
      const space = parts[0];
      const ch = [num(parts[1], 1), num(parts[2], 1), num(parts[3], 1)];
      if (space === 'srgb' || space === 'display-p3' || space === 'a98-rgb') {
        return [clamp255(ch[0] * 255), clamp255(ch[1] * 255), clamp255(ch[2] * 255), a255()];
      }
      if (space === 'srgb-linear') {
        return [clamp255(toGamma(ch[0]) * 255), clamp255(toGamma(ch[1]) * 255), clamp255(toGamma(ch[2]) * 255), a255()];
      }
      return null;
    }
    case 'oklab': {
      const [r, g, b] = oklabToRgb(num(parts[0], 1), num(parts[1], 0.4), num(parts[2], 0.4));
      return [r, g, b, a255()];
    }
    case 'oklch': {
      const L = num(parts[0], 1);
      const C = num(parts[1], 0.4);
      const H = (hue(parts[2]) * Math.PI) / 180;
      const [r, g, b] = oklabToRgb(L, C * Math.cos(H), C * Math.sin(H));
      return [r, g, b, a255()];
    }
    default:
      return null;
  }
}

let probeCtx: CanvasRenderingContext2D | null | undefined;

/** Let the browser's canvas parser handle formats `parseColor` doesn't (lab, lch, …). */
function parseWithCanvas(css: string): RGBA | null {
  if (typeof document === 'undefined') return null;
  if (probeCtx === undefined) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    probeCtx = c.getContext('2d', { willReadFrequently: true });
  }
  if (!probeCtx) return null;
  const sentinel = '#010203';
  probeCtx.fillStyle = sentinel;
  probeCtx.fillStyle = css;
  if (probeCtx.fillStyle === sentinel && css.trim().toLowerCase() !== sentinel) return null;
  probeCtx.clearRect(0, 0, 1, 1);
  probeCtx.fillRect(0, 0, 1, 1);
  try {
    const d = probeCtx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
  } catch {
    return null;
  }
}

export function cssColorToRGBA(css: string): RGBA | null {
  return parseColor(css) ?? parseWithCanvas(css);
}

/** First mostly-opaque background colour at or above `el`. */
function backgroundOf(el: Element | null): RGBA | null {
  for (let node = el; node; node = node.parentElement) {
    const c = cssColorToRGBA(getComputedStyle(node).backgroundColor);
    if (c && c[3] >= 128) return [c[0], c[1], c[2], 255];
  }
  return null;
}

/**
 * Resolve the colours effects paint with. Custom properties `--arrivo-ink`, `--arrivo-surface`,
 * `--arrivo-muted`, `--arrivo-accent`, `--arrivo-danger`, `--arrivo-cell` and `--arrivo-font-mono` win;
 * otherwise ink follows `color` and the surface is the nearest opaque background.
 * `host` must be a connected element inside `root`, used as a throwaway probe parent.
 */
export function readTheme(root: HTMLElement, host: Element = root): Theme {
  const cs = getComputedStyle(root);
  const probe = document.createElement('span');
  host.appendChild(probe);
  const resolve = (value: string): RGBA | null => {
    if (!value) return null;
    probe.style.color = '';
    probe.style.color = value;
    if (!probe.style.color) return cssColorToRGBA(value);
    return cssColorToRGBA(getComputedStyle(probe).color);
  };
  const prop = (name: string): string => cs.getPropertyValue(name).trim();
  try {
    const ink = resolve(prop('--arrivo-ink')) ?? cssColorToRGBA(cs.color) ?? [26, 26, 26, 255];
    const declared = resolve(prop('--arrivo-surface'));
    const surface =
      (declared && declared[3] >= 128 ? declared : null) ??
      backgroundOf(root) ??
      (luma(ink) > 0.5 ? [20, 20, 19, 255] : [255, 255, 255, 255]);
    surface[3] = 255;
    const muted = resolve(prop('--arrivo-muted')) ?? mix(ink, surface, 0.6);
    const accent = resolve(prop('--arrivo-accent')) ?? [55, 138, 221, 255];
    const danger = resolve(prop('--arrivo-danger')) ?? [226, 75, 74, 255];
    const cell = resolve(prop('--arrivo-cell')) ?? [ink[0], ink[1], ink[2], 20];
    const mono = prop('--arrivo-font-mono') || DEFAULT_MONO;
    return { ink, surface, muted, accent, danger, cell, mono, dark: luma(surface) < 0.45 };
  } finally {
    probe.remove();
  }
}
