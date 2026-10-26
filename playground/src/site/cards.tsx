import { ArrowRightIcon, PlayIcon, ShoppingBagIcon, SkipBackIcon, SkipForwardIcon, TrendDownIcon, TrendUpIcon } from '@phosphor-icons/react';
import type * as D from './data';
import { Photo, PHOTOS, type PhotoSpec } from './photo';
import { HeatScale, Spark } from './Spark';

/** Card bodies rendered inside each `<Reveal>`. Labels and buttons are `data-arrivo="static"` chrome. */

type Of<F extends (...args: never[]) => unknown> = { d: ReturnType<F> };

const label = 'text-[12.5px] text-muted';

export function EssayCard({ d }: Of<typeof D.essay>) {
  return (
    <>
      <Photo photo={PHOTOS.essay} className="aspect-[16/10] w-full rounded-[10px] object-cover" />
      <div className="flex items-end justify-between gap-6 px-1 pt-1">
        <div className="min-w-0">
          <p className={label}>{d.kicker}</p>
          <h4 className="mt-1 text-[24px] leading-tight font-semibold tracking-[-0.02em]">{d.title}</h4>
          <p className="mt-1.5 text-[14px] text-ink-2">{d.by}</p>
        </div>
        <span data-arrivo="static" className="hidden shrink-0 items-center gap-1.5 text-[14px] font-medium text-ink sm:inline-flex">
          Read the essay <ArrowRightIcon size={15} />
        </span>
      </div>
    </>
  );
}

export function KpiCard({ d }: Of<typeof D.kpi>) {
  const Trend = d.up ? TrendUpIcon : TrendDownIcon;
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span data-arrivo="static" className="text-[14px] text-ink-2">
          Weekly active users
        </span>
        <span data-arrivo="frame" className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[12.5px] text-ink">
          <Trend size={13} />
          <span>{d.delta}</span>
        </span>
      </div>
      <p className="font-mono text-[56px] leading-none font-medium tracking-[-0.04em]">{d.users}</p>
      <Spark values={d.series} className="min-h-24 w-full flex-1" />
      <div className="grid grid-cols-2 gap-4 border-t border-line pt-4">
        <div>
          <p data-arrivo="static" className={label}>
            Avg. session
          </p>
          <p className="mt-1 font-mono text-[18px]">{d.session}</p>
        </div>
        <div>
          <p data-arrivo="static" className={label}>
            Retention
          </p>
          <p className="mt-1 font-mono text-[18px]">{d.retention}</p>
        </div>
      </div>
      <p className={label}>
        <span data-arrivo="static">Updated at </span>
        <span className="font-mono">{d.updated}</span>
      </p>
    </>
  );
}

export function ArticleCard({ d }: Of<typeof D.article>) {
  return (
    <>
      <p className={label}>{d.tag}</p>
      <h4 className="text-[21px] leading-snug font-semibold tracking-[-0.02em]">{d.title}</h4>
      <p className="text-[14.5px] leading-relaxed text-ink-2">{d.body}</p>
      <span data-arrivo="static" className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[14px] font-medium">
        Keep reading <ArrowRightIcon size={15} />
      </span>
    </>
  );
}

export function VideoCard({ d }: Of<typeof D.video>) {
  return (
    <>
      <Photo photo={PHOTOS.live} className="aspect-video w-full rounded-[10px] object-cover" />
      <div className="flex items-start gap-3 px-1 pt-1">
        <span data-arrivo="static" className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-bg">
          <PlayIcon size={15} weight="fill" />
        </span>
        <div className="min-w-0">
          <h4 className="text-[16px] leading-snug font-semibold tracking-[-0.01em]">{d.title}</h4>
          <p className="mt-0.5 text-[13.5px] text-ink-2">{d.channel}</p>
          <p className={label}>{d.stats}</p>
        </div>
      </div>
    </>
  );
}

export function KitCard({ d, photo = PHOTOS.kit }: Of<typeof D.kit> & { photo?: PhotoSpec }) {
  return (
    <>
      {/* At least 3:2; in a stretched grid row the photo takes the extra height, not a gap. */}
      <Photo photo={photo} className="aspect-[3/2] w-full flex-1 rounded-[10px] object-cover" />
      <div className="flex items-start justify-between gap-4 px-1 pt-1">
        <div className="min-w-0">
          <h4 className="text-[17px] font-semibold tracking-[-0.01em]">{d.name}</h4>
          <p className="text-[13.5px] text-ink-2">{d.pieces}</p>
        </div>
        <p className="font-mono text-[17px]">{d.price}</p>
      </div>
      <span
        data-arrivo="static"
        className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-bg"
      >
        <ShoppingBagIcon size={16} /> Add to cart
      </span>
    </>
  );
}

