import { describe, expect, it } from 'vitest';
import { createNoise } from '../../src/core/noise';
import { mulberry32 } from '../../src/core/random';
import { buildThreshold, THRESHOLD_KINDS, type ThresholdKind } from '../../src/core/threshold';

const W = 240;
const H = 150;

function grid(kind: ThresholdKind, origin = { x: W / 2, y: H / 2 }) {
  const noise = createNoise(5);
  return buildThreshold({ kind, width: W, height: H, origin, fbm: noise.fbm, random: mulberry32(5) });
}

describe('threshold maps', () => {
  it.each(THRESHOLD_KINDS)('%s covers the stage with values normalised to [0, 1]', (kind) => {
    const g = grid(kind);
    expect(g.values.length).toBe(g.cols * g.rows);
    expect(g.cols * g.cell).toBeGreaterThanOrEqual(W);
    expect(g.rows * g.cell).toBeGreaterThanOrEqual(H);
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of g.values) {
      expect(Number.isFinite(v)).toBe(true);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    expect(lo).toBe(0);
    expect(hi).toBeCloseTo(1, 5);
  });

  it('bleeds ink outward from the origin', () => {
    const g = grid('ink', { x: 0, y: 0 });
    const at = (i: number, j: number): number => g.values[j * g.cols + i];
    expect(at(1, 1)).toBeLessThan(at(g.cols - 2, g.rows - 2));
  });

  it('prints a receipt from the top line down', () => {
    const g = grid('receipt');
    const row = (j: number): number => {
      let s = 0;
      for (let i = 0; i < g.cols; i++) s += g.values[j * g.cols + i];
      return s / g.cols;
    }
    expect(row(0)).toBeLessThan(row(g.rows - 1));
  });

  it('sweeps the radar clockwise from twelve o’clock', () => {
    const g = grid('radar');
    const cx = Math.floor(g.cols / 2);
    const cy = Math.floor(g.rows / 2);
    const north = g.values[2 * g.cols + cx];
    const east = g.values[cy * g.cols + g.cols - 3];
    const south = g.values[(g.rows - 3) * g.cols + cx];
    expect(north).toBeLessThan(east);
    expect(east).toBeLessThan(south);
  });

  it('uses coarser cells on large areas', () => {
    const noise = createNoise(1);
    const big = buildThreshold({ kind: 'ink', width: 1600, height: 1000, origin: { x: 0, y: 0 }, fbm: noise.fbm, random: mulberry32(1) });
    expect(big.cols * big.rows).toBeLessThanOrEqual(45_000);
  });
});
