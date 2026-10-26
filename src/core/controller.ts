import { fillRoundRect } from './geom';
import { scheduler, type Job } from './scheduler';
import { createStage } from './stage';
import { ensureStyles } from './styles';
import { rgba } from './theme';
import type { Effect, IdleRun, Origin, RevealRun, Stage } from './types';

export type RevealState = 'idle' | 'loading' | 'revealing' | 'settling';

export interface RevealOptions<O = object> {
  effect: Effect<O, any>;
  /** Effect-specific options. */
  options?: Partial<O>;
  /** Overlay canvas to draw on; one is created and appended to the root when omitted. */
  canvas?: HTMLCanvasElement;
  loading?: boolean;
  /** Reveal the content once on creation when not loading. Default `true`. */
  revealOnMount?: boolean;
  /** Where the reveal starts. `{ x, y }` is in viewport pixels. Default `'center'`. */
  origin?: Origin;
  /** Milliseconds, or `'fast'` (the effect's default) / `'cinematic'` (1.8× slower). */
  duration?: number | 'fast' | 'cinematic';
  /** Playback multiplier for both the loading animation and the reveal. Default `1`. */
  speed?: number;
  /** Wait until the content is on screen before revealing. Default `true`. */
  lazy?: boolean;
  /** Animate only matching descendants. */
  selector?: string;
  /** Override the effect's minimum loading time, in milliseconds. */
  minIdle?: number;
  /** `'auto'` follows `prefers-reduced-motion`. Default `'auto'`. */
  reducedMotion?: boolean | 'auto';
  seed?: number;
  onRevealComplete?: () => void;
  onStateChange?: (state: RevealState) => void;
}

export interface RevealController {
  readonly state: RevealState;
  /** `true` hides the content and runs the loading animation; `false` reveals the current content. */
  setLoading(loading: boolean): void;
  /** Run a short loading phase, then reveal again. */
  replay(opts?: { origin?: Origin; idle?: number }): void;
  /** Hide the content and keep the loading animation running until `setLoading(false)` or `replay()`. */
  hide(): void;
  update(opts: Partial<RevealOptions<any>>): void;
  destroy(): void;
}

export interface RevealEventDetail {
  active: boolean;
  state: RevealState;
}

const SETTLE_MS = 220;
const FADE_MS = 150;
const REPLAY_IDLE_MS = 450;
/** A pending reveal that sees no animation frames for this long just shows the content. */
const STALL_MS = 2000;

const now = (): number => performance.now();

type VisibilityCallback = (visible: boolean) => void;
const watchers = new Map<Element, VisibilityCallback>();
let io: IntersectionObserver | null = null;

function observeVisibility(el: Element, cb: VisibilityCallback): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  io ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) watchers.get(e.target)?.(e.isIntersecting);
    },
    { rootMargin: '120px 0px' },
  );
  watchers.set(el, cb);
  io.observe(el);
  return () => {
    watchers.delete(el);
    io?.unobserve(el);
  };
}

let lastPointer: { x: number; y: number } | null = null;
let pointerTracked = false;

