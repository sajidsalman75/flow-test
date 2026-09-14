/**
 * jsdom (the DOM implementation Vitest runs against) doesn't implement a
 * handful of browser APIs that Vue Flow and Vuetify rely on internally.
 * Real browsers have all of these; these polyfills exist purely so tests
 * exercise real component rendering instead of needing every test to stub
 * those libraries out.
 */

// SVG's getBBox() — Vue Flow uses it to measure node dimensions.
const svgElementProto = SVGElement.prototype as unknown as { getBBox?: () => DOMRect }
if (typeof SVGElement !== 'undefined' && !svgElementProto.getBBox) {
  svgElementProto.getBBox = () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    toJSON() {},
  })
}

// ResizeObserver — Vue Flow uses it to track the canvas container's size.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverPolyfill }).ResizeObserver = ResizeObserverPolyfill
}

// visualViewport — Vuetify's VOverlay (VDialog, VMenu, VSelect's dropdown,
// ...) uses it to position overlays relative to the viewport.
if (typeof window !== 'undefined' && !window.visualViewport) {
  class VisualViewportPolyfill extends EventTarget {
    width = window.innerWidth
    height = window.innerHeight
    offsetLeft = 0
    offsetTop = 0
    pageLeft = 0
    pageTop = 0
    scale = 1
  }
  Object.defineProperty(window, 'visualViewport', {
    value: new VisualViewportPolyfill(),
    writable: true,
    configurable: true,
  })
}

// matchMedia — used by various responsive/theme checks (Vuetify's display
// composable, etc.).
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
