import { DesktopIcon, GithubLogoIcon, MoonIcon, SunIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { IconButton } from './ui';

export const REPO_URL = 'https://github.com/tuancuongpham/arrivo';

type ThemeChoice = 'system' | 'light' | 'dark';
const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem('arrivo-theme');
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Resolves the choice to `data-theme` on <html>; "system" follows the OS live. */
function useTheme(): [ThemeChoice, () => void] {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = (): void => {
      document.documentElement.dataset.theme = choice === 'system' ? (mq.matches ? 'dark' : 'light') : choice;
    };
    apply();
    try {
      localStorage.setItem('arrivo-theme', choice);
    } catch {
      // Private mode: the choice simply won't persist.
    }
    if (choice !== 'system') return;
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [choice]);
  const cycle = (): void => setChoice((c) => ORDER[(ORDER.indexOf(c) + 1) % ORDER.length]);
  return [choice, cycle];
}

/** Three skeleton bars, the top one lit: the mark is the idea. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--ink)" />
      <rect x="7" y="9" width="18" height="4" rx="2" fill="var(--accent)" />
      <rect x="7" y="15" width="13" height="4" rx="2" fill="var(--bg)" />
      <rect x="7" y="21" width="8" height="4" rx="2" fill="var(--bg)" opacity="0.45" />
    </svg>
  );
}

const LINKS = [
  ['#effects', 'Effects'],
  ['#threshold', 'Threshold maps'],
  ['#playground', 'Playground'],
  ['#install', 'Install'],
] as const;

export function Nav() {
  const [theme, cycle] = useTheme();
  const Icon = theme === 'light' ? SunIcon : theme === 'dark' ? MoonIcon : DesktopIcon;
  return (
    <header className="relative z-20">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-5 md:px-8">
        <a href="#top" className="flex items-center gap-2.5 font-mono text-[15px] font-medium tracking-tight text-ink">
          <Logo className="size-7" />
          arrivo
        </a>
        <div className="hidden items-center gap-8 text-[14px] text-ink-2 md:flex">
          {LINKS.map(([href, text]) => (
            <a key={href} href={href} className="transition-colors hover:text-ink">
              {text}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={REPO_URL}
            aria-label="Source on GitHub"
            title="Source on GitHub"
            className="inline-flex size-8 items-center justify-center rounded-full border border-line text-ink-2 transition-[transform,background-color,color] duration-200 hover:bg-surface-2 hover:text-ink active:scale-[0.94]"
          >
            <GithubLogoIcon size={16} />
          </a>
          <IconButton label={`Theme: ${theme}`} onClick={cycle} className="border border-line">
            <Icon size={16} />
          </IconButton>
        </div>
      </nav>
    </header>
  );
}
