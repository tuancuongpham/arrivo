import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Origin } from '@brottin/arrivo';
import { E2E } from './data';
import { preload, type PhotoSpec } from './photo';

export interface Controls {
  hold: boolean;
  speed: number;
  origin: Origin;
  /** Bumped by "Replay all"; every card refetches when it changes. */
  replayAll: number;
}

const DEFAULTS: Controls = { hold: false, speed: E2E ? 2 : 1, origin: 'center', replayAll: 0 };
/** `?latency=ms` overrides the fake request time; `?latency=100` shows a fast load fading in. */
const LATENCY_PARAM = typeof location === 'undefined' ? NaN : Number(new URLSearchParams(location.search).get('latency') ?? NaN);
// The e2e run stays above the 500 ms fast-load threshold, so the effects still play.
const LATENCY_MS = LATENCY_PARAM >= 0 ? LATENCY_PARAM : E2E ? 600 : 1400;

interface ControlsApi {
  controls: Controls;
  set: <K extends keyof Controls>(key: K, value: Controls[K]) => void;
}

const ControlsContext = createContext<ControlsApi>({ controls: DEFAULTS, set: () => {} });

export function ControlsProvider({ children }: { children: ReactNode }) {
  const [controls, setControls] = useState(DEFAULTS);
  const set = useCallback<ControlsApi['set']>((key, value) => setControls((c) => ({ ...c, [key]: value })), []);
  const api = useMemo(() => ({ controls, set }), [controls, set]);
  return <ControlsContext.Provider value={api}>{children}</ControlsContext.Provider>;
}

export const useControls = (): ControlsApi => useContext(ControlsContext);

/** Shared motion props for every demo `<Reveal>`. */
export function useRevealMotion() {
  const { controls } = useControls();
  return { speed: controls.speed, origin: controls.origin };
}

/**
 * A pretend request: `loading` while in flight, then fresh data once its photos have
 * decoded. It only goes out while `active` (the card is on screen), so every card plays
 * its loading state and reveal as it scrolls into view. "Hold loading" keeps it in
 * flight; "Replay all" restarts it.
 */
export function useMockFetch<T>(make: () => T, photos: PhotoSpec[] = [], active = true) {
  const { controls } = useControls();
  const [value, setValue] = useState(make);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const source = useRef({ make, photos });
  source.current = { make, photos };

  const refetch = useCallback(() => {
    setLoading(true);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (controls.replayAll) refetch();
  }, [controls.replayAll, refetch]);

  useEffect(() => {
    if (!loading || controls.hold || !active) return;
    let live = true;
    const id = setTimeout(
      () => {
        void preload(...source.current.photos).then(() => {
          if (!live) return;
          setValue(source.current.make());
          setLoading(false);
        });
      },
      LATENCY_MS * (E2E ? 1 : 0.75 + Math.random() * 0.5),
    );
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [loading, controls.hold, active, tick]);

  return { value, loading, refetch };
}
