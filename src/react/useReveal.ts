import * as React from 'react';
import { createReveal, type RevealController, type RevealOptions, type RevealState } from '../core/controller';
import type { Origin } from '../core/types';

export const useIsoLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export type UseRevealOptions<O = object> = Omit<RevealOptions<O>, 'canvas' | 'onStateChange'>;

export interface UseRevealResult {
  /** Attach to the element whose content should reveal. */
  ref: (el: HTMLElement | null) => void;
  state: RevealState;
  replay(opts?: { origin?: Origin; idle?: number }): void;
  hide(): void;
}

/**
 * Hook form of `<Reveal>` for custom wrappers. The controller is created when the ref
 * attaches; `loading` changes are applied after React commits, so reveals measure the
 * new content before it paints.
 */
export function useReveal<O>(opts: UseRevealOptions<O>, canvasRef?: React.RefObject<HTMLCanvasElement | null>): UseRevealResult {
  const ctrl = React.useRef<RevealController | null>(null);
  const node = React.useRef<HTMLElement | null>(null);
  const latest = React.useRef(opts);
  latest.current = opts;
  const [state, setState] = React.useState<RevealState>('idle');

  const ref = React.useCallback(
    (el: HTMLElement | null) => {
      if (el === node.current) return;
      ctrl.current?.destroy();
      ctrl.current = null;
      node.current = el;
      if (!el) return;
      ctrl.current = createReveal(el, {
        ...latest.current,
        canvas: canvasRef?.current ?? undefined,
        onStateChange: setState,
        onRevealComplete: () => latest.current.onRevealComplete?.(),
      });
    },
    [canvasRef],
  );

  // Options first: when the effect and `loading` change in one render, the loading
  // state starts once, with the new effect.
  useIsoLayoutEffect(() => {
    const { effect, options, origin, duration, speed, lazy, selector, minIdle, reducedMotion, seed } = opts;
    ctrl.current?.update({ effect, options, origin, duration, speed, lazy, selector, minIdle, reducedMotion, seed });
  });

  useIsoLayoutEffect(() => {
    ctrl.current?.setLoading(!!opts.loading);
  }, [opts.loading]);

  useIsoLayoutEffect(
    () => () => {
      ctrl.current?.destroy();
      ctrl.current = null;
      node.current = null;
    },
    [],
  );

  const replay = React.useCallback((o?: { origin?: Origin; idle?: number }) => ctrl.current?.replay(o), []);
  const hide = React.useCallback(() => ctrl.current?.hide(), []);
  return { ref, state, replay, hide };
}
