import type { Map } from 'maplibre-gl';
import type { LngLat } from './routes';

/** Light, faded basemap (OpenFreeMap, free, no key). Swap here if the tile service changes. */
export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';
/** Used only when the primary style or its sources fail to load. */
export const FALLBACK_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/** Davao City, used when no warehouse has a location yet (and by the location picker). */
export const DAVAO_CENTER: LngLat = [125.55, 7.12];
export const DAVAO_ZOOM = 10.5;

/** Warehouse map camera: a tilted, slightly rotated view so the buildings read as 3D. */
export const MAP_VIEW = { center: [125.55, 7.11] as LngLat, zoom: 10.4, pitch: 45, bearing: -12 };

/** True for failures worth falling back for: style or source fetches (not, say, a missing icon). */
export const isStyleFetchError = (e: { sourceId?: string; error?: { message?: string } }) =>
  Boolean(e.sourceId) || /style|fetch|Failed|NetworkError/.test(e.error?.message ?? '');

const PLACE_KEEP = /city|state|country|continent/;

/**
 * Fades the basemap so warehouses and routes stand out: pale grounds, white roads, no POIs,
 * and only city-level place labels (these tiles tag Davao barangays as "town").
 * Each change is guarded: a style that lacks a layer or property must not break the map.
 */
export function softenBasemap(map: Map) {
  for (const layer of map.getStyle().layers) {
    const { id, type } = layer;
    const sourceLayer = (layer as { 'source-layer'?: string })['source-layer'];
    try {
      if (type === 'background') map.setPaintProperty(id, 'background-color', '#f7f7f5');
      else if (type === 'fill' && /water/.test(id))
        map.setPaintProperty(id, 'fill-color', '#e2ecf3');
      else if (type === 'fill' && /park|landcover|wood|grass/.test(id))
        map.setPaintProperty(id, 'fill-color', '#eef2ea');
      else if (type === 'line' && /road|highway|street|path|transportation/.test(id))
        map.setPaintProperty(id, 'line-color', '#ffffff');
      else if (type === 'symbol' && /poi|housenum/.test(id))
        map.setLayoutProperty(id, 'visibility', 'none');
      else if (type === 'symbol' && sourceLayer === 'place') {
        if (!PLACE_KEEP.test(id)) map.setLayoutProperty(id, 'visibility', 'none');
        else if (/city/.test(id)) map.setFilter(id, ['==', ['get', 'class'], 'city']);
      }
    } catch {
      // Unknown layer or property in this style: leave it as it is.
    }
  }
}

const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Where along route `i` the `k`-th of its two dots is, 0..1. Dots loop forever, each route a
 * little slower than the last, and sit at the midpoint when motion is reduced.
 */
export function dotProgress(nowMs: number, i: number, k: number, still: boolean) {
  if (still) return 0.5;
  return easeInOutQuad((nowMs / (9000 + i * 1800) + k / 2 + i * 0.17) % 1);
}
