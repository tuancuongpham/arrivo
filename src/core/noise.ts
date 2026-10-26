import { mulberry32 } from './random';

export interface Noise {
  /** Smooth value noise in [0, 1]. */
  value(x: number, y: number): number;
  /** Three octaves of value noise in [0, 1]. */
  fbm(x: number, y: number): number;
}

const fade = (t: number): number => t * t * (3 - 2 * t);

export function createNoise(seed = 1): Noise {
  const rnd = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const hash = (a: number, b: number): number => perm[perm[a & 255] + (b & 255)] / 255;

  const value = (x: number, y: number): number => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = fade(x - xi);
    const v = fade(y - yi);
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };

  const fbm = (x: number, y: number): number =>
    value(x, y) * 0.6 + value(x * 2.1 + 5.3, y * 2.1 + 1.7) * 0.3 + value(x * 4.3 + 9.1, y * 4.3 + 3.3) * 0.1;

  return { value, fbm };
}
