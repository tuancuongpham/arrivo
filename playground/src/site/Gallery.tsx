import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef, useState, type ComponentType, type MouseEvent } from 'react';
import { Reveal, type Origin } from 'arrivo';
import * as C from './cards';
import { useControls, useMockFetch, useRevealMotion } from './controls';
import * as D from './data';
import { EFFECTS, type EffectKey } from './effects';
import { PHOTOS, type PhotoSpec } from './photo';
import { Button, cx, IconButton, SectionHeading, Segmented, Switch } from './ui';

interface Tile {
  id: EffectKey;
  /** Column span at lg on a 12-column grid; every row adds up to 12. */
  span: string;
  /** Wide tiles take both columns at md. */
  wide?: boolean;
  tone?: 'night' | 'accent';
  make: () => any;
  Body: ComponentType<{ d: any }>;
  photos?: PhotoSpec[];
}

const TILES: Tile[] = [
  { id: 'halftone', span: 'lg:col-span-7', wide: true, make: D.essay, Body: C.EssayCard, photos: [PHOTOS.essay] },
  { id: 'flap', span: 'lg:col-span-5', make: D.kpi, Body: C.KpiCard },
  { id: 'crt', span: 'lg:col-span-5', tone: 'night', make: D.video, Body: C.VideoCard, photos: [PHOTOS.live] },
  { id: 'redact', span: 'lg:col-span-4', make: D.article, Body: C.ArticleCard },
  { id: 'swarm', span: 'lg:col-span-3', make: D.profile, Body: C.ProfileCard, photos: [PHOTOS.avatar, PHOTOS.work1, PHOTOS.work2, PHOTOS.work3] },
  { id: 'mosaic', span: 'lg:col-span-5', make: D.kit, Body: C.KitCard, photos: [PHOTOS.kit] },
  // Diagonal from the CRT tile above, so the two night tiles never touch.
  { id: 'thermal', span: 'lg:col-span-7', wide: true, tone: 'night', make: D.heat, Body: C.HeatCard, photos: [PHOTOS.heat] },
  { id: 'ink', span: 'lg:col-span-8', wide: true, make: D.print, Body: C.PrintCard, photos: [PHOTOS.coast] },
  { id: 'darkroom', span: 'lg:col-span-4', make: D.polaroid, Body: C.PolaroidCard, photos: [PHOTOS.polaroid] },
  { id: 'tetris', span: 'lg:col-span-4', make: D.leaderboard, Body: C.BoardCard },
  { id: 'equalizer', span: 'lg:col-span-8', wide: true, make: D.track, Body: C.TrackCard, photos: [PHOTOS.album] },
  { id: 'fuse', span: 'lg:col-span-5', tone: 'accent', make: D.milestone, Body: C.MilestoneCard },
  { id: 'snow', span: 'lg:col-span-7', wide: true, make: D.weather, Body: C.WeatherCard, photos: [PHOTOS.peak] },
];

const TONES = {
  night: 'tone-night',
  accent: 'tone-accent',
} as const;

