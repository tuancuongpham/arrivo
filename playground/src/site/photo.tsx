import type { CSSProperties } from 'react';
import { Art, type ArtKind } from '../art';
import { E2E } from './data';

export interface PhotoSpec {
  id: number;
  w: number;
  h: number;
  /** Local canvas stand-in used by `?e2e`, so tests never touch the network. */
  art: ArtKind;
  alt: string;
}

/** Unsplash photographs served by picsum.photos, which sends CORS headers so canvases can read them. */
export const PHOTOS = {
  hero: { id: 1069, w: 1200, h: 900, art: 'aura', alt: 'An orange jellyfish drifting through deep blue water' },
  essay: { id: 1027, w: 1400, h: 860, art: 'aura', alt: 'Close portrait of a woman with red lipstick in soft light' },
  kit: { id: 26, w: 1000, h: 660, art: 'land', alt: 'Wallet, earbuds, phone and notebook laid out on a grey desk' },
  live: { id: 452, w: 1000, h: 560, art: 'scene', alt: 'A concert crowd with raised hands under stage lights' },
  heat: { id: 857, w: 900, h: 560, art: 'rack', alt: 'A city skyline glowing at dusk' },
  coast: { id: 1002, w: 1600, h: 760, art: 'ink', alt: 'Aerial view of turquoise water meeting a rocky coast' },
  polaroid: { id: 815, w: 700, h: 700, art: 'sunset', alt: 'Two hands forming a heart against the setting sun' },
  album: { id: 1041, w: 520, h: 520, art: 'album', alt: 'A breaking ocean wave in deep blue' },
  avatar: { id: 64, w: 200, h: 200, art: 'avatar', alt: 'Portrait of a woman in sunglasses in a golden field' },
  peak: { id: 961, w: 1400, h: 640, art: 'peak', alt: 'The snow-covered Matterhorn under a pale sky' },
  fjord: { id: 1015, w: 1500, h: 1000, art: 'land', alt: 'A blue river winding through a green valley' },
  berries: { id: 429, w: 1000, h: 760, art: 'land', alt: 'A white cup full of raspberries' },
  work1: { id: 1060, w: 240, h: 240, art: 'album', alt: 'Coffee being poured at a bar counter' },
  work2: { id: 1059, w: 240, h: 240, art: 'land', alt: 'A tidy studio shelf with a framed print' },
  work3: { id: 1047, w: 240, h: 240, art: 'scene', alt: 'A narrow brick alley at dusk' },
} satisfies Record<string, PhotoSpec>;

export const photoUrl = (p: PhotoSpec): string => `https://picsum.photos/id/${p.id}/${p.w}/${p.h}`;

const decoded = new Map<string, Promise<void>>();

/** Resolve once the photos have decoded, so a reveal never draws a half-loaded image. */
export function preload(...photos: PhotoSpec[]): Promise<void> {
  if (E2E || !photos.length) return Promise.resolve();
  return Promise.all(
    photos.map((p) => {
      const url = photoUrl(p);
      let ready = decoded.get(url);
      if (!ready) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        ready = img.decode().catch(() => undefined);
        decoded.set(url, ready);
      }
      return ready;
    }),
  ).then(() => undefined);
}

export function Photo({ photo, className, style }: { photo: PhotoSpec; className?: string; style?: CSSProperties }) {
  if (E2E) return <Art kind={photo.art} className={className} style={style} />;
  return (
    <img
      src={photoUrl(photo)}
      alt={photo.alt}
      width={photo.w}
      height={photo.h}
      crossOrigin="anonymous"
      decoding="async"
      draggable={false}
      className={className}
      style={style}
    />
  );
}
