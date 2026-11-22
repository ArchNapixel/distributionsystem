import { describe, expect, it, vi } from 'vitest';
import type { Map } from 'maplibre-gl';
import { dotProgress, isStyleFetchError, softenBasemap } from './layout';

describe('dotProgress', () => {
  it('parks at the midpoint when motion is reduced', () => {
    expect(dotProgress(123456, 2, 1, true)).toBe(0.5);
  });

  it('stays within 0..1 and loops', () => {
    for (const now of [0, 4500, 9000, 123456789]) {
      for (const k of [0, 1]) {
        const p = dotProgress(now, 1, k, false);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
    expect(dotProgress(0, 0, 0, false)).toBe(0);
    expect(dotProgress(9000, 0, 0, false)).toBeCloseTo(0, 5); // one full lap is back at the start
  });

  it('keeps the two dots of a route apart', () => {
    expect(dotProgress(1000, 0, 0, false)).not.toBeCloseTo(dotProgress(1000, 0, 1, false), 2);
  });
});

describe('isStyleFetchError', () => {
  it('flags source errors and style or network fetch failures only', () => {
    expect(isStyleFetchError({ sourceId: 'openmaptiles' })).toBe(true);
    expect(isStyleFetchError({ error: new Error('Failed to fetch') })).toBe(true);
    expect(isStyleFetchError({ error: new Error('Could not load image') })).toBe(false);
    expect(isStyleFetchError({})).toBe(false);
  });
});

describe('softenBasemap', () => {
  const layers = [
    { id: 'background', type: 'background' },
    { id: 'water', type: 'fill', 'source-layer': 'water' },
    { id: 'road_major', type: 'line', 'source-layer': 'transportation' },
    { id: 'poi_r20', type: 'symbol', 'source-layer': 'poi' },
    { id: 'label_town', type: 'symbol', 'source-layer': 'place' },
    { id: 'label_city', type: 'symbol', 'source-layer': 'place' },
  ];

  it('fades the grounds, hides POIs and non-city places, and filters city labels', () => {
    const map = {
      getStyle: () => ({ layers }),
      setPaintProperty: vi.fn(),
      setLayoutProperty: vi.fn(),
      setFilter: vi.fn(),
    };
    softenBasemap(map as unknown as Map);
    expect(map.setPaintProperty).toHaveBeenCalledWith('background', 'background-color', '#f7f7f5');
    expect(map.setPaintProperty).toHaveBeenCalledWith('water', 'fill-color', '#e2ecf3');
    expect(map.setPaintProperty).toHaveBeenCalledWith('road_major', 'line-color', '#ffffff');
    expect(map.setLayoutProperty).toHaveBeenCalledWith('poi_r20', 'visibility', 'none');
    expect(map.setLayoutProperty).toHaveBeenCalledWith('label_town', 'visibility', 'none');
    expect(map.setLayoutProperty).not.toHaveBeenCalledWith('label_city', 'visibility', 'none');
    expect(map.setFilter).toHaveBeenCalledWith('label_city', ['==', ['get', 'class'], 'city']);
  });

  it('keeps going when a layer throws', () => {
    const setPaintProperty = vi.fn(() => {
      throw new Error('no such layer');
    });
    const map = {
      getStyle: () => ({ layers }),
      setPaintProperty,
      setLayoutProperty: vi.fn(),
      setFilter: vi.fn(),
    };
    softenBasemap(map as unknown as Map);
    expect(map.setLayoutProperty).toHaveBeenCalled();
  });
});