function GalleryTile({ tile, order }: { tile: Tile; order: number }) {
  const reduce = useReducedMotion() || D.E2E;
  const motionProps = useRevealMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const { value, loading, refetch } = useMockFetch(tile.make, tile.photos, inView);
  const [festive, setFestive] = useState(false);
  const [from, setFrom] = useState<Origin>();
  const info = EFFECTS[tile.id];
  /** Clicking a card replays it from the click point. */
  const replayHere = (e: MouseEvent): void => {
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    setFrom({ x: e.clientX, y: e.clientY });
    refetch();
  };
  const options = tile.id === 'fuse' ? { theme: festive ? 'tet' : 'default' } : info.options;
  return (
    <motion.figure
      ref={ref}
      {...(reduce
        ? {}
        : {
            initial: { opacity: 0, y: 22 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, amount: 0.15 },
            transition: { duration: 0.7, delay: (order % 3) * 0.06, ease: [0.16, 1, 0.3, 1] },
          })}
      data-testid={`card-${tile.id}`}
      data-loading={loading}
      className={cx('flex min-w-0 flex-col gap-3', tile.span, tile.wide && 'md:col-span-2')}
    >
      <figcaption className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h3 className="text-[15.5px] font-semibold tracking-[-0.01em] text-ink">{info.title}</h3>
          <p className="text-[13.5px] text-muted">{info.blurb}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {tile.id === 'fuse' && (
            <Segmented
              name="fuse-theme"
              label="Fuse theme"
              showLabel={false}
              value={festive ? 'tet' : 'default'}
              options={[
                ['default', 'Fireworks'],
                ['tet', 'Lunar New Year'],
              ]}
              onChange={(v) => {
                setFestive(v === 'tet');
                refetch();
              }}
            />
          )}
          <IconButton label={`Replay ${info.title}`} onClick={refetch}>
            <ArrowClockwiseIcon size={16} />
          </IconButton>
        </div>
      </figcaption>
      <div
        onClick={replayHere}
        className={cx(
          'flex flex-1 cursor-pointer flex-col rounded-2xl border border-line bg-surface p-4 text-ink shadow-card transition-[border-color] duration-300 hover:border-line-2',
          tile.tone && TONES[tile.tone],
        )}
      >
        <Reveal
          effect={info.effect}
          options={options}
          loading={loading}
          {...motionProps}
          origin={from ?? motionProps.origin}
          onRevealComplete={() => setFrom(undefined)}
          className="flex flex-1 flex-col gap-3"
          data-testid={`reveal-${tile.id}`}
        >
          <tile.Body d={value} />
        </Reveal>
      </div>
    </motion.figure>
  );
}

/** Floating controls that apply to every card on the page. */
function Dock() {
  const { controls, set } = useControls();
  return (
    <div className="sticky top-3 z-30 flex justify-center px-2">
      <div
        role="toolbar"
        aria-label="Demo controls"
        className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-line bg-surface/85 p-1.5 shadow-card backdrop-blur-xl [scrollbar-width:none]"
      >
        {/* Phones replay from the tap point instead, so the origin picker is left out there. */}
        <div className="flex items-center max-sm:hidden">
          <Segmented
            name="origin"
            label="Reveal from"
            value={typeof controls.origin === 'string' ? controls.origin : 'center'}
            options={[
              ['center', 'Center'],
              ['top-left', 'Corner'],
              ['pointer', 'Cursor'],
            ]}
            onChange={(v) => set('origin', v)}
          />
          <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-line-2" />
        </div>
        <Segmented
          name="speed"
          label="Speed"
          value={controls.speed}
          options={[
            [0.5, '0.5×'],
            [1, '1×'],
            [2, '2×'],
          ]}
          onChange={(v) => set('speed', v)}
        />
        <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-line-2" />
        <Switch label="Hold loading" shortLabel="Hold" checked={controls.hold} onChange={(v) => set('hold', v)} />
        <Button
          variant="primary"
          size="sm"
          aria-label="Replay all"
          className="max-sm:w-8 max-sm:px-0"
          onClick={() => set('replayAll', controls.replayAll + 1)}
        >
          <ArrowClockwiseIcon size={14} />
          <span className="max-sm:hidden">Replay all</span>
        </Button>
      </div>
    </div>
  );
}

export function Gallery() {
  return (
    <section aria-labelledby="effects" className="relative pb-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <SectionHeading id="effects" title="Thirteen ways to arrive.">
          Each card fakes a request as it scrolls into view. Click one to replay it from that spot, or hold the loading state to take a closer look.
        </SectionHeading>
      </div>
      <div className="mt-10">
        <Dock />
      </div>
      <div className="mx-auto mt-8 grid max-w-[1200px] grid-cols-1 gap-x-5 gap-y-8 px-5 md:grid-flow-dense md:grid-cols-2 md:px-8 lg:grid-flow-row lg:grid-cols-12">
        {TILES.map((tile, i) => (
          <GalleryTile key={tile.id} tile={tile} order={i} />
        ))}
      </div>
    </section>
  );
}