export function ProfileCard({ d }: Of<typeof D.profile>) {
  return (
    <>
      <div className="flex items-center gap-3">
        <Photo photo={PHOTOS.avatar} className="size-12 shrink-0 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="truncate text-[15.5px] font-semibold tracking-[-0.01em]">{d.name}</p>
          <p className="truncate text-[13px] text-ink-2">{d.role}</p>
        </div>
      </div>
      <p className="text-[14px] leading-relaxed text-ink-2">{d.bio}</p>
      <div className="grid grid-cols-3 gap-2">
        {[PHOTOS.work1, PHOTOS.work2, PHOTOS.work3].map((w) => (
          <Photo key={w.id} photo={w} className="aspect-square w-full rounded-[8px] object-cover" />
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
        <span className={label}>
          <span className="font-mono text-ink">{d.followers}</span>
          <span data-arrivo="static"> followers</span>
        </span>
        <span data-arrivo="static" className="inline-flex h-8 items-center rounded-full border border-line-2 px-3.5 text-[13px] font-medium">
          Follow
        </span>
      </div>
    </>
  );
}

export function HeatCard({ d }: Of<typeof D.heat>) {
  return (
    <>
      <Photo photo={PHOTOS.heat} className="aspect-[16/10] w-full rounded-[10px] object-cover" />
      <div className="px-1 pt-1">
        <p className={label}>Surface temperature</p>
        <p className="mt-1 text-[15.5px] font-semibold tracking-[-0.01em]">{d.area}</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-[30px] leading-none tracking-[-0.03em]">{d.peak}</span>
          <span className={label}>peak at {d.at}</span>
        </p>
      </div>
      <div className="mt-auto px-1">
        <HeatScale className="h-2 w-full" />
        <div className="mt-2 flex justify-between font-mono text-[12px] text-muted">
          <span>{d.low}</span>
          <span>{d.avg} avg</span>
          <span>{d.peak}</span>
        </div>
      </div>
    </>
  );
}

export function PrintCard({ d }: Of<typeof D.print>) {
  return (
    <>
      <Photo photo={PHOTOS.coast} className="aspect-[2/1] w-full rounded-[10px] object-cover" />
      <div className="flex items-end justify-between gap-6 px-1 pt-1">
        <div className="min-w-0">
          <h4 className="text-[19px] font-semibold tracking-[-0.015em]">{d.title}</h4>
          <p className="text-[13.5px] text-ink-2">{d.meta}</p>
        </div>
        <p className="font-mono text-[19px]">{d.price}</p>
      </div>
    </>
  );
}

export function PolaroidCard({ d }: Of<typeof D.polaroid>) {
  return (
    <div className="mx-auto flex w-full max-w-[300px] flex-1 flex-col justify-center">
      <div className="rounded-[4px] bg-surface-2 p-3 pb-4 shadow-card">
        <Photo photo={PHOTOS.polaroid} className="aspect-square w-full rounded-[2px] object-cover" />
        <div className="flex items-baseline justify-between px-0.5 pt-3">
          <span className="text-[15px] font-medium italic">{d.caption}</span>
          <span className="font-mono text-[12px] text-muted">{d.date}</span>
        </div>
      </div>
    </div>
  );
}

export function BoardCard({ d }: Of<typeof D.leaderboard>) {
  return (
    <>
      <div className="flex items-center justify-between">
        <p data-arrivo="static" className="text-[14px] font-medium">
          Weekly leaderboard
        </p>
        <p data-arrivo="static" className={label}>
          Points
        </p>
      </div>
      <ol className="flex flex-col gap-2.5">
        {d.map((r) => (
          <li key={r.rank} className="flex items-center gap-3">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-[12px]">{r.rank}</span>
            <span className="min-w-0 flex-1 truncate text-[14.5px]">{r.name}</span>
            <span className="font-mono text-[14px]">{r.score}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

export function MilestoneCard({ d }: Of<typeof D.milestone>) {
  return (
    <>
      <p data-arrivo="static" className="text-[14px] text-ink-2">
        Milestone reached
      </p>
      <p className="font-mono text-[60px] leading-none font-medium tracking-[-0.045em]">{d.figure}</p>
      <p className="text-[16px] font-medium">{d.unit}</p>
      <Spark values={d.series} tone="accent" className="h-28 w-full" />
      <p className="mt-auto text-[14px] text-ink-2">{d.note}</p>
    </>
  );
}

export function TrackCard({ d }: Of<typeof D.track>) {
  return (
    <div className="flex flex-1 flex-col gap-5 sm:flex-row sm:items-center">
      <Photo photo={PHOTOS.album} className="aspect-square w-full shrink-0 rounded-[10px] object-cover sm:w-[176px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <p data-arrivo="static" className={label}>
            Now playing
          </p>
          <h4 className="mt-1 text-[26px] leading-tight font-semibold tracking-[-0.025em]">{d.title}</h4>
          <p className="text-[14.5px] text-ink-2">{d.artist}</p>
        </div>
        <div className="flex items-center justify-between font-mono text-[12.5px] text-muted">
          <span>{d.elapsed}</span>
          <span>{d.length}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div data-arrivo="static" className="flex items-center gap-2 text-ink">
            <SkipBackIcon size={20} weight="fill" />
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-ink text-bg">
              <PlayIcon size={17} weight="fill" />
            </span>
            <SkipForwardIcon size={20} weight="fill" />
          </div>
          <p className="truncate text-[13px] text-muted">
            <span data-arrivo="static">Up next: </span>
            {d.next}
          </p>
        </div>
      </div>
    </div>
  );
}

export function WeatherCard({ d }: Of<typeof D.weather>) {
  return (
    <>
      <Photo photo={PHOTOS.peak} className="aspect-[21/9] w-full rounded-[10px] object-cover" />
      <div className="flex items-end justify-between gap-6 px-1 pt-1">
        <div className="min-w-0">
          <p className="text-[17px] font-semibold tracking-[-0.01em]">{d.place}</p>
          <p className="text-[13.5px] text-ink-2">{d.note}</p>
        </div>
        <div className="flex items-end gap-4">
          <p className={`${label} pb-1 text-right`}>
            <span data-arrivo="static">H </span>
            {d.high}
            <span data-arrivo="static"> L </span>
            {d.low}
          </p>
          <p className="font-mono text-[44px] leading-none tracking-[-0.04em]">{d.temp}</p>
        </div>
      </div>
    </>
  );
}
