import { motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Reveal } from 'arrivo';
import type { ThresholdKind } from 'arrivo/core';
import { ink } from 'arrivo/effects';
import { useRevealMotion } from './controls';
import { E2E } from './data';
import { VARIANTS } from './effects';
import { Photo, PHOTOS, preload } from './photo';
import { cx, SectionHeading } from './ui';

/** The ink effect's eight threshold maps on one large photograph. Picking a map replays the reveal. */
export function ThresholdLab() {
  const reduce = useReducedMotion() || E2E;
  const motionProps = useRevealMotion();
  const [variant, setVariant] = useState<ThresholdKind>('ink');
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.3 });

  useEffect(() => {
    if (!loading || !inView) return;
    let live = true;
    const t = setTimeout(() => void preload(PHOTOS.fjord).then(() => live && setLoading(false)), E2E ? 200 : 700);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [loading, run, inView]);

  const choose = (kind: ThresholdKind): void => {
    setVariant(kind);
    setLoading(true);
    setRun((r) => r + 1);
  };

  return (
    <section aria-labelledby="threshold" className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 lg:py-32">
      <SectionHeading id="threshold" title="One engine, eight reveals.">
        The ink effect gives every cell a threshold and uncovers it once progress passes. Swap the map and the same reveal bleeds, sweeps, crawls or prints.
      </SectionHeading>
      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
        <motion.figure
          ref={ref}
          {...(reduce ? {} : { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } })}
          className="rounded-2xl border border-line bg-surface p-3 shadow-card"
        >
          <Reveal effect={ink} options={{ variant }} loading={loading} {...motionProps} className="flex flex-col gap-3" data-testid="threshold-reveal">
            <Photo photo={PHOTOS.fjord} className="aspect-[3/2] w-full rounded-[10px] object-cover" />
            <div className="flex items-center justify-between gap-4 px-1.5 pb-1">
              <p className="text-[16px] font-semibold tracking-[-0.01em] text-ink">Valley at first light</p>
              <code className="font-mono text-[13px] text-muted">variant: &apos;{variant}&apos;</code>
            </div>
          </Reveal>
        </motion.figure>
        <div role="radiogroup" aria-label="Threshold map" className="grid grid-cols-1 content-start gap-2 sm:grid-cols-2">
          {VARIANTS.map((v) => {
            const active = v.kind === variant;
            return (
              <button
                key={v.kind}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(v.kind)}
                className={cx(
                  'rounded-2xl border p-4 text-left transition-[border-color,background-color,transform] duration-200 active:scale-[0.98]',
                  active ? 'border-line-2 bg-surface shadow-card' : 'border-transparent hover:border-line hover:bg-surface/60',
                )}
              >
                <span className={cx('block text-[15px] font-semibold tracking-[-0.01em]', active ? 'text-accent' : 'text-ink')}>{v.title}</span>
                <span className="mt-1 block text-[13.5px] leading-snug text-muted">{v.blurb}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
