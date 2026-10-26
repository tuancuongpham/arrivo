export const clamp = (v: number, lo = 0, hi = 1): number => (v < lo ? lo : v > hi ? hi : v);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const easeOut = (t: number): number => 1 - (1 - t) ** 3;

export const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/** Pack RGBA bytes into one pixel of a little-endian `Uint32Array` view over `ImageData`. */
export const pack = (r: number, g: number, b: number, a: number): number =>
  ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;

/** Integer hash to [0, 1), stable across runs. */
export function hash01(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** Add a rounded rectangle subpath, falling back to a plain one where `roundRect` is missing. */
export function roundRectPath(c: CanvasPath, x: number, y: number, w: number, h: number, r: number): void {
  w = Math.max(0, w);
  h = Math.max(0, h);
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (typeof c.roundRect === 'function') c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
}

export function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

/** Distance along a Hilbert curve of side `n` (a power of two) for cell (x, y). */
export function xy2d(n: number, x: number, y: number): number {
  let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = x & s ? 1 : 0;
    const ry = y & s ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (!ry) {
      if (rx) {
        x = n - 1 - x;
        y = n - 1 - y;
      }
      const t = x;
      x = y;
      y = t;
    }
  }
  return d;
}

/** Binary max-heap keyed on `e`. */
export class MaxHeap<T extends { e: number }> {
  private a: T[] = [];

  get size(): number {
    return this.a.length;
  }

  peek(): T | undefined {
    return this.a[0];
  }

  push(n: T): void {
    const a = this.a;
    a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].e >= a[i].e) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }

  pop(): T | undefined {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length && last) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].e > a[m].e) m = l;
        if (r < a.length && a[r].e > a[m].e) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}