/** One passive listener for the whole page; `origin: 'pointer'` reads the latest position. */
function trackPointer(): void {
  if (pointerTracked || typeof window === 'undefined') return;
  pointerTracked = true;
  const save = (e: PointerEvent): void => {
    lastPointer = { x: e.clientX, y: e.clientY };
  };
  window.addEventListener('pointermove', save, { passive: true });
  window.addEventListener('pointerdown', save, { passive: true });
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function fontsLoading(): boolean {
  return typeof document !== 'undefined' && !!document.fonts && document.fonts.status === 'loading';
}

/** Muted bars where content will land: the loading state under reduced motion. */
function drawStaticSkeleton(stage: Stage): void {
  const { ctx, theme } = stage;
  ctx.fillStyle = rgba(theme.muted, 0.35);
  for (const t of stage.targets) fillRoundRect(ctx, t.x, t.y, t.w, t.h, Math.max(3, t.radius));
}

class Controller implements RevealController {
  state: RevealState = 'idle';
  private o: RevealOptions<any>;
  private canvas: HTMLCanvasElement;
  private ownCanvas: boolean;
  private stage: Stage | null = null;
  private idleRun: IdleRun | null = null;
  private revealRun: RevealRun | null = null;
  private loadAt = 0;
  private revealAt = 0;
  private settleAt = 0;
  private settleMs = SETTLE_MS;
  private dur = 1;
  private minIdle = 0;
  private wantReveal = false;
  private visible = true;
  private originOverride: Origin | undefined;
  private size = '';
  private job: Job;
  private unobserve: () => void;
  private ro: ResizeObserver | null = null;
  private destroyed = false;
  private frames = 0;
  private stallTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private root: HTMLElement,
    opts: RevealOptions<any>,
  ) {
    this.o = { revealOnMount: true, lazy: true, speed: 1, reducedMotion: 'auto', seed: 1, ...defined(opts), effect: opts.effect };
    ensureStyles(this.o.effect);
    root.classList.add('arrivo');
    root.setAttribute('data-arrivo-effect', this.o.effect.name);
    this.ownCanvas = !opts.canvas;
    this.canvas = opts.canvas ?? document.createElement('canvas');
    this.canvas.classList.add('arrivo-ov');
    this.canvas.setAttribute('aria-hidden', 'true');
    if (this.ownCanvas) root.appendChild(this.canvas);

    this.job = { visible: true, frame: (ts) => this.frame(ts) };
    this.unobserve = observeVisibility(root, (v) => {
      this.visible = v;
      this.job.visible = v;
      if (v) scheduler.wake();
    });
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(this.onResize);
      this.ro.observe(root);
    }
    trackPointer();

    if (this.o.loading) this.setLoading(true);
    else if (this.o.revealOnMount) {
      this.enterLoading();
      this.wantReveal = true;
      this.armStall();
    }
  }

  private get speed(): number {
    return Math.max(0.05, this.o.speed ?? 1);
  }

  private reduced(): boolean {
    const r = this.o.reducedMotion;
    return r === 'auto' || r === undefined ? prefersReducedMotion() : r;
  }

  private measure(): Stage {
    const stage = createStage({
      root: this.root,
      canvas: this.canvas,
      selector: this.o.selector,
      origin: this.originOverride ?? this.o.origin,
      pointer: lastPointer,
      seed: this.o.seed,
    });
    this.size = `${this.root.clientWidth}x${this.root.clientHeight}`;
    return stage;
  }

  private setHidden(hidden: boolean): void {
    this.root.setAttribute('data-arrivo-state', hidden ? 'hidden' : 'shown');
  }

  private emit(active: boolean): void {
    const detail: RevealEventDetail = { active, state: this.state };
    this.root.dispatchEvent(new CustomEvent('arrivo', { bubbles: true, detail }));
  }

  private setState(s: RevealState): void {
    if (this.state === s) return;
    this.state = s;
    this.o.onStateChange?.(s);
  }

  private disposeRuns(): void {
    try {
      this.idleRun?.dispose?.();
      this.revealRun?.dispose?.();
    } catch (err) {
      console.error('arrivo:', err);
    }
    this.idleRun = null;
    this.revealRun = null;
  }

  private enterLoading(): void {
    this.disposeRuns();
    this.canvas.style.opacity = '';
    const stage = (this.stage = this.measure());
    stage.clear();
    this.setHidden(true);
    this.root.setAttribute('aria-busy', 'true');
    this.loadAt = now();
    const wasIdle = this.state === 'idle';
    this.setState('loading');
    if (wasIdle) this.emit(true);
    const { effect } = this.o;
    this.minIdle = (this.o.minIdle ?? effect.minIdle ?? 0) / this.speed;
    if (this.reduced()) drawStaticSkeleton(stage);
    else {
      try {
        this.idleRun = effect.idle(stage, this.o.options ?? {});
        // Paint now: the content is already hidden and must not sit blank until the next frame.
        this.idleRun.frame(0);
      } catch (err) {
        console.error('arrivo:', err);
        this.idleRun = null;
        stage.clear();
        drawStaticSkeleton(stage);
      }
    }
    scheduler.add(this.job);
  }

  setLoading(loading: boolean): void {
    if (this.destroyed) return;
    if (loading) {
      this.wantReveal = false;
      if (this.state !== 'loading') this.enterLoading();
      return;
    }
    if (this.state === 'loading') {
      this.wantReveal = true;
      this.armStall();
      this.tryReveal();
    }
  }

  /**
   * Some hosts stop delivering animation frames to a visible page (occluded windows,
   * embedded webviews). Never leave content hidden on that account.
   */
  private armStall(): void {
    clearTimeout(this.stallTimer);
    const seen = this.frames;
    this.stallTimer = setTimeout(() => {
      const pending = (this.state === 'loading' && this.wantReveal) || this.state === 'revealing' || this.state === 'settling';
      if (this.destroyed || !pending) return;
      if (this.frames === seen && this.visible) this.finish();
      else this.armStall();
    }, STALL_MS);
  }

  replay(opts: { origin?: Origin; idle?: number } = {}): void {
    if (this.destroyed) return;
    this.originOverride = opts.origin;
    this.enterLoading();
    this.minIdle = Math.max(this.minIdle, (opts.idle ?? REPLAY_IDLE_MS) / this.speed);
    this.wantReveal = true;
    this.armStall();
  }

  hide(): void {
    if (this.destroyed) return;
    this.wantReveal = false;
    this.enterLoading();
  }

  update(next: Partial<RevealOptions<any>>): void {
    if (this.destroyed) return;
    const changed = next.effect !== undefined && next.effect !== this.o.effect;
    Object.assign(this.o, defined(next));
    if (!changed) return;
    ensureStyles(this.o.effect);
    this.root.setAttribute('data-arrivo-effect', this.o.effect.name);
    if (this.state === 'loading') {
      const want = this.wantReveal;
      const at = this.loadAt;
      this.enterLoading();
      this.loadAt = at;
      this.wantReveal = want;
    }
  }

  private tryReveal(): void {
    if (!this.wantReveal || this.state !== 'loading' || fontsLoading()) return;
    if (!this.visible) {
      if (!this.o.lazy) this.finish();
      return;
    }
    if (!this.reduced() && now() - this.loadAt < this.minIdle) return;
    this.startReveal();
  }

  private startReveal(): void {
    this.wantReveal = false;
    let handoff: unknown;
    try {
      handoff = this.idleRun?.handoff?.();
    } catch (err) {
      console.error('arrivo:', err);
    }
    this.disposeRuns();
    const stage = (this.stage = this.measure());
    this.originOverride = undefined;
    if (this.reduced() || scheduler.degraded) {
      this.beginFade(stage);
      return;
    }
    const { effect } = this.o;
    try {
      this.revealRun = effect.reveal(stage, this.o.options ?? {}, handoff);
      // Draw the cover before the content becomes visible, or it flashes for a frame.
      stage.clear();
      this.revealRun.frame(0, (now() - this.loadAt) * this.speed);
    } catch (err) {
      console.error('arrivo:', err);
      this.disposeRuns();
      this.beginFade(stage);
      return;
    }
    const d = this.o.duration;
    const factor = typeof d === 'number' ? d / effect.duration : d === 'cinematic' ? 1.8 : 1;
    this.dur = Math.max(16, ((this.revealRun.duration ?? effect.duration) * factor) / this.speed);
    if (effect.show === 'start') this.setHidden(false);
    this.revealAt = now();
    this.setState('revealing');
  }

  /** Reduced motion, a degraded page or a failing effect: cover the targets and fade it away. */
  private beginFade(stage: Stage): void {
    stage.clear();
    stage.ctx.fillStyle = rgba(stage.theme.surface);
    stage.ctx.fill(stage.clip);
    this.setHidden(false);
    this.settleAt = now();
    this.settleMs = FADE_MS;
    this.setState('settling');
  }

  private frame(ts: number): boolean {
    const stage = this.stage;
    if (!stage || this.destroyed) return false;
    this.frames++;
    const t = Math.max(ts, this.loadAt);
    switch (this.state) {
      case 'loading':
        if (this.idleRun) {
          stage.clear();
          this.idleRun.frame((t - this.loadAt) * this.speed);
        }
        this.tryReveal();
        return true;
      case 'revealing': {
        if (scheduler.degraded) {
          this.finish();
          return false;
        }
        const p = Math.min(1, Math.max(0, (t - this.revealAt) / this.dur));
        stage.clear();
        this.revealRun?.frame(p, (t - this.loadAt) * this.speed);
        if (p >= 1) {
          this.setHidden(false);
          this.settleAt = t;
          this.settleMs = SETTLE_MS;
          this.setState('settling');
        }
        return true;
      }
      case 'settling': {
        const q = Math.min(1, Math.max(0, (t - this.settleAt) / this.settleMs));
        this.canvas.style.opacity = String(1 - q);
        if (q >= 1) {
          this.finish();
          return false;
        }
        return true;
      }
      default:
        return false;
    }
  }

  private finish(): void {
    const was = this.state;
    this.disposeRuns();
    this.stage?.clear();
    this.canvas.style.opacity = '';
    this.setHidden(false);
    this.root.removeAttribute('aria-busy');
    this.wantReveal = false;
    clearTimeout(this.stallTimer);
    scheduler.delete(this.job);
    this.setState('idle');
    if (was !== 'idle') {
      this.emit(false);
      this.o.onRevealComplete?.();
    }
  }

  private onResize = (): void => {
    const key = `${this.root.clientWidth}x${this.root.clientHeight}`;
    if (key === this.size) return;
    this.size = key;
    if (this.state === 'loading') {
      const want = this.wantReveal;
      const at = this.loadAt;
      this.enterLoading();
      this.loadAt = at;
      this.wantReveal = want;
    } else if (this.state !== 'idle') {
      this.finish();
    }
  };

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    clearTimeout(this.stallTimer);
    this.disposeRuns();
    scheduler.delete(this.job);
    this.unobserve();
    this.ro?.disconnect();
    if (this.ownCanvas) this.canvas.remove();
    else this.stage?.clear();
    this.root.removeAttribute('data-arrivo-state');
    this.root.removeAttribute('aria-busy');
  }
}

function defined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] !== undefined) out[k] = o[k];
  return out;
}

/** Attach a reveal to `root`. Framework-agnostic; the React component is a thin wrapper. */
export function createReveal<O>(root: HTMLElement, opts: RevealOptions<O>): RevealController {
  return new Controller(root, opts as RevealOptions<any>);
}
