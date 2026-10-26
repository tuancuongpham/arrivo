import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core/random';
import { buildSAT, quadNode, splitQuad } from '../../src/core/quadtree';
import { planFlips } from '../../src/effects/flap';
import { placePiece, type Board } from '../../src/effects/tetris';

describe('split-flap planning', () => {
  const charset = ' 0123456789.,:+-%ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  it('always lands on the target', () => {
    const r = mulberry32(1);
    for (const target of ['0', '7', '%', 'Z', 'đ', '₫', ' ']) {
      for (let i = 0; i < 30; i++) {
        const plan = planFlips(target, charset, 9, r);
        expect(plan.seq.at(-1)).toBe(target);
        expect(plan.seq.length).toBeLessThanOrEqual(9);
        expect(plan.seq.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('counts up through the charset in order', () => {
    const plan = planFlips('7', charset, 9, mulberry32(3));
    const faces = Array.from(charset);
    const path = [plan.start, ...plan.seq].map((c) => faces.indexOf(c));
    for (let i = 1; i < path.length; i++) expect((path[i] - path[i - 1] + faces.length) % faces.length).toBe(1);
  });
});

describe('quadtree mosaic', () => {
  it('scores a block with an edge above a flat one, and splits it into flat halves', () => {
    const w = 8;
    const h = 8;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = x < 4 ? 0 : 255;
        data.set([v, v, v, 255], (y * w + x) * 4);
      }
    }
    const sat = buildSAT(data, w, h);
    const edge = quadNode(sat, 0, 0, 8, 8);
    const flat = quadNode(sat, 0, 0, 4, 4);
    expect(edge.e).toBeGreaterThan(flat.e);
    expect(flat.e).toBe(0);
    const kids = splitQuad(sat, edge);
    expect(kids).toHaveLength(4);
    for (const k of kids) expect(k.e).toBe(0);
    expect(kids.reduce((s, k) => s + k.w * k.h, 0)).toBe(64);
  });
});

describe('tetris bot', () => {
  it('drops a piece onto the floor of an empty well', () => {
    const b: Board = { cols: 10, rows: 8, cell: 16, x0: 0, y0: 0, cells: new Uint8Array(80) };
    for (let piece = 0; piece < 7; piece++) {
      const place = placePiece(b, piece);
      expect(place).not.toBeNull();
      if (!place) continue;
      const bottom = Math.max(...place.shape.map(([, y]) => y)) + place.y;
      expect(bottom).toBe(b.rows - 1);
    }
  });

  it('gives up when the well is full', () => {
    const b: Board = { cols: 6, rows: 4, cell: 16, x0: 0, y0: 0, cells: new Uint8Array(24).fill(1) };
    expect(placePiece(b, 0)).toBeNull();
  });
});
