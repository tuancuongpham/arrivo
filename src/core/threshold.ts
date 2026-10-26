import { ctx2d, makeCanvas, pixelBuffer, type PixelBuffer } from './canvas';
import { clamp, pack, xy2d } from './geom';
import { rgba } from './theme';
import type { RGBA, Stage, Theme } from './types';

/**
 * A threshold map gives every cell a value in [0, 1]; a cell is uncovered once reveal
 * progress passes its value. Swapping the map function swaps the whole look of a reveal.
 */
export type ThresholdKind = 'ink' | 'radar' | 'ripple' | 'hilbert' | 'bayer' | 'voronoi' | 'receipt' | 'dissolve';

export const THRESHOLD_KINDS: readonly ThresholdKind[] = ['ink', 'radar', 'ripple', 'hilbert', 'bayer', 'voronoi', 'receipt', 'dissolve'];

export interface ThresholdGrid {
  kind: ThresholdKind;
  cols: number;
  rows: number;
  /** Cell size in CSS pixels. */
  cell: number;
  values: Float32Array;
}

export interface ThresholdInput {
  kind: ThresholdKind;
  width: number;
  height: number;
  origin: { x: number; y: number };
  fbm(x: number, y: number): number;
  random(): number;
  cell?: number;
}

const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3,
  35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

const DEFAULT_CELL: Record<ThresholdKind, number> = {
  ink: 3,
  radar: 3,
  ripple: 3,
  hilbert: 3,
  bayer: 4,
  voronoi: 3,
  receipt: 3,
  dissolve: 4,
};

export function buildThreshold(input: ThresholdInput): ThresholdGrid {
  const { kind, width, height, origin } = input;
  // Coarser cells on big areas keep the per-frame mask pass around 40k cells.
  const cell = input.cell ?? Math.max(DEFAULT_CELL[kind], Math.sqrt((width * height) / 40_000));
  const cols = Math.max(1, Math.ceil(width / cell));
  const rows = Math.max(1, Math.ceil(height / cell));
  const values = new Float32Array(cols * rows);
  const far = Math.max(
    Math.hypot(origin.x, origin.y),
    Math.hypot(width - origin.x, origin.y),
    Math.hypot(origin.x, height - origin.y),
    Math.hypot(width - origin.x, height - origin.y),
    1,
  );

  let seeds: { x: number; y: number; v: number }[] = [];
  let shard = 1;
  if (kind === 'voronoi') {
    const n = Math.round(clamp((width * height) / 3500, 8, 60));
    shard = Math.sqrt((width * height) / n);
    seeds = Array.from({ length: n }, () => {
      const x = input.random() * width;
      const y = input.random() * height;
      return { x, y, v: (Math.hypot(x - origin.x, y - origin.y) / far) * 0.75 + input.random() * 0.25 };
    });
  }
  const lineH = 6;
  const lines = Math.max(1, Math.ceil(height / lineH));

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = (i + 0.5) * cell;
      const y = (j + 0.5) * cell;
      const dx = x - origin.x;
      const dy = y - origin.y;
      const d = Math.hypot(dx, dy) / far;
      let v: number;
      switch (kind) {
        case 'radar':
          v = ((Math.atan2(dy, dx) + Math.PI * 2.5) % (Math.PI * 2)) / (Math.PI * 2);
          break;
        case 'ripple':
          v = d * 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(d * 30));
          break;
        case 'hilbert':
          v = xy2d(32, Math.min(31, ((x / width) * 32) | 0), Math.min(31, ((y / height) * 32) | 0)) / 1023;
          break;
        case 'bayer':
          v = (BAYER8[(i & 7) + (j & 7) * 8] / 63) * 0.75 + d * 0.25;
          break;
        case 'voronoi': {
          let best = Infinity;
          let sv = 0;
          for (const s of seeds) {
            const q = (s.x - x) ** 2 + (s.y - y) ** 2;
            if (q < best) {
              best = q;
              sv = s.v;
            }
          }
          v = sv + 0.12 * Math.min(1, Math.sqrt(best) / shard);
          break;
        }
        case 'receipt':
          v = (Math.floor(y / lineH) + (x / width) * 0.85) / lines;
          break;
        case 'dissolve':
          v = input.random();
          break;
        default:
          v = d * 0.7 + input.fbm(x * 0.045, y * 0.045) * 0.5;
      }
      values[j * cols + i] = v;
    }
  }

  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo || 1;
  for (let k = 0; k < values.length; k++) values[k] = (values[k] - lo) / span;
  return { kind, cols, rows, cell, values };
}

