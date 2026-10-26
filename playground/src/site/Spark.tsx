import { useLayoutEffect, useRef } from 'react';
import { cx } from './ui';

/**
 * Small charts drawn on canvas rather than SVG, so they are real pixels the effects can
 * rasterise (halftone dots them, mosaic blocks them, the swarm lands on them).
 */
function useCanvasPaint(paint: (x: CanvasRenderingContext2D, w: number, h: number, css: CSSStyleDeclaration) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = (): void => {
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      const x = c.getContext('2d');
      if (!x) return;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(x, r.width, r.height, getComputedStyle(c));
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    const mo = new MutationObserver(draw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, deps);
  return ref;
}

export function Spark({ values, className, tone = 'ink' }: { values: number[]; className?: string; tone?: 'ink' | 'accent' }) {
  const ref = useCanvasPaint(
    (x, w, h, css) => {
      const accent = css.getPropertyValue('--accent').trim() || '#cc4a24';
      const stroke = tone === 'accent' ? accent : css.color;
      const lo = Math.min(...values);
      const hi = Math.max(...values);
      const px = (i: number): number => 4 + (i / (values.length - 1)) * (w - 10);
      const py = (v: number): number => h - 5 - ((v - lo) / (hi - lo || 1)) * (h - 14);
      x.beginPath();
      x.moveTo(px(0), h);
      values.forEach((v, i) => x.lineTo(px(i), py(v)));
      x.lineTo(px(values.length - 1), h);
      x.closePath();
      x.globalAlpha = 0.09;
      x.fillStyle = stroke;
      x.fill();
      x.globalAlpha = 1;
      x.beginPath();
      values.forEach((v, i) => (i ? x.lineTo(px(i), py(v)) : x.moveTo(px(i), py(v))));
      x.strokeStyle = stroke;
      x.lineWidth = 1.75;
      x.lineJoin = 'round';
      x.lineCap = 'round';
      x.stroke();
      x.fillStyle = accent;
      x.beginPath();
      x.arc(px(values.length - 1), py(values[values.length - 1]), 3.5, 0, Math.PI * 2);
      x.fill();
    },
    [values.join(','), tone],
  );
  // The canvas fills a plain box, so its bitmap's aspect ratio never feeds back into the layout.
  return (
    <div className={cx('relative', className)} aria-hidden="true">
      <canvas ref={ref} className="absolute inset-0 size-full" />
    </div>
  );
}

const IRON = ['#000014', '#2a0b5c', '#8c1a8c', '#d6303a', '#f7811e', '#fbd24c', '#ffffe8'];

/** Colour scale for the thermal card, in the same iron palette the effect uses. */
export function HeatScale({ className }: { className?: string }) {
  const ref = useCanvasPaint((x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, 0);
    IRON.forEach((c, i) => g.addColorStop(i / (IRON.length - 1), c));
    x.fillStyle = g;
    x.beginPath();
    x.roundRect(0, 0, w, h, h / 2);
    x.fill();
  }, []);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
