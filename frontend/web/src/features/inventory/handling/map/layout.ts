import type { LngLat } from './routes';

/** Light, faded basemap (OpenFreeMap, free, no key). Swap here if the tile service changes. */
export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

/** Davao City, used when no warehouse has a location yet. */
export const DAVAO_CENTER: LngLat = [125.55, 7.12];
export const DAVAO_ZOOM = 10.5;

/** Roof colours: each warehouse keeps its own so it is recognisable; status is shown by the pin. */
const ROOFS: Record<string, { roof: string; shade: string }> = {
  'wh-calinan': { roof: '#f97316', shade: '#c2410c' },
  'wh-panacan': { roof: '#22c55e', shade: '#15803d' },
  'wh-toril': { roof: '#3b82f6', shade: '#1d4ed8' },
};
const DEFAULT_ROOF = { roof: '#64748b', shade: '#475569' };

export const roofColours = (id: string) => ROOFS[id] ?? DEFAULT_ROOF;
