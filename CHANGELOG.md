# Changelog

## 0.2.0

Faster by default, after feedback that the effects held content back.

- **Fast loads skip the effect.** A load that finishes in under 500 ms fades in over 150 ms instead of playing the
  effect, so a quick response is never held back by an animation. The new `fadeUnder` option sets the threshold,
  and `0` always plays the effect. Content that is already there when a `<Reveal>` mounts fades in the same way, and
  `replay()` still plays the full effect.
- **Shorter reveals.** Every effect's default reveal is about 45% shorter: 0.7 to 1 s instead of 1 to 1.9 s.
  Split-flap flips faster too. `duration="cinematic"` keeps a longer feel.
- **No minimum loading time.** Tetris, fuse and snow no longer hold content back for 0.7 to 1 s. `minIdle` is `0`
  unless you set it.

## 0.1.0

First release.

- **Thirteen effects** in `@brottin/arrivo/effects`: `flap`, `redact`, `mosaic`, `halftone`, `crt`, `ink` (with eight
  threshold maps: `ink`, `radar`, `ripple`, `hilbert`, `bayer`, `voronoi`, `receipt`, `dissolve`), `swarm`, `darkroom`,
  `tetris`, `fuse` (with a Lunar New Year theme), `equalizer`, `thermal` and `snow`.
- **`<Reveal>`, `<Skeleton>` and `useReveal`** for React 17 and newer, and `createReveal` in `@brottin/arrivo/core` for
  any page.
- **Content stays in the DOM** and keeps its box while hidden, so nothing shifts when it lands. One shared animation
  loop pauses off-screen work, a watchdog falls back to fades on slow devices, and reduced motion gets a 150 ms fade.
- **Types for every setup**: ES module and CommonJS declarations that resolve under `bundler`, `node16` and
  `nodenext`; `@brottin/arrivo/core` and `@brottin/arrivo/effects` need no React types.
- **Demo site** in `playground/`: a hero that tours every effect, a gallery that plays each card as it scrolls into
  view, the threshold maps, a sandbox and install notes.
