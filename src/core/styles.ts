import type { Effect } from './types';

/**
 * Base rules. Content is hidden with `visibility` on the wrapper's children, never by
 * restyling them. `[data-arrivo="static"]` opts chrome back in; `[data-arrivo="frame"]` keeps an
 * element's own box (a chip's background, a button's border) while its children stay
 * hidden and animate. Zero-specificity `:where()` lets page styles win.
 */
export const ARRIVO_CSS = [
  ':where(.arrivo){position:relative}',
  '.arrivo>.arrivo-ov{position:absolute;left:0;top:0;pointer-events:none;z-index:1}',
  '.arrivo[data-arrivo-state="hidden"]>:not(.arrivo-ov){visibility:hidden}',
  '.arrivo[data-arrivo-state="hidden"] [data-arrivo="static"],.arrivo[data-arrivo-state="hidden"] [data-arrivo="frame"]{visibility:visible}',
  '.arrivo[data-arrivo-state="hidden"] [data-arrivo="frame"]>*{visibility:hidden}',
  ':where(.arrivo-sk){display:block}',
  ':where(.arrivo-sk-line){display:block;height:.72em;margin:.5em 0;border-radius:4px;background:color-mix(in srgb,currentColor 10%,transparent)}',
  ':where(.arrivo-sk-block){display:block;border-radius:10px;background:color-mix(in srgb,currentColor 10%,transparent)}',
  ':where(.arrivo-sk-circle){border-radius:50%}',
].join('');

const injected = new Set<string>();

function inject(key: string, css: string): void {
  if (injected.has(key) || typeof document === 'undefined') return;
  injected.add(key);
  const el = document.createElement('style');
  el.setAttribute('data-arrivo', key);
  el.textContent = css;
  document.head.appendChild(el);
}

/** Add the base rules and the effect's skeleton styles to the page once. */
export function ensureStyles(effect?: Effect<any, any>): void {
  inject('base', ARRIVO_CSS);
  if (effect?.css) inject(`effect:${effect.name}`, effect.css);
}
