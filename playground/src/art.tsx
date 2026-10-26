import { useLayoutEffect, useRef, type CSSProperties } from 'react';

export type ArtKind = 'land' | 'aura' | 'scene' | 'ink' | 'avatar' | 'sunset' | 'rack' | 'album' | 'peak';

type Painter = (x: CanvasRenderingContext2D, w: number, h: number, seed: number) => void;

const AVATARS = [
  ['#CECBF6', '#534AB7'],
  ['#9FE1CB', '#0F6E56'],
  ['#F5C4B3', '#993C1D'],
  ['#B5D4F4', '#185FA5'],
];

function hills(x: CanvasRenderingContext2D, w: number, h: number, col: string, base: number, amp: number, f: number, ph: number): void {
  x.fillStyle = col;
  x.beginPath();
  x.moveTo(0, h);
  for (let i = 0; i <= 48; i++) x.lineTo((i / 48) * w, h * base - Math.sin((i / 48) * Math.PI * f + ph) * h * amp);
  x.lineTo(w, h);
  x.closePath();
  x.fill();
}

/** Flat illustrations drawn on canvas, so the demo has pixels to work with and no network images. */
const PAINTERS: Record<ArtKind, Painter> = {
  land(x, w, h, seed) {
    x.fillStyle = '#B5D4F4';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#FAC775';
    x.beginPath();
    x.arc(w * (0.62 + (seed % 3) * 0.08), h * 0.36, h * 0.15, 0, 7);
    x.fill();
    hills(x, w, h, '#9FE1CB', 0.62, 0.12, 2.2, 0.4 + seed);
    hills(x, w, h, '#5DCAA5', 0.76, 0.1, 3.1, 2.1 + seed);
    hills(x, w, h, '#1D9E75', 0.9, 0.08, 4.3, 1.2 + seed);
  },
  aura(x, w, h) {
    x.fillStyle = '#F1EFE8';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#F4C0D1';
    x.beginPath();
    x.arc(w * 0.66, h * 0.45, h * 0.55, 0, 7);
    x.fill();
    x.fillStyle = '#CECBF6';
    x.beginPath();
    x.arc(w * 0.36, h * 0.62, h * 0.42, 0, 7);
    x.fill();
    x.fillStyle = '#2C2C2A';
    x.beginPath();
    x.arc(w * 0.52, h * 0.4, h * 0.2, 0, 7);
    x.fill();
    x.beginPath();
    x.ellipse(w * 0.52, h * 1.05, h * 0.42, h * 0.4, 0, 0, 7);
    x.fill();
  },
  scene(x, w, h) {
    x.fillStyle = '#042C53';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#FAEEDA';
    x.beginPath();
    x.arc(w * 0.26, h * 0.3, h * 0.13, 0, 7);
    x.fill();
    x.fillStyle = '#185FA5';
    x.beginPath();
    x.moveTo(0, h * 0.7);
    x.lineTo(w * 0.2, h * 0.42);
    x.lineTo(w * 0.36, h * 0.6);
    x.lineTo(w * 0.55, h * 0.3);
    x.lineTo(w * 0.78, h * 0.58);
    x.lineTo(w, h * 0.44);
    x.lineTo(w, h * 0.7);
    x.closePath();
    x.fill();
    x.fillStyle = '#0C447C';
    x.fillRect(0, h * 0.7, w, h * 0.3);
    x.fillStyle = '#378ADD';
    for (let i = 0; i < 6; i++) x.fillRect(w * (0.1 + i * 0.13), h * (0.76 + (i % 3) * 0.07), w * 0.08, 2);
    x.fillStyle = 'rgba(255,255,255,.92)';
    x.beginPath();
    x.moveTo(w / 2 - 9, h / 2 - 12);
    x.lineTo(w / 2 + 13, h / 2);
    x.lineTo(w / 2 - 9, h / 2 + 12);
    x.closePath();
    x.fill();
  },
  ink(x, w, h) {
    x.fillStyle = '#F1EFE8';
    x.fillRect(0, 0, w, h);
    x.strokeStyle = '#2C2C2A';
    x.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const a0 = 0.35 + i * 0.21;
      x.lineWidth = h * (0.11 - i * 0.0028);
      x.beginPath();
      x.arc(w * 0.45, h * 0.5, h * 0.32, a0, a0 + 0.24);
      x.stroke();
    }
    x.fillStyle = '#E24B4A';
    x.fillRect(w * 0.8, h * 0.66, h * 0.12, h * 0.12);
  },
  avatar(x, w, h, seed) {
    const [bg, fg] = AVATARS[seed % AVATARS.length];
    x.save();
    x.beginPath();
    x.arc(w / 2, h / 2, w / 2, 0, 7);
    x.clip();
    x.fillStyle = bg;
    x.fillRect(0, 0, w, h);
    x.fillStyle = fg;
    x.beginPath();
    x.arc(w / 2, h * 0.42, w * 0.2, 0, 7);
    x.fill();
    x.beginPath();
    x.ellipse(w / 2, h * 1.02, w * 0.38, h * 0.36, 0, 0, 7);
    x.fill();
    x.restore();
  },
  sunset(x, w, h) {
    x.fillStyle = '#F5C4B3';
    x.fillRect(0, 0, w, h * 0.4);
    x.fillStyle = '#F0997B';
    x.fillRect(0, h * 0.4, w, h * 0.22);
    x.fillStyle = '#FAC775';
    x.beginPath();
    x.arc(w * 0.5, h * 0.62, h * 0.18, Math.PI, 0);
    x.fill();
    x.fillStyle = '#185FA5';
    x.fillRect(0, h * 0.62, w, h * 0.38);
    x.fillStyle = '#85B7EB';
    for (let i = 0; i < 5; i++) x.fillRect(w * (0.32 + i * 0.07), h * (0.68 + i * 0.05), w * (0.36 - i * 0.07), 2);
    x.fillStyle = '#26215C';
    x.beginPath();
    x.moveTo(w * 0.2, h * 0.75);
    x.lineTo(w * 0.32, h * 0.75);
    x.lineTo(w * 0.3, h * 0.79);
    x.lineTo(w * 0.22, h * 0.79);
    x.closePath();
    x.fill();
    x.fillRect(w * 0.255, h * 0.62, 1.5, h * 0.13);
  },
  rack(x, w, h) {
    x.fillStyle = '#2C2C2A';
    x.fillRect(0, 0, w, h);
    const rows = 6;
    for (let r = 0; r < rows; r++) {
      const y = h * 0.08 + r * ((h * 0.84) / rows);
      const hot = r === 2 || r === 3;
      x.fillStyle = hot ? '#5F5E5A' : '#444441';
      x.fillRect(w * 0.08, y, w * 0.84, (h * 0.84) / rows - 4);
      for (let i = 0; i < 4; i++) {
        x.fillStyle = i === 0 && hot ? '#F09595' : '#5DCAA5';
        x.fillRect(w * 0.12 + i * 9, y + 5, 4, 4);
      }
      x.fillStyle = hot ? '#D3D1C7' : '#888780';
      for (let i = 0; i < 10; i++) x.fillRect(w * 0.5 + i * w * 0.035, y + 4, 2, (h * 0.84) / rows - 12);
    }
  },
  album(x, w, h) {
    x.fillStyle = '#26215C';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#7F77DD';
    x.beginPath();
    x.arc(w * 0.42, h * 0.45, w * 0.3, 0, 7);
    x.fill();
    x.fillStyle = '#ED93B1';
    x.beginPath();
    x.moveTo(w * 0.55, h * 0.3);
    x.lineTo(w * 0.92, h * 0.85);
    x.lineTo(w * 0.3, h * 0.85);
    x.closePath();
    x.fill();
    x.fillStyle = '#FAC775';
    x.beginPath();
    x.arc(w * 0.75, h * 0.22, w * 0.07, 0, 7);
    x.fill();
  },
  peak(x, w, h) {
    x.fillStyle = '#B5D4F4';
    x.fillRect(0, 0, w, h);
    const mountain = (cx: number, top: number, half: number, col: string): void => {
      x.fillStyle = col;
      x.beginPath();
      x.moveTo(cx - half, h);
      x.lineTo(cx, h * top);
      x.lineTo(cx + half, h);
      x.closePath();
      x.fill();
      x.fillStyle = '#FFFFFF';
      x.beginPath();
      x.moveTo(cx, h * top);
      x.lineTo(cx - half * 0.28, h * (top + (1 - top) * 0.28));
      x.lineTo(cx - half * 0.1, h * (top + (1 - top) * 0.22));
      x.lineTo(cx + half * 0.05, h * (top + (1 - top) * 0.3));
      x.lineTo(cx + half * 0.28, h * (top + (1 - top) * 0.28));
      x.closePath();
      x.fill();
    };
    mountain(w * 0.3, 0.22, w * 0.42, '#5F5E5A');
    mountain(w * 0.72, 0.35, w * 0.38, '#888780');
    x.fillStyle = '#0F6E56';
    for (let i = 0; i < 9; i++) {
      const cx = w * (0.06 + i * 0.11);
      x.beginPath();
      x.moveTo(cx - 6, h);
      x.lineTo(cx, h * 0.78);
      x.lineTo(cx + 6, h);
      x.closePath();
      x.fill();
    }
  },
};

const LABELS: Record<ArtKind, string> = {
  land: 'Tranh đồi gió',
  aura: 'Chân dung trừu tượng',
  scene: 'Ảnh bìa video',
  ink: 'Tranh thủy mặc',
  avatar: 'Ảnh đại diện',
  sunset: 'Ảnh hoàng hôn',
  rack: 'Tủ máy chủ',
  album: 'Bìa album',
  peak: 'Đỉnh núi tuyết',
};

export function Art({ kind, seed = 1, className, style }: { kind: ArtKind; seed?: number; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const paint = (): void => {
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      const x = c.getContext('2d');
      if (!x) return;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      PAINTERS[kind](x, r.width, r.height, seed);
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(c);
    return () => ro.disconnect();
  }, [kind, seed]);
  return <canvas ref={ref} className={className} style={style} role="img" aria-label={LABELS[kind]} />;
}