/** How the moving edge between covered and uncovered cells looks. */
export interface EdgeStyle {
  color: RGBA;
  /** Width of the edge band in threshold units. */
  width: number;
  alpha: number;
  /** For a sweep: how far behind the edge a fading tint trails, in threshold units. */
  trail: number;
  /** Crisp cells instead of a soft, smoothed boundary. */
  hard: boolean;
  /** Soft boundary width in threshold units. */
  softness: number;
}

export function edgeFor(kind: ThresholdKind, theme: Theme): EdgeStyle {
  const base: EdgeStyle = { color: theme.accent, width: 0, alpha: 0, trail: 0, hard: true, softness: 0.06 };
  switch (kind) {
    case 'ink':
      return { ...base, color: theme.ink, width: 0.035, alpha: 0.85, hard: false };
    case 'radar':
      return { ...base, alpha: 0.5, trail: 0.2, hard: false, softness: 0.015 };
    case 'ripple':
      return { ...base, width: 0.035, alpha: 0.7, hard: false };
    case 'hilbert':
      return { ...base, width: 0.03, alpha: 0.9 };
    case 'voronoi':
      return { ...base, width: 0.02, alpha: 0.55 };
    case 'receipt':
      return { ...base, width: 0.012, alpha: 0.9 };
    default:
      return base;
  }
}

/**
 * Paints a cover over the stage that disappears cell by cell as progress passes each
 * cell's threshold, plus the moving edge.
 */
export class ThresholdPainter {
  private mask: PixelBuffer;
  private edgeBuf: PixelBuffer;
  private layer: HTMLCanvasElement;
  private layerCtx: CanvasRenderingContext2D;

  constructor(
    private stage: Stage,
    readonly grid: ThresholdGrid,
    readonly edge: EdgeStyle = edgeFor(grid.kind, stage.theme),
  ) {
    this.mask = pixelBuffer(grid.cols, grid.rows);
    this.edgeBuf = pixelBuffer(grid.cols, grid.rows);
    this.layer = makeCanvas(stage.canvas.width, stage.canvas.height);
    this.layerCtx = ctx2d(this.layer);
    this.layerCtx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);
  }

  /**
   * Draw the cover where the threshold exceeds `p`. `paintCover` paints the cover's look
   * inside `clip` (the surface colour by default).
   */
  draw(p: number, paintCover?: (ctx: CanvasRenderingContext2D) => void, clip: Path2D = this.stage.clip): void {
    const { grid, edge, stage } = this;
    const { values } = grid;
    const mask = this.mask.px;
    const edgePx = this.edgeBuf.px;
    const [er, eg, eb] = edge.color;
    let anyEdge = false;
    for (let k = 0; k < values.length; k++) {
      const tv = values[k];
      let cov: number;
      let fr = 0;
      if (p >= 1) cov = 0;
      else if (edge.hard) {
        cov = tv > p ? 1 : 0;
        if (edge.alpha && tv <= p && tv > p - edge.width) fr = edge.alpha;
      } else {
        cov = clamp((tv - p) / edge.softness);
        if (edge.trail) fr = tv <= p ? clamp(1 - (p - tv) / edge.trail) * edge.alpha : 0;
        else if (edge.width) fr = clamp(1 - Math.abs(tv - p) / edge.width) * edge.alpha;
      }
      mask[k] = pack(0, 0, 0, (cov * 255) | 0);
      edgePx[k] = pack(er, eg, eb, (fr * 255) | 0);
      if (fr > 0) anyEdge = true;
    }
    this.mask.flush();

    const lx = this.layerCtx;
    lx.save();
    lx.setTransform(1, 0, 0, 1, 0, 0);
    lx.clearRect(0, 0, this.layer.width, this.layer.height);
    lx.restore();
    lx.save();
    lx.clip(clip);
    if (paintCover) paintCover(lx);
    else {
      lx.fillStyle = rgba(stage.theme.surface);
      lx.fillRect(0, 0, stage.width, stage.height);
    }
    lx.restore();
    // Mask outside the clip: inside it, anti-aliased edge pixels would only be partly
    // masked and leave a faint ring of cover around every target.
    lx.save();
    lx.globalCompositeOperation = 'destination-in';
    lx.imageSmoothingEnabled = !edge.hard;
    lx.drawImage(this.mask.canvas, 0, 0, grid.cols * grid.cell, grid.rows * grid.cell);
    lx.restore();

    const ctx = stage.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.layer, 0, 0);
    ctx.restore();

    if (anyEdge) {
      this.edgeBuf.flush();
      ctx.save();
      ctx.clip(clip);
      ctx.imageSmoothingEnabled = !edge.hard;
      ctx.drawImage(this.edgeBuf.canvas, 0, 0, grid.cols * grid.cell, grid.rows * grid.cell);
      ctx.restore();
    }
  }
}
