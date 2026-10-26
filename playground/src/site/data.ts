/**
 * Sample data for the demo cards. Every value is mock content. Each fake fetch picks new
 * values (and new lengths) so reveals land on a slightly different layout every time.
 */

export const E2E = typeof location !== 'undefined' && new URLSearchParams(location.search).has('e2e');

/** Random in [0, 1); constant under `?e2e` so end-to-end tests see stable layouts. */
const rnd = (): number => (E2E ? 0.37 : Math.random());
const pick = <T>(items: readonly T[]): T => items[Math.floor(rnd() * items.length)];
const int = (lo: number, hi: number): number => Math.floor(lo + rnd() * (hi - lo + 1));
const fmt = (n: number): string => n.toLocaleString('en-US');
const pad = (n: number): string => String(n).padStart(2, '0');
const clock = (): string => {
  const h = int(8, 19);
  return `${h > 12 ? h - 12 : h}:${pad(int(0, 59))} ${h >= 12 ? 'pm' : 'am'}`;
};

export function showcase() {
  return pick([
    { title: 'Medusa', meta: 'Archival pigment print, 50 × 70 cm', price: '$140' },
    { title: 'Medusa', meta: 'Signed edition of 30, 40 × 60 cm', price: '$185' },
  ]);
}

/** A wandering series that ends on `end`, for sparklines. */
function series(n: number, end: number, drift: number): number[] {
  const out = [end];
  for (let i = 1; i < n; i++) out.unshift(out[0] * (1 - drift * (rnd() - 0.35)));
  return out;
}

export function kpi() {
  const users = int(9000, 19000);
  const prev = int(9000, 19000);
  const delta = ((users - prev) / prev) * 100;
  return {
    series: series(14, users, 0.09),
    users: fmt(users),
    delta: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`,
    up: delta >= 0,
    session: `${int(2, 6)}m ${pad(int(0, 59))}s`,
    retention: `${(46 + rnd() * 22).toFixed(1)}%`,
    updated: clock(),
  };
}

export function article() {
  return pick([
    {
      tag: 'Engineering, 6 min read',
      title: 'Design the loading state first',
      body: 'A spinner asks people to wait. A reveal shows them what they are waiting for, in the place it will stay. Sketch the empty and loading states before the happy path, and the layout stops jumping when the data lands.',
    },
    {
      tag: 'Interface notes, 4 min read',
      title: 'Skeletons guess your layout',
      body: 'Grey bars promise a shape the content rarely keeps. Measuring the real text keeps the promise: every line, word and image gets its own box, so the effect plays exactly where the content will sit.',
    },
    {
      tag: 'Craft, 8 min read',
      title: 'Redraw the DOM without a screenshot',
      body: 'Range rects give every word its box. Add the computed font and colour and the canvas can redraw it, which is all an effect needs to dot it, block it or fly particles to it. Nothing is cloned.',
    },
  ]);
}

export function kit() {
  return {
    name: pick(['Commuter kit', 'Weekender kit', 'Studio kit']),
    pieces: pick(['Wallet, earbuds, notebook, pen', 'Card case, cable, notebook', 'Wallet, keys, film camera']),
    price: `$${int(68, 140)}`,
  };
}

export function produce() {
  return {
    name: pick(['Summer berry box', 'Raspberry crate']),
    pieces: pick(['Picked this morning, 1 kg', 'Two punnets, farm to door']),
    price: `$${int(12, 24)}`,
  };
}

export function essay() {
  return {
    kicker: pick(['Photo essay', 'Portrait series']),
    title: pick(['The colour of quiet', 'Faces in four inks', 'Light from the left']),
    by: pick(['Words and photographs by Hà Vy', 'Photographed by Inès Moreau']),
  };
}

export function video() {
  return {
    title: pick(['Live at the Warehouse, set two', 'Night Radio sessions, part four']),
    channel: 'Night Radio',
    stats: `${int(12, 98)}K views, ${int(31, 59)} minutes`,
  };
}

export function profile() {
  return {
    name: pick(['Linh Trần', 'Maya Okafor', 'Bảo Nguyễn']),
    role: pick(['Motion designer', 'Design engineer', 'Front-end developer']),
    bio: pick([
      'Builds interfaces where motion explains what just changed. Currently obsessed with loading states.',
      'Turns design systems into code and keeps the animations honest.',
    ]),
    followers: fmt(int(1200, 9800)),
  };
}

export function heat() {
  return {
    area: pick(['District 1, Ho Chi Minh City', 'Downtown, Singapore']),
    peak: `${(34 + rnd() * 6).toFixed(1)}°C`,
    low: `${(26 + rnd() * 2).toFixed(1)}°C`,
    avg: `${(30 + rnd() * 3).toFixed(1)}°C`,
    at: clock(),
  };
}

export function print() {
  return {
    title: pick(['Coastline from 3,000 m', 'Tide lines, aerial']),
    meta: pick(['Giclée on cotton rag, 60 × 40 cm', 'Edition of 25, 90 × 60 cm']),
    price: `$${int(160, 320)}`,
  };
}

export function polaroid() {
  return { caption: pick(['Mũi Né, 6 pm', 'Last light, Hội An']), date: `${pick(['Aug', 'Sep', 'Oct'])} ${int(2, 28)}` };
}

export function leaderboard() {
  const names = ['Mira Kovač', 'Tuấn Lê', 'Sofia Ruiz', 'Arjun Mehta', 'Hana Sato', 'Diego Paz'];
  const base = int(48, 64);
  const start = int(0, names.length - 1);
  return Array.from({ length: 4 }, (_, i) => ({
    rank: i + 1,
    name: names[(start + i) % names.length],
    score: fmt((base - i * int(3, 6)) * 1000 + int(0, 999)),
  }));
}

export function milestone() {
  return {
    series: Array.from({ length: 16 }, (_, i) => 1800 + i * i * 36 + rnd() * 400),
    figure: pick(['10,000', '25,000']),
    unit: 'weekly users',
    note: pick(['You crossed it on a Tuesday afternoon.', 'Six weeks earlier than the plan said.']),
  };
}

export function track() {
  return {
    title: pick(['Low Tide', 'Night Ferry', 'Salt and Glass']),
    artist: 'Hanoi Ambient Club',
    elapsed: `${int(0, 2)}:${pad(int(0, 59))}`,
    length: `${int(3, 5)}:${pad(int(0, 59))}`,
    next: pick(['Monsoon, Slowly', 'West Lake at 5 am']),
  };
}

export function weather() {
  return {
    place: 'Zermatt',
    temp: `${int(-9, -2)}°`,
    note: pick(['Light snow, wind 18 km/h', 'Snow showers, visibility 2 km']),
    high: `${int(-3, 0)}°`,
    low: `${int(-12, -8)}°`,
  };
}
