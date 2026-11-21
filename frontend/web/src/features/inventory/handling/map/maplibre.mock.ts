/**
 * Test double for `maplibre-gl` (jsdom has no WebGL). Use with
 * `vi.mock('maplibre-gl', () => import('.../maplibre.mock'))`.
 * Markers append their element to the map container, so Testing Library can find them.
 */
import { vi } from 'vitest';

type Handler = (e: unknown) => void;

export const maps: MockMap[] = [];

export class MockMap {
  container: HTMLElement;
  handlers = new Map<string, Handler[]>();
  fitBounds = vi.fn();
  addSource = vi.fn();
  addLayer = vi.fn();
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

export {
  MockMap as Map,
  MockMarker as Marker,
  MockLngLatBounds as LngLatBounds,
  NavigationControl,
};
