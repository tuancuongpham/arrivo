import { describe, expect, it } from 'vitest';
import { mix, parseColor } from '../../src/core/theme';
import type { RGBA } from '../../src/core/types';

const near = (a: RGBA | null, b: RGBA, tol = 2): void => {
  expect(a).not.toBeNull();
  if (!a) return;
  for (let i = 0; i < 4; i++) expect(Math.abs(a[i] - b[i])).toBeLessThanOrEqual(tol);
};

describe('parseColor', () => {
  it('reads hex in all lengths', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255, 255]);
    expect(parseColor('#112233')).toEqual([17, 34, 51, 255]);
    expect(parseColor('#11223380')).toEqual([17, 34, 51, 128]);
    expect(parseColor('#f008')).toEqual([255, 0, 0, 136]);
  });

  it('reads rgb() in legacy and modern syntax', () => {
    expect(parseColor('rgb(1, 2, 3)')).toEqual([1, 2, 3, 255]);
    expect(parseColor('rgba(1, 2, 3, 0.5)')).toEqual([1, 2, 3, 128]);
    expect(parseColor('rgb(1 2 3 / 50%)')).toEqual([1, 2, 3, 128]);
    expect(parseColor('rgb(100% 0% 0%)')).toEqual([255, 0, 0, 255]);
  });

  it('reads hsl()', () => {
    near(parseColor('hsl(0, 100%, 50%)'), [255, 0, 0, 255]);
    near(parseColor('hsl(120deg 100% 25%)'), [0, 128, 0, 255]);
  });

  it('reads color(srgb …) as computed styles serialise it', () => {
    near(parseColor('color(srgb 1 0 0)'), [255, 0, 0, 255]);
    near(parseColor('color(srgb 0 0.5 1 / 0.25)'), [0, 128, 255, 64]);
  });

  it('converts oklch() and oklab() to sRGB', () => {
    near(parseColor('oklch(0.627955 0.257683 29.2339)'), [255, 0, 0, 255]);
    near(parseColor('oklch(1 0 0)'), [255, 255, 255, 255]);
    near(parseColor('oklch(0 0 0)'), [0, 0, 0, 255]);
    near(parseColor('oklch(62.8% 0.2577 29.23deg / 50%)'), [255, 0, 0, 128]);
    near(parseColor('oklab(0.519975 -0.140305 0.107676)'), [0, 128, 0, 255]);
  });

  it('handles transparent and rejects nonsense', () => {
    expect(parseColor('transparent')).toEqual([0, 0, 0, 0]);
    expect(parseColor('not-a-colour')).toBeNull();
    expect(parseColor('#12')).toBeNull();
    expect(parseColor('')).toBeNull();
  });
});

describe('mix', () => {
  it('interpolates every channel', () => {
    expect(mix([0, 0, 0, 0], [255, 255, 255, 255], 0.5)).toEqual([128, 128, 128, 128]);
  });
});
