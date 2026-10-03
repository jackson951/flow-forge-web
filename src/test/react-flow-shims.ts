/**
 * Browser APIs React Flow needs that jsdom does not implement (as recommended by React Flow's
 * testing guide). Sizes are fixed so nodes are "measured" and rendered.
 */
class ResizeObserverShim {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    const contentRect = { x: 0, y: 0, top: 0, left: 0, width: 220, height: 60 } as DOMRectReadOnly;
    // Like the real one, report the size after the current task.
    queueMicrotask(() => {
      // The test (and its document) may already be gone.
      if (!target.isConnected) return;
      this.callback(
        [{ target, contentRect } as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      );
    });
  }
  unobserve() {}
  disconnect() {}
}

class DOMMatrixReadOnlyShim {
  m22: number;
  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([1-9.])\)/)?.[1];
    this.m22 = scale !== undefined ? Number(scale) : 1;
  }
}

export function installReactFlowShims() {
  globalThis.ResizeObserver ??= ResizeObserverShim as unknown as typeof ResizeObserver;
  globalThis.DOMMatrixReadOnly ??= DOMMatrixReadOnlyShim as unknown as typeof DOMMatrixReadOnly;
  Object.defineProperties(HTMLElement.prototype, {
    offsetHeight: { configurable: true, get: () => 60 },
    offsetWidth: { configurable: true, get: () => 220 },
  });
  (SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
    ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect;
}
