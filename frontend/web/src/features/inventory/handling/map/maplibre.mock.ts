/**
 * Test double for `maplibre-gl` (jsdom has no WebGL). Use with
 * `vi.mock('maplibre-gl', () => import('.../maplibre.mock'))`.
 * Markers append their element to the map container, so Testing Library can find them.
 */
import { vi } from 'vitest';

type Handler = (e: unknown) => void;

export const maps: MockMap[] = [];

// jsdom has no ResizeObserver; the map only needs it to exist.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

export class MockMap {
  container: HTMLElement;
  handlers = new Map<string, Handler[]>();
  /** GeoJSON sources by id, each with a `setData` spy. */
  sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>();
  fitBounds = vi.fn();
  cameraForBounds = vi.fn(() => ({ center: [125.5, 7.1], zoom: 11 }));
  flyTo = vi.fn();
  jumpTo = vi.fn();
  stop = vi.fn();
  setPadding = vi.fn();
  setStyle = vi.fn();
  resize = vi.fn();
  addLayer = vi.fn();
  addSource = vi.fn((id: string) => {
    this.sources.set(id, { setData: vi.fn() });
  });
  getSource(id: string) {
    return this.sources.get(id);
  }
  getStyle() {
    return { layers: [] };
  }
  constructor(opts: { container: HTMLElement }) {
    this.container = opts.container;
    maps.push(this);
  }
  on(type: string, fn: Handler) {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), fn]);
    return this;
  }
  fire(type: string, e: unknown) {
    for (const fn of this.handlers.get(type) ?? []) fn(e);
  }
  getContainer() {
    return this.container;
  }
  addControl() {
    return this;
  }
  remove() {}
}

export class MockMarker {
  element: HTMLElement;
  lngLat: unknown;
  constructor(opts: { element?: HTMLElement } = {}) {
    this.element = opts.element ?? document.createElement('div');
    this.element.dataset.marker = 'true';
  }
  setLngLat(v: unknown) {
    this.lngLat = v;
    return this;
  }
  setRotation() {
    return this;
  }
  getElement() {
    return this.element;
  }
  addTo(map: MockMap) {
    map.container.appendChild(this.element);
    return this;
  }
  remove() {
    this.element.remove();
  }
}

export class MockLngLatBounds {
  points: unknown[] = [];
  extend(p: unknown) {
    this.points.push(p);
    return this;
  }
}

class NavigationControl {}

const setWorkerUrl = vi.fn();

export {
  MockMap as Map,
  MockMarker as Marker,
  MockLngLatBounds as LngLatBounds,
  NavigationControl,
  setWorkerUrl,
};
