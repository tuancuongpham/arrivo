/** Colour as 0–255 channels, alpha included. */
export type RGBA = [r: number, g: number, b: number, a: number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Where content lands. `text` is one line fragment of a text node, `media` an image,
 * canvas, video or svg, `block` an element marked `data-arrivo="block"` (skeleton bars,
 * progress bars, anything without text).
 */
export type TargetKind = 'text' | 'media' | 'block';

export interface Target extends Rect {
  kind: TargetKind;
  el: Element;
  radius: number;
}

/** A positioned run of text: a word from `stage.words()` or a grapheme from `stage.chars()`. */
export interface Glyph extends Rect {
  text: string;
  /** Canvas font shorthand matching the element's computed font. */
  font: string;
  color: string;
  /** Alphabetic baseline in stage coordinates. */
  baseline: number;
  /** Computed `letter-spacing`, when not `normal`. */
  tracking?: string;
}

export interface Theme {
  surface: RGBA;
  ink: RGBA;
  muted: RGBA;
  accent: RGBA;
  danger: RGBA;
  cell: RGBA;
  /** True when the surface behind the content is dark. */
  dark: boolean;
  /** Font family effects use for their own captions (stamps, OSD). */
  mono: string;
}

export type Origin = 'center' | 'top-left' | 'pointer' | { x: number; y: number };

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  /** Pixels per CSS pixel (≤ 1 when the raster was downsampled). */
  scale: number;
}

/**
 * Everything an effect may read about the area it animates. Coordinates are CSS pixels
 * relative to the wrapper's padding box; the 2D context is already scaled by `dpr`.
 */
export interface Stage {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly dpr: number;
  readonly width: number;
  readonly height: number;
  readonly origin: { x: number; y: number };
  readonly targets: readonly Target[];
  /** Union of all targets. */
  readonly box: Rect;
  /** Rounded rectangles of all targets, for clipping. */
  readonly clip: Path2D;
  readonly theme: Theme;
  readonly seed: number;
  /** Seeded PRNG in [0, 1). */
  random(): number;
  /** Seeded value noise in [0, 1]. */
  noise(x: number, y: number): number;
  /** Seeded three-octave fractal noise in [0, 1]. */
  fbm(x: number, y: number): number;
  words(): readonly Glyph[];
  chars(): readonly Glyph[];
  /** Content redrawn onto a canvas at device resolution. `opaque` fills targets with the surface first. */
  raster(opaque: boolean): HTMLCanvasElement;
  /** RGBA pixels of `raster(opaque)`, downsampled to at most `maxPixels`. */
  pixels(opaque: boolean, maxPixels?: number): Pixels;
  clear(): void;
}

export interface IdleRun<H = unknown> {
  /** Draw one loading frame; `t` is milliseconds since loading started. */
  frame(t: number): void;
  /** State handed to `reveal()` so motion continues instead of restarting. */
  handoff?(): H;
  dispose?(): void;
}

export interface RevealRun {
  /** Overrides the effect's default duration, for reveals that size themselves. */
  duration?: number;
  /** Draw one reveal frame; `p` runs 0 → 1, `t` is milliseconds since loading started. */
  frame(p: number, t: number): void;
  dispose?(): void;
}

export interface Effect<O = object, H = unknown> {
  readonly name: string;
  /**
   * `start`: the real content becomes visible when the reveal begins and the overlay
   * uncovers it. `end`: the overlay draws the content itself, then fades to the real DOM.
   */
  readonly show: 'start' | 'end';
  /** Default reveal duration in milliseconds. */
  readonly duration: number;
  /**
   * Minimum loading time before this effect's reveal. The built-in effects leave it unset so
   * content is never held back; the `minIdle` option overrides it.
   */
  readonly minIdle?: number;
  /** Static CSS for `<Skeleton>` before JavaScript runs or with reduced motion. */
  readonly css?: string;
  idle(stage: Stage, options: Partial<O>): IdleRun<H>;
  reveal(stage: Stage, options: Partial<O>, from: H | undefined): RevealRun;
}

/** Identity helper that keeps an effect's option and handoff types inferred. */
export function defineEffect<O, H = unknown>(effect: Effect<O, H>): Effect<O, H> {
  return effect;
}

/** Options type of an effect, for typing `options` props. */
export type EffectOptions<E> = E extends Effect<infer O, unknown> ? Partial<O> : never;
