import { pack } from './geom';

/** Summed-area tables of R, G, B and the summed squares, for O(1) block mean and variance. */
export interface SAT {
  w: number;
  h: number;
  r: Float64Array;
  g: Float64Array;
  b: Float64Array;
  q: Float64Array;
}

export function buildSAT(data: Uint8ClampedArray, w: number, h: number): SAT {
  const w1 = w + 1;
  const n = w1 * (h + 1);
  const r = new Float64Array(n);
  const g = new Float64Array(n);
  const b = new Float64Array(n);
  const q = new Float64Array(n);
  for (let y = 0; y < h; y++) {
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let sq = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const pr = data[i];
      const pg = data[i + 1];
      const pb = data[i + 2];
      sr += pr;
      sg += pg;
      sb += pb;
      sq += pr * pr + pg * pg + pb * pb;
      const k = (y + 1) * w1 + x + 1;
      r[k] = r[k - w1] + sr;
      g[k] = g[k - w1] + sg;
      b[k] = b[k - w1] + sb;
      q[k] = q[k - w1] + sq;
    }
  }
  return { w, h, r, g, b, q };
}

export interface QuadNode {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Mean colour, packed for a `Uint32Array` pixel view. */
  color: number;
  /** Sum of squared colour error: how much detail splitting this block would recover. */
  e: number;
}

export function quadNode(s: SAT, x: number, y: number, w: number, h: number): QuadNode {
  const w1 = s.w + 1;
  const a = y * w1 + x;
  const b = a + w;
  const c = (y + h) * w1 + x;
  const d = c + w;
  const n = w * h;
  const sum = (t: Float64Array): number => (t[d] - t[b] - t[c] + t[a]) / n;
  const r = sum(s.r);
  const g = sum(s.g);
  const bl = sum(s.b);
  const e = w > 1 || h > 1 ? Math.max(0, sum(s.q) - r * r - g * g - bl * bl) * n : 0;
  return { x, y, w, h, color: pack(r | 0, g | 0, bl | 0, 255), e };
}

/** Split a block into up to four children (edges of odd-sized blocks stay intact). */
export function splitQuad(s: SAT, n: QuadNode): QuadNode[] {
  const hw = Math.ceil(n.w / 2);
  const hh = Math.ceil(n.h / 2);
  const out: QuadNode[] = [];
  const parts: [number, number, number, number][] = [
    [n.x, n.y, hw, hh],
    [n.x + hw, n.y, n.w - hw, hh],
    [n.x, n.y + hh, hw, n.h - hh],
    [n.x + hw, n.y + hh, n.w - hw, n.h - hh],
  ];
  for (const [x, y, w, h] of parts) if (w > 0 && h > 0) out.push(quadNode(s, x, y, w, h));
  return out;
}
