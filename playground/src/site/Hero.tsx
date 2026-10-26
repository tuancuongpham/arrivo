import { ArrowDownIcon, CaretLeftIcon, CaretRightIcon, PauseIcon, PlayIcon } from '@phosphor-icons/react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Reveal } from '@brottin/arrivo';
import { useRevealMotion } from './controls';
import { E2E, showcase } from './data';
import { EFFECTS, TOUR } from './effects';
import { Photo, PHOTOS, preload } from './photo';
import { CopyChip, IconButton } from './ui';

const LOADING_MS = 1300;
const HOLD_MS = 2300;

/**
 * The hero asset: one print card that tours every effect. Each stop shows the loading
 * state, reveals, rests, then moves on. Off screen it waits, because reveals are lazy.
 */
function Showcase() {
  const reduce = useReducedMotion();
  const motionProps = useRevealMotion();
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(!reduce && !E2E);
  const [data] = useState(showcase);
  // Off screen the tour waits in its loading state and picks up again on the way back.
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = useCallback((to: number) => {
    clearTimeout(timer.current);
    setIndex((to + TOUR.length) % TOUR.length);
    setLoading(true);
  }, []);

  useEffect(() => {
    if (!loading || !inView) return;
    let live = true;
    const t = setTimeout(() => {
      void preload(PHOTOS.hero).then(() => live && setLoading(false));
    }, LOADING_MS);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [loading, index, inView]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const indexRef = useRef(index);
  indexRef.current = index;

  const onDone = useCallback(() => {
    if (!playingRef.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go(indexRef.current + 1), HOLD_MS);
  }, [go]);

  const key = TOUR[index];
  const info = EFFECTS[key];

  return (
    <div className="relative">
      <div aria-hidden="true" className="dot-screen pointer-events-none absolute -inset-x-10 -inset-y-12 -z-10" />
      <figure ref={ref} className="rounded-2xl border border-line bg-surface p-3 shadow-card">
        <Reveal
          effect={info.effect}
          options={info.options}
          loading={loading}
          onRevealComplete={onDone}
          {...motionProps}
          className="flex flex-col gap-3"
          data-testid="hero-reveal"
        >
          <Photo photo={PHOTOS.hero} className="aspect-[4/3] w-full rounded-[10px] object-cover" />
          <div className="flex items-end justify-between gap-4 px-1.5 pb-1">
            <div className="min-w-0">
              <p className="text-[18px] font-semibold tracking-[-0.015em] text-ink">{data.title}</p>
              <p className="text-[13.5px] text-ink-2">{data.meta}</p>
            </div>
            <p className="font-mono text-[18px] text-ink">{data.price}</p>
          </div>
        </Reveal>
      </figure>
      <div className="mt-4 flex items-center justify-between gap-4 px-1">
        <div className="min-w-0" aria-live="polite">
          <p className="text-[15px] font-medium text-ink">{info.title}</p>
          <code className="block truncate font-mono text-[12.5px] text-muted">
            import {'{'} {key} {'}'} from &apos;@brottin/arrivo/effects&apos;
          </code>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-line bg-surface p-1">
          <IconButton label="Previous effect" onClick={() => go(index - 1)}>
            <CaretLeftIcon size={15} />
          </IconButton>
          <IconButton
            label={playing ? 'Pause the tour' : 'Play the tour'}
            onClick={() => {
              const next = !playing;
              setPlaying(next);
              if (next && !loading) go(index + 1);
              else clearTimeout(timer.current);
            }}
          >
            {playing ? <PauseIcon size={15} weight="fill" /> : <PlayIcon size={15} weight="fill" />}
          </IconButton>
          <IconButton label="Next effect" onClick={() => go(index + 1)}>
            <CaretRightIcon size={15} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const reduce = useReducedMotion() || E2E;
  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] as const },
        };
  return (
    <section
      id="top"
      className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-5 pt-8 pb-20 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.06fr)] lg:gap-16 lg:pt-14 lg:pb-28"
    >
      <div className="max-w-[560px]">
        <motion.h1 {...rise(0)} className="text-[42px] leading-[1.02] font-semibold tracking-[-0.04em] text-ink min-[400px]:text-[46px] sm:text-[60px] lg:text-[68px]">
          Make the wait worth watching.
        </motion.h1>
        <motion.p {...rise(1)} className="mt-6 max-w-[40ch] text-[18px] leading-relaxed text-ink-2">
          Thirteen canvas effects that play exactly where your content lands, then hand it back in place.
        </motion.p>
        <motion.div {...rise(2)} className="mt-9 flex flex-wrap items-center gap-3">
          <a
            href="#effects"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-medium text-bg transition-[transform,background-color] duration-200 hover:bg-ink/85 active:scale-[0.98]"
          >
            Explore effects <ArrowDownIcon size={16} />
          </a>
          <CopyChip text="npm i @brottin/arrivo" />
        </motion.div>
      </div>
      <motion.div {...(reduce ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] } })}>
        <Showcase />
      </motion.div>
    </section>
  );
}
