import { describe, expect, it } from 'vitest';
import { createNoise } from '../../src/core/noise';
import { mulberry32 } from '../../src/core/random';

describe('seeded randomness', () => {
  it('repeats a sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('stays in [0, 1)', () => {
    const r = mulberry32(9);
    for (let i = 0; i < 10_000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('gives the same noise field for the same seed', () => {
    const a = createNoise(7);
    const b = createNoise(7);
    for (let i = 0; i < 200; i++) expect(a.fbm(i * 0.37, i * 0.11)).toBe(b.fbm(i * 0.37, i * 0.11));
  });

  it('gives different fields for different seeds', () => {
    const a = createNoise(1);
    const b = createNoise(2);
    let differ = 0;
    for (let i = 0; i < 200; i++) if (a.value(i * 0.53, i * 0.29) !== b.value(i * 0.53, i * 0.29)) differ++;
    expect(differ).toBeGreaterThan(150);
  });

  it('keeps value noise and fbm within [0, 1]', () => {
    const n = createNoise(3);
    for (let i = 0; i < 5000; i++) {
      const x = (i % 97) * 0.173;
      const y = Math.floor(i / 97) * 0.211;
      for (const v of [n.value(x, y), n.fbm(x, y)]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
