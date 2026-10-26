# Changelog

## 0.1.0

First release.

- **Thirteen effects** in `arrivo/effects`: `flap`, `redact`, `mosaic`, `halftone`, `crt`, `ink` (with eight threshold
  maps: `ink`, `radar`, `ripple`, `hilbert`, `bayer`, `voronoi`, `receipt`, `dissolve`), `swarm`, `darkroom`, `tetris`,
  `fuse` (with a Lunar New Year theme), `equalizer`, `thermal` and `snow`.
- **`<Reveal>`, `<Skeleton>` and `useReveal`** for React 17 and newer, and `createReveal` in `arrivo/core` for any page.
- **Content stays in the DOM** and keeps its box while hidden, so nothing shifts when it lands. One shared animation
  loop pauses off-screen work, a watchdog falls back to fades on slow devices, and reduced motion gets a 150 ms fade.
- **Demo site** in `playground/`: a hero that tours every effect, a gallery that plays each card as it scrolls into
  view, the threshold maps, a sandbox and install notes.
