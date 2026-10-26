import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { useInView } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Reveal, Skeleton } from 'arrivo';
import { ArticleCard, KitCard, KpiCard } from './cards';
import { useControls, useRevealMotion } from './controls';
import * as D from './data';
import { EFFECTS, type EffectKey } from './effects';
import { PHOTOS, preload } from './photo';
import { Button, cx, SectionHeading } from './ui';

const KEYS = Object.keys(EFFECTS) as EffectKey[];

const fresh = () => ({ kpi: D.kpi(), shop: D.produce(), article: D.article() });

/** Pick any effect and fetch a small dashboard: skeletons first, then the old layout on refetch. */
export function Sandbox() {
  const { controls } = useControls();
  const motionProps = useRevealMotion();
  const [key, setKey] = useState<EffectKey>('ink');
  const [loading, setLoading] = useState(true);
  const [first, setFirst] = useState(true);
  const [data, setData] = useState(fresh);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.25 });

  useEffect(() => {
    if (!loading || controls.hold || !inView) return;
    let live = true;
    const t = setTimeout(
      () =>
        void preload(PHOTOS.berries).then(() => {
          if (!live) return;
          setData(fresh());
          setLoading(false);
          setFirst(false);
        }),
      D.E2E ? 200 : 1300,
    );
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [loading, controls.hold, inView]);

  const info = EFFECTS[key];
  const shared = { effect: info.effect, options: info.options, loading, ...motionProps };
  const card = 'flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-card';

  return (
    <section aria-labelledby="playground" className="border-y border-line bg-surface-2/50 py-24 lg:py-32">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <SectionHeading id="playground" title="Same layout, any effect.">
          The first load renders skeletons. Every fetch after that plays over the previous layout, then reveals the new data in place.
        </SectionHeading>
        <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="radiogroup"
            aria-label="Effect"
            className="-mx-5 flex snap-x scroll-px-5 gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8 lg:mx-0 lg:flex-wrap lg:px-0"
          >
            {KEYS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={k === key}
                onClick={() => setKey(k)}
                className={cx(
                  'h-8 shrink-0 snap-start rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.97]',
                  k === key ? 'border-ink bg-ink text-bg' : 'border-line-2 bg-surface text-ink-2 hover:text-ink',
                )}
              >
                {EFFECTS[k].title}
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={() => setLoading(true)}>
            <ArrowClockwiseIcon size={16} /> Simulate fetch
          </Button>
        </div>
        <div ref={ref} className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <div className="grid grid-cols-1 gap-5">
            <div className={card}>
              <Reveal
                {...shared}
                className="flex flex-1 flex-col gap-3"
                skeleton={
                  first ? (
                    <>
                      <Skeleton lines={1} widths={['46%']} />
                      <Skeleton height={48} width="62%" />
                      <Skeleton lines={2} widths={['88%', '40%']} />
                    </>
                  ) : undefined
                }
              >
                <KpiCard d={data.kpi} />
              </Reveal>
            </div>
            <div className={card}>
              <Reveal {...shared} className="flex flex-1 flex-col gap-3" skeleton={first ? <Skeleton lines={5} /> : undefined}>
                <ArticleCard d={data.article} />
              </Reveal>
            </div>
          </div>
          <div className={card}>
            <Reveal
              {...shared}
              className="flex flex-1 flex-col gap-3"
              skeleton={
                first ? (
                  <>
                    <Skeleton height={280} />
                    <Skeleton lines={2} widths={['70%', '45%']} />
                  </>
                ) : undefined
              }
            >
              <KitCard d={data.shop} photo={PHOTOS.berries} />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
