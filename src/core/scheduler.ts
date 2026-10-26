export interface Job {
  /** Return `false` to unschedule. */
  frame(now: number): boolean | void;
  /** Off-screen jobs stay registered but are skipped. */
  visible: boolean;
}

const SLOW_FRAME_MS = 45;
const SLOW_FRAMES = 8;
const DEGRADE_MS = 10_000;

/**
 * One `requestAnimationFrame` loop for every reveal on the page. A watchdog watches frame
 * gaps: after 8 consecutive frames slower than 45 ms it flags the page as degraded for 10 s,
 * and controllers finish running reveals and fall back to a fade meanwhile.
 */
class Scheduler {
  private jobs = new Set<Job>();
  private raf = 0;
  private last = 0;
  private slow = 0;
  private degradedUntil = 0;
  /** Exponential moving average of time spent in jobs per frame, in milliseconds; 0 while idle. */
  workMs = 0;
  /** Jobs that drew in the latest frame. */
  active = 0;

  get degraded(): boolean {
    return now() < this.degradedUntil;
  }

  add(job: Job): void {
    this.jobs.add(job);
    this.wake();
  }

  delete(job: Job): void {
    this.jobs.delete(job);
  }

  /** Restart the loop, e.g. after a job becomes visible again. */
  wake(): void {
    if (!this.raf && typeof requestAnimationFrame !== 'undefined' && this.anyVisible()) {
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  private anyVisible(): boolean {
    for (const j of this.jobs) if (j.visible) return true;
    return false;
  }

  private loop = (ts: number): void => {
    this.raf = 0;
    const gap = this.last ? ts - this.last : 16;
    this.last = ts;
    const hidden = typeof document !== 'undefined' && document.hidden;
    if (!hidden && gap > SLOW_FRAME_MS && gap < 1000) {
      if (++this.slow >= SLOW_FRAMES) {
        this.degradedUntil = now() + DEGRADE_MS;
        this.slow = 0;
      }
    } else {
      this.slow = 0;
    }
    const t0 = now();
    let ran = 0;
    for (const job of Array.from(this.jobs)) {
      if (!job.visible) continue;
      ran++;
      try {
        if (job.frame(ts) === false) this.jobs.delete(job);
      } catch (err) {
        this.jobs.delete(job);
        console.error('arrivo:', err);
      }
    }
    this.workMs = this.workMs * 0.9 + (now() - t0) * 0.1;
    this.active = ran;
    if (this.anyVisible()) this.raf = requestAnimationFrame(this.loop);
    else {
      this.last = 0;
      this.workMs = 0;
      this.active = 0;
    }
  };
}

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export const scheduler = new Scheduler();
