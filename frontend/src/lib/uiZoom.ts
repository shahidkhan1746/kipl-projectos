/**
 * How much the laptop-density rule in index.css scales the page: 0.8 or 0.9 on
 * a laptop-sized screen inside the signed-in app, 1 everywhere else.
 *
 * getBoundingClientRect() and the mouse report on-screen pixels, while
 * positions set in CSS are scaled again by the page zoom. Code that places
 * something at a measured position divides by this first.
 */
export function uiZoom(): number {
  if (typeof document === 'undefined') return 1
  const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom'))
  return Number.isFinite(z) && z > 0 ? z : 1
}
