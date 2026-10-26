import { clamp, fillRoundRect } from '../core/geom';
import { rgba } from '../core/theme';
import { defineEffect, type Effect, type Stage } from '../core/types';
import { drawGhosts } from './util';

export interface TetrisOptions {
  /** Target cell size in CSS pixels. */
  cell: number;
  /** Block colours. */
  palette: string[];
  /** Milliseconds per row while a piece falls. */
  dropMs: number;
}

const DEFAULTS: TetrisOptions = {
  cell: 16,
  palette: ['#5DCAA5', '#7F77DD', '#F0997B', '#EF9F27', '#85B7EB', '#ED93B1', '#97C459'],
  dropMs: 55,
};

type Shape = [number, number][];

const PIECES: Shape[] = [
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[2, 0], [0, 1], [1, 1], [2, 1]],
];

function normalise(s: Shape): Shape {
  const mx = Math.min(...s.map((c) => c[0]));
  const my = Math.min(...s.map((c) => c[1]));
  return s.map(([x, y]) => [x - mx, y - my] as [number, number]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

const ROTATIONS: Shape[][] = PIECES.map((p) => {
  const out: Shape[] = [];
  let s = p;
  for (let i = 0; i < 4; i++) {
    const n = normalise(s);
    if (!out.some((o) => JSON.stringify(o) === JSON.stringify(n))) out.push(n);
    s = s.map(([x, y]) => [y, -x] as [number, number]);
  }
  return out;
});

export interface Board {
  cols: number;
  rows: number;
  cell: number;
  x0: number;
  y0: number;
  /** 0 = empty, otherwise 1-based palette index. */
  cells: Uint8Array;
}

function makeBoard(stage: Stage, o: TetrisOptions): Board {
  const { box } = stage;
  const cols = Math.round(clamp(box.w / o.cell, 6, 48));
  const cell = box.w / cols;
  const rows = Math.max(3, Math.floor(box.h / cell));
  return { cols, rows, cell, x0: box.x, y0: box.y + box.h - rows * cell, cells: new Uint8Array(cols * rows) };
}

const width = (s: Shape): number => Math.max(...s.map((c) => c[0])) + 1;
const height = (s: Shape): number => Math.max(...s.map((c) => c[1])) + 1;

function fits(b: Board, s: Shape, x: number, y: number): boolean {
  for (const [cx, cy] of s) {
    const X = x + cx;
    const Y = y + cy;
    if (X < 0 || X >= b.cols || Y >= b.rows) return false;
    if (Y >= 0 && b.cells[Y * b.cols + X]) return false;
  }
  return true;
}

/** Score a board the way simple Tetris bots do: low, flat, few holes, many lines. */
function score(b: Board): number {
  let aggregate = 0;
  let holes = 0;
  let bump = 0;
  let lines = 0;
  let prev = -1;
  for (let x = 0; x < b.cols; x++) {
    let h = 0;
    let seen = false;
    for (let y = 0; y < b.rows; y++) {
      const filled = b.cells[y * b.cols + x] !== 0;
      if (filled && !seen) {
        seen = true;
        h = b.rows - y;
      } else if (!filled && seen) holes++;
    }
    aggregate += h;
    if (prev >= 0) bump += Math.abs(h - prev);
    prev = h;
  }
  for (let y = 0; y < b.rows; y++) {
    let full = true;
    for (let x = 0; x < b.cols && full; x++) full = b.cells[y * b.cols + x] !== 0;
    if (full) lines++;
  }
  return -0.51 * aggregate + 0.76 * lines - 0.36 * holes - 0.18 * bump;
}

/** Best rotation and column for a piece, with the row it lands on. */
export function placePiece(b: Board, piece: number): { shape: Shape; x: number; y: number } | null {
  let best: { shape: Shape; x: number; y: number } | null = null;
  let bestScore = -Infinity;
  for (const shape of ROTATIONS[piece]) {
    for (let x = 0; x + width(shape) <= b.cols; x++) {
      if (!fits(b, shape, x, 0)) continue;
      let y = 0;
      while (fits(b, shape, x, y + 1)) y++;
      for (const [cx, cy] of shape) b.cells[(y + cy) * b.cols + x + cx] = 255;
      const s = score(b);
      for (const [cx, cy] of shape) b.cells[(y + cy) * b.cols + x + cx] = 0;
      if (s > bestScore) {
        bestScore = s;
        best = { shape, x, y };
      }
    }
  }
  return best;
}

function drawBlock(stage: Stage, b: Board, x: number, y: number, colour: string, scale = 1): void {
  const s = b.cell * scale;
  const cx = b.x0 + (x + 0.5) * b.cell;
  const cy = b.y0 + (y + 0.5) * b.cell;
  stage.ctx.fillStyle = colour;
  fillRoundRect(stage.ctx, cx - s / 2 + 1, cy - s / 2 + 1, s - 2, s - 2, Math.min(3, s / 4));
}

/** A tiny game of Tetris plays itself in the card; the reveal fills the well and clears it line by line. */
export const tetris: Effect<TetrisOptions, Board> = defineEffect({
  name: 'tetris',
  show: 'start',
  duration: 1700,
  minIdle: 1000,
  css: '.arrivo[data-arrivo-effect="tetris"] .arrivo-sk-line,.arrivo[data-arrivo-effect="tetris"] .arrivo-sk-block{background:repeating-linear-gradient(90deg,color-mix(in srgb,currentColor 14%,transparent) 0 .9em,transparent .9em 1em)}',

  idle(stage, options) {
    const o = { ...DEFAULTS, ...options };
    const b = makeBoard(stage, o);
    const colours = o.palette.map((c) => c);
    let bag: number[] = [];
    let piece: { shape: Shape; x: number; y: number; colour: number; t0: number } | null = null;
    let flashRows: number[] = [];
    let flashUntil = 0;

    const next = (t: number): void => {
      if (!bag.length) bag = [0, 1, 2, 3, 4, 5, 6].sort(() => stage.random() - 0.5);
      const kind = bag.pop() ?? 0;
      const place = placePiece(b, kind);
      if (!place) {
        b.cells.fill(0);
        piece = null;
        return;
      }
      piece = { ...place, colour: 1 + (kind % colours.length), t0: t };
    };

    return {
      frame(t) {
        drawGhosts(stage, 0.12);
        if (flashRows.length && t >= flashUntil) {
          const keep: number[] = [];
          for (let y = 0; y < b.rows; y++) if (!flashRows.includes(y)) keep.push(y);
          const rows = keep.map((y) => b.cells.slice(y * b.cols, (y + 1) * b.cols));
          b.cells.fill(0);
          rows.forEach((row, i) => b.cells.set(row, (b.rows - rows.length + i) * b.cols));
          flashRows = [];
        }
        if (!piece && !flashRows.length) next(t);
        if (piece) {
          const y = -height(piece.shape) + (t - piece.t0) / o.dropMs;
          if (y >= piece.y) {
            for (const [cx, cy] of piece.shape) b.cells[(piece.y + cy) * b.cols + piece.x + cx] = piece.colour;
            piece = null;
            for (let r = 0; r < b.rows; r++) {
              let full = true;
              for (let x = 0; x < b.cols && full; x++) full = b.cells[r * b.cols + x] !== 0;
              if (full) flashRows.push(r);
            }
            if (flashRows.length) flashUntil = t + 140;
          } else {
            const colour = colours[(piece.colour - 1) % colours.length];
            for (const [cx, cy] of piece.shape) drawBlock(stage, b, piece.x + cx, y + cy, colour);
          }
        }
        for (let r = 0; r < b.rows; r++) {
          for (let x = 0; x < b.cols; x++) {
            const v = b.cells[r * b.cols + x];
            if (v) drawBlock(stage, b, x, r, colours[(v - 1) % colours.length]);
          }
        }
        if (flashRows.length) {
          stage.ctx.fillStyle = 'rgba(255,255,255,.7)';
          for (const r of flashRows) stage.ctx.fillRect(b.x0, b.y0 + r * b.cell, b.cols * b.cell, b.cell);
        }
      },
      handoff: () => b,
    };
  },

  reveal(stage, options, from) {
    const o = { ...DEFAULTS, ...options };
    const b = makeBoard(stage, o);
    if (from && from.cols === b.cols && from.rows === b.rows) b.cells.set(from.cells);
    const colours = o.palette;
    const rain: { x: number; y: number; at: number; colour: string }[] = [];
    for (let y = 0; y < b.rows; y++) {
      for (let x = 0; x < b.cols; x++) {
        if (b.cells[y * b.cols + x]) continue;
        const at = 0.06 + 0.3 * ((x / b.cols) * 0.45 + ((b.rows - 1 - y) / b.rows) * 0.45 + stage.random() * 0.1);
        rain.push({ x, y, at, colour: colours[Math.floor(stage.random() * colours.length)] });
      }
    }
    const clearAt = (row: number): number => 0.45 + 0.5 * (row / b.rows);
    const surface = rgba(stage.theme.surface);
    const { ctx, box } = stage;
    const FALL = 0.1;
    return {
      frame(p) {
        ctx.fillStyle = surface;
        for (let r = 0; r < b.rows; r++) {
          if (p >= clearAt(r)) continue;
          const top = r === 0 ? box.y : b.y0 + r * b.cell;
          ctx.fillRect(b.x0, top, b.cols * b.cell, b.y0 + (r + 1) * b.cell - top);
        }
        const shrink = (r: number): number => 1 - clamp((p - clearAt(r)) / 0.06);
        for (let r = 0; r < b.rows; r++) {
          const s = shrink(r);
          if (s <= 0) continue;
          for (let x = 0; x < b.cols; x++) {
            const v = b.cells[r * b.cols + x];
            if (v) drawBlock(stage, b, x, r, colours[(v - 1) % colours.length], s);
          }
        }
        for (const d of rain) {
          if (p < d.at - FALL) continue;
          const s = shrink(d.y);
          if (s <= 0) continue;
          const k = clamp((p - (d.at - FALL)) / FALL);
          drawBlock(stage, b, d.x, -1 + (d.y + 1) * k * k, d.colour, s);
        }
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        for (let r = 0; r < b.rows; r++) {
          const c = clearAt(r);
          if (p >= c - 0.05 && p < c) ctx.fillRect(b.x0, b.y0 + r * b.cell, b.cols * b.cell, b.cell);
        }
      },
    };
  },
});
