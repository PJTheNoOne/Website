/* Full-viewport contour backdrop. Re-colours on theme change, re-traces on resize. */
import { generateHeightmap, traceContours, drawContours, themeStyle } from './contours.js';

export function mountBackdrop(options, { container = document.body, className = 'backdrop' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = className;
  canvas.setAttribute('aria-hidden', 'true');
  container.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let contours = null, size = { w: 0, h: 0 };

  function trace() {
    const r = canvas.getBoundingClientRect();
    size = { w: Math.ceil(r.width), h: Math.ceil(r.height) };
    if (!size.w || !size.h) return;
    contours = traceContours(generateHeightmap(size.w, size.h, options), options);
  }

  function paint() {
    if (!contours) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawContours(ctx, contours, { ...options, ...themeStyle() });
  }

  const draw = () => { trace(); paint(); };
  // Defer the first draw so it never blocks first paint of the content.
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 1)))(draw);

  let timer;
  let last = { w: innerWidth, h: innerHeight };
  addEventListener('resize', () => {
    // Ignore small height changes (mobile URL bar showing/hiding).
    if (innerWidth === last.w && Math.abs(innerHeight - last.h) < 140) return;
    last = { w: innerWidth, h: innerHeight };
    clearTimeout(timer);
    timer = setTimeout(draw, 180);
  });

  // Theme changes only need a repaint, not a re-trace.
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paint);

  return { canvas, redraw: draw, repaint: paint };
}
