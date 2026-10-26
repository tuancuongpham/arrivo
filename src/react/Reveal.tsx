import * as React from 'react';
import type { Effect, Origin } from '../core/types';
import { useReveal } from './useReveal';

export interface RevealProps<O = object> extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  effect: Effect<O, any>;
  /** Effect-specific options. */
  options?: Partial<O>;
  /** While true the content is hidden and the loading animation runs; flipping to false reveals the new content. */
  loading?: boolean;
  /** Reveal once on mount when not loading. Default `true`. */
  revealOnMount?: boolean;
  /** Also animate content that was server-rendered and is being hydrated. Default `false`. */
  revealOnHydrate?: boolean;
  /** Where the reveal starts. `{ x, y }` is in viewport pixels. Default `'center'`. */
  origin?: Origin;
  /** Milliseconds, or `'fast'` (default) / `'cinematic'`. */
  duration?: number | 'fast' | 'cinematic';
  speed?: number;
  /** Wait until scrolled into view. Default `true`. */
  lazy?: boolean;
  /** Animate only matching descendants. */
  selector?: string;
  /** Minimum loading time, in milliseconds, before an effect plays. Default `0`. */
  minIdle?: number;
  /** Loads shorter than this many milliseconds skip the effect and fade in; `0` always plays it. Default `500`. */
  fadeUnder?: number;
  /** `'auto'` follows `prefers-reduced-motion`. */
  reducedMotion?: boolean | 'auto';
  seed?: number;
  /** Rendered instead of `children` while `loading`. */
  skeleton?: React.ReactNode;
  onRevealComplete?: () => void;
  as?: React.ElementType;
  children?: React.ReactNode;
}

export interface RevealHandle {
  /** Play a short loading phase and reveal again, optionally from a new origin. */
  replay(opts?: { origin?: Origin; idle?: number }): void;
  /** Hide the content and keep the loading animation running. */
  hide(): void;
  readonly element: HTMLElement | null;
}

const subscribe = (): (() => void) => () => {};
const useSyncExternalStore = (React as { useSyncExternalStore?: typeof React.useSyncExternalStore }).useSyncExternalStore;

/** True during the server render and the hydration pass (React 18+). */
function useHydrating(): boolean {
  return useSyncExternalStore ? useSyncExternalStore(subscribe, () => false, () => true) : false;
}

function RevealImpl<O>(props: RevealProps<O>, ref: React.ForwardedRef<RevealHandle>): React.ReactElement {
  const {
    effect,
    options,
    loading = false,
    revealOnMount = true,
    revealOnHydrate = false,
    origin,
    duration,
    speed,
    lazy,
    selector,
    minIdle,
    fadeUnder,
    reducedMotion,
    seed,
    skeleton,
    onRevealComplete,
    as: Tag = 'div',
    className,
    children,
    ...rest
  } = props;
  const hydrating = useHydrating();
  const [mountReveal] = React.useState(() => revealOnMount && (!hydrating || revealOnHydrate));
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const element = React.useRef<HTMLElement | null>(null);
  const reveal = useReveal<O>(
    { effect, options, loading, revealOnMount: mountReveal, origin, duration, speed, lazy, selector, minIdle, fadeUnder, reducedMotion, seed, onRevealComplete },
    canvasRef,
  );
  const attach = reveal.ref;
  const setRef = React.useCallback(
    (el: HTMLElement | null) => {
      element.current = el;
      attach(el);
    },
    [attach],
  );
  React.useImperativeHandle(
    ref,
    () => ({
      replay: reveal.replay,
      hide: reveal.hide,
      get element() {
        return element.current;
      },
    }),
    [reveal.replay, reveal.hide],
  );
  return (
    <Tag ref={setRef} className={className ? `arrivo ${className}` : 'arrivo'} {...rest}>
      {loading && skeleton !== undefined ? skeleton : children}
      <canvas ref={canvasRef} className="arrivo-ov" aria-hidden="true" />
    </Tag>
  );
}

/**
 * Wrap any subtree. While `loading`, the content hides and the effect's loading animation
 * plays where it will land; when `loading` turns false the new content is revealed in place.
 */
export const Reveal = React.forwardRef(RevealImpl) as <O>(
  props: RevealProps<O> & { ref?: React.Ref<RevealHandle> },
) => React.ReactElement | null;
