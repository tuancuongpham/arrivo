import { GithubLogoIcon } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { CodeBlock } from './Code';
import { E2E } from './data';
import { Logo, REPO_URL } from './Nav';

const STATS = [
  { value: '0 px', label: 'Layout shift', note: 'Content keeps its box while hidden, so nothing moves when it lands.' },
  { value: '< 3 ms', label: 'Per frame', note: 'Every effect at 640 × 360 in headless Edge, measured by the bundled bench.' },
  { value: '8.5 KB', label: 'Core, gzipped', note: 'Each effect adds 0.7 to 3.4 KB and tree-shakes away when unused.' },
  { value: '150 ms', label: 'Reduced motion', note: 'With reduced motion on, every reveal becomes a short fade.' },
];

/** Measured numbers, laid out as a plain row: no cards, hairlines between columns on desktop. */
export function Stats() {
  return (
    <section aria-labelledby="stats" className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 lg:py-32">
      <h2 id="stats" className="text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] text-ink md:text-[44px]">
        Built to stay out of the way.
      </h2>
      <div className="mt-14 grid grid-cols-1 gap-y-12 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-line">
        {STATS.map((s) => (
          <div key={s.label} className="lg:px-8 lg:first:pl-0 lg:last:pr-0">
            <p className="font-mono text-[44px] leading-none font-medium tracking-[-0.045em] text-ink md:text-[52px]">{s.value}</p>
            <p className="mt-4 text-[15px] font-medium text-ink">{s.label}</p>
            <p className="mt-1.5 max-w-[30ch] text-[14px] leading-relaxed text-muted">{s.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: 'Install',
    note: 'React 17 or newer. No runtime dependencies.',
    code: 'npm i @brottin/arrivo',
  },
  {
    title: 'Wrap your content',
    note: 'While loading is true the content hides and the effect plays where it will land.',
    code: `import { Reveal } from '@brottin/arrivo';
import { halftone } from '@brottin/arrivo/effects';

<Reveal effect={halftone} loading={isLoading}>
  <ArticleCard post={post} />
</Reveal>`,
  },
  {
    title: 'Keep the chrome',
    note: 'Labels and buttons can stay visible; chips can keep their background.',
    code: `<span data-arrivo="static">Weekly active users</span>
<span data-arrivo="frame"><span>{delta}</span></span>
<div data-arrivo="block" className="progress" />`,
  },
  {
    title: 'Start from a skeleton',
    note: 'On the first load there is nothing to measure yet, so show bars instead.',
    code: `<Reveal effect={flap} loading={!stats}
        skeleton={<Skeleton lines={2} widths={['40%', '70%']} />}>
  {stats && <Kpi value={stats.users} />}
</Reveal>`,
  },
  {
    title: 'Write your own',
    note: 'An effect is two draw functions over a measured stage.',
    code: `export const wipe = defineEffect({
  name: 'wipe', show: 'start', duration: 800,
  idle: (stage) => ({ frame: (t) => drawShimmer(stage, t) }),
  reveal: (stage) => ({ frame: (p) => coverFrom(stage, p) }),
});`,
  },
];

export function GetStarted() {
  const reduce = useReducedMotion() || E2E;
  return (
    <section aria-labelledby="install" className="border-t border-line">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-12 px-5 py-24 md:px-8 lg:grid-cols-12 lg:gap-16 lg:py-32">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-24">
            <h2 id="install" className="text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] text-ink md:text-[44px]">
              Install, wrap, reveal.
            </h2>
            <p className="mt-4 max-w-[36ch] text-[16.5px] leading-relaxed text-ink-2">
              One wrapper component, thirteen effects to import, and a small core you can drive without React.
            </p>
          </div>
        </div>
        <ol className="flex flex-col gap-12 lg:col-span-8">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.title}
              {...(reduce
                ? {}
                : {
                    initial: { opacity: 0, y: 18 },
                    whileInView: { opacity: 1, y: 0 },
                    viewport: { once: true, amount: 0.4 },
                    transition: { duration: 0.6, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] },
                  })}
            >
              <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-ink">{s.title}</h3>
              <p className="mt-1 mb-4 text-[15px] text-ink-2">{s.note}</p>
              <CodeBlock code={s.code} label={s.title.toLowerCase()} />
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 py-10 text-[14px] text-muted md:flex-row md:items-center md:justify-between md:px-8">
        <p className="flex items-center gap-2.5">
          <Logo className="size-6" />
          <span className="font-mono text-ink">arrivo</span>
          <span>MIT licensed</span>
        </p>
        <a href={REPO_URL} className="inline-flex items-center gap-2 transition-colors hover:text-ink">
          <GithubLogoIcon size={16} />
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
