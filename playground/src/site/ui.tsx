import { CheckIcon, CopyIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

const cx = (...names: (string | false | null | undefined)[]): string => names.filter(Boolean).join(' ');
export { cx };

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary'; size?: 'md' | 'sm' };

/** Pill buttons. Primary is ink on the page background; secondary is an outlined surface. */
export function Button({ variant = 'secondary', size = 'md', className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[transform,background-color,border-color,color] duration-200 active:scale-[0.98]',
        size === 'md' ? 'h-11 px-5 text-[15px]' : 'h-8 px-3.5 text-[13px]',
        variant === 'primary'
          ? 'bg-ink text-bg hover:bg-ink/85'
          : 'border border-line-2 bg-surface text-ink hover:border-ink/30',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-2 transition-[transform,background-color,color] duration-200 hover:bg-surface-2 hover:text-ink active:scale-[0.94]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Radio group drawn as a pill track; the active thumb slides between options. */
export function Segmented<T extends string | number>({
  name,
  label,
  value,
  options,
  onChange,
  showLabel = true,
}: {
  name: string;
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
  showLabel?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-0.5">
      {showLabel && <span className="hidden pr-1.5 pl-2 text-[12.5px] text-muted lg:inline">{label}</span>}
      {options.map(([v, text]) => {
        const active = v === value;
        return (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className="relative h-8 rounded-full px-3 text-[13px] font-medium whitespace-nowrap transition-colors active:scale-[0.97]"
          >
            {active && (
              <motion.span
                layoutId={`segment-${name}`}
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className={cx('relative', active ? 'text-bg' : 'text-ink-2 hover:text-ink')}>{text}</span>
          </button>
        );
      })}
    </div>
  );
}

/** `shortLabel` replaces the visible text on phones; the accessible name stays `label`. */
export function Switch({
  label,
  shortLabel,
  checked,
  onChange,
}: {
  label: string;
  shortLabel?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="relative flex h-8 cursor-pointer items-center gap-2.5 rounded-full px-2.5 text-[13px] font-medium whitespace-nowrap text-ink-2 hover:text-ink">
      {/* The real checkbox covers the whole pill, invisible, so it takes every click and keeps native focus. */}
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        className="peer absolute inset-0 z-10 cursor-pointer appearance-none rounded-full opacity-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden="true"
        className={cx(
          'relative inline-flex h-[18px] w-[30px] items-center rounded-full transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          checked ? 'bg-accent' : 'bg-line-2',
        )}
      >
        <span
          className={cx(
            'absolute size-[14px] rounded-full bg-surface shadow-sm transition-transform duration-200',
            checked ? 'translate-x-[14px]' : 'translate-x-[2px]',
          )}
        />
      </span>
      {shortLabel ? (
        <>
          <span className="sm:hidden">{shortLabel}</span>
          <span className="max-sm:hidden">{label}</span>
        </>
      ) : (
        label
      )}
    </label>
  );
}

/** Copies `text` and confirms with a check for a moment. */
export function CopyChip({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (): void => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : `Copy ${text}`}
      className={cx(
        'group inline-flex h-11 shrink-0 items-center gap-3 rounded-full border border-line-2 bg-surface pr-4 pl-5 font-mono text-[14px] text-ink transition-[transform,border-color] duration-200 hover:border-ink/30 active:scale-[0.98]',
        className,
      )}
    >
      <span>
        <span className="text-muted">$ </span>
        {text}
      </span>
      <span className="text-muted transition-colors group-hover:text-ink">{copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}</span>
    </button>
  );
}

export function SectionHeading({ id, title, children }: { id?: string; title: string; children?: ReactNode }) {
  return (
    <div className="max-w-[640px]">
      <h2 id={id} className="text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] text-ink md:text-[44px]">
        {title}
      </h2>
      {children && <p className="mt-4 max-w-[58ch] text-[16.5px] leading-relaxed text-ink-2">{children}</p>}
    </div>
  );
}
