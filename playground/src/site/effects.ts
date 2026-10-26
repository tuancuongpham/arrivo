import type { Effect } from 'arrivo';
import type { ThresholdKind } from 'arrivo/core';
import * as fx from 'arrivo/effects';

export type EffectKey =
  | 'flap'
  | 'redact'
  | 'mosaic'
  | 'halftone'
  | 'crt'
  | 'ink'
  | 'swarm'
  | 'darkroom'
  | 'tetris'
  | 'fuse'
  | 'equalizer'
  | 'thermal'
  | 'snow';

export interface EffectInfo {
  effect: Effect<any, any>;
  title: string;
  blurb: string;
  options?: object;
}

export const EFFECTS: Record<EffectKey, EffectInfo> = {
  halftone: { effect: fx.halftone, title: 'Halftone', blurb: 'Four CMYK screens print the picture in.' },
  flap: { effect: fx.flap, title: 'Split-flap', blurb: 'Every character flips into place, in order.' },
  redact: { effect: fx.redact, title: 'Redacted', blurb: 'Bars sized to the real words lift in reading order.', options: { stamp: 'Classified' } },
  crt: { effect: fx.crt, title: 'CRT tune-in', blurb: 'Static and a rolling picture, then the signal locks.', options: { message: 'Searching' } },
  mosaic: { effect: fx.mosaic, title: 'Quadtree mosaic', blurb: 'Detail sharpens first, flat areas last.' },
  swarm: { effect: fx.swarm, title: 'Particle swarm', blurb: 'Dust flies to every point of ink.' },
  thermal: { effect: fx.thermal, title: 'Thermal', blurb: 'The picture cools into place from the origin.' },
  ink: { effect: fx.ink, title: 'Ink bleed', blurb: 'A wet edge spreads out from the origin.' },
  darkroom: { effect: fx.darkroom, title: 'Darkroom', blurb: 'The emulsion clears while colour develops.' },
  tetris: { effect: fx.tetris, title: 'Tetris', blurb: 'The well fills up, then clears line by line.' },
  equalizer: { effect: fx.equalizer, title: 'Equalizer', blurb: 'Bars bounce, then settle into the shape of the text.' },
  fuse: { effect: fx.fuse, title: 'Fuse', blurb: 'A fuse burns along the text, then a firework.' },
  snow: { effect: fx.snow, title: 'Snowfall', blurb: 'Snow settles on the content, then melts away.' },
};

/** Order of the hero's tour, opening with the most photographic effects. */
export const TOUR: EffectKey[] = ['halftone', 'flap', 'mosaic', 'ink', 'crt', 'swarm', 'thermal', 'darkroom', 'tetris', 'redact', 'equalizer', 'fuse', 'snow'];

export const VARIANTS: { kind: ThresholdKind; title: string; blurb: string }[] = [
  { kind: 'ink', title: 'Ink', blurb: 'Distance plus noise. A wet, organic edge.' },
  { kind: 'radar', title: 'Radar', blurb: 'Angle from the origin. One clockwise sweep.' },
  { kind: 'ripple', title: 'Ripple', blurb: 'Distance with a sine. Rings travel outward.' },
  { kind: 'hilbert', title: 'Hilbert', blurb: 'A space-filling curve. The reveal crawls.' },
  { kind: 'bayer', title: 'Bayer', blurb: 'An ordered dither matrix. A retro dissolve.' },
  { kind: 'voronoi', title: 'Voronoi', blurb: 'Seeded cells. The picture arrives in shards.' },
  { kind: 'receipt', title: 'Receipt', blurb: 'Row by row, printed like a till slip.' },
  { kind: 'dissolve', title: 'Dissolve', blurb: 'Pure noise. Every cell for itself.' },
];
