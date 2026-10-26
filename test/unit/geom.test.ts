import { describe, expect, it } from 'vitest';
import { MaxHeap, pack, xy2d } from '../../src/core/geom';

describe('xy2d', () => {
  it('maps a 32×32 grid onto every curve index exactly once', () => {
    const seen = new Set<number>();
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) seen.add(xy2d(32, x, y));
    expect(seen.size).toBe(1024);
    expect(Math.min(...seen)).toBe(0);
    expect(Math.max(...seen)).toBe(1023);
  });

  it('steps between neighbouring cells along the curve', () => {
    const at = new Map<number, [number, number]>();
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) at.set(xy2d(16, x, y), [x, y]);
    for (let d = 1; d < 256; d++) {
      const [ax, ay] = at.get(d - 1) ?? [0, 0];
      const [bx, by] = at.get(d) ?? [0, 0];
      expect(Math.abs(ax - bx) + Math.abs(ay - by)).toBe(1);
    }
  });
});

describe('MaxHeap', () => {
  it('pops in descending order', () => {
    const heap = new MaxHeap<{ e: number }>();
    const values = [5, 1, 9, 3, 7, 7, 0, 12, 4];
    for (const e of values) heap.push({ e });
    const out: number[] = [];
    while (heap.size) out.push(heap.pop()?.e ?? -1);
    expect(out).toEqual([...values].sort((a, b) => b - a));
  });
});

describe('pack', () => {
  it('lays bytes out as RGBA in little-endian memory', () => {
    const view = new Uint32Array([pack(1, 2, 3, 4)]);
    expect(Array.from(new Uint8Array(view.buffer))).toEqual([1, 2, 3, 4]);
  });
});
