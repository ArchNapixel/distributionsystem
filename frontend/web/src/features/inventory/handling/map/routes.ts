/** [lng, lat] pairs, MapLibre order. */
export type LngLat = [number, number];

/**
 * Road routes between the seed warehouses, traced once (2026-11-22) with the public OSRM
 * router and stored here: no routing calls at runtime. Each runs from the lower warehouse
 * id to the higher one. Re-trace if a warehouse moves.
 */
const ROUTES: Record<string, LngLat[]> = {
  'wh-calinan|wh-panacan': [
    [125.45546, 7.18953],
    [125.45948, 7.18614],
    [125.46355, 7.18694],
    [125.50263, 7.18196],
    [125.50869, 7.18738],
    [125.5173, 7.1844],
    [125.52307, 7.18446],
    [125.52624, 7.18268],
    [125.52832, 7.18327],
    [125.53541, 7.18143],
    [125.53735, 7.18193],
    [125.54023, 7.18631],
    [125.54693, 7.19142],
    [125.54863, 7.18991],
    [125.55679, 7.18859],
    [125.55631, 7.18623],
    [125.55779, 7.18313],
    [125.56131, 7.18011],
    [125.56249, 7.18201],
    [125.5664, 7.18128],
    [125.57405, 7.18394],
    [125.5739, 7.1801],
    [125.57723, 7.17342],
    [125.58391, 7.17496],
    [125.58452, 7.17766],
    [125.58311, 7.18147],
    [125.58794, 7.18218],
    [125.59009, 7.18542],
    [125.60874, 7.19481],
    [125.61628, 7.20065],
    [125.6194, 7.2058],
    [125.62574, 7.20106],
    [125.62629, 7.19703],
    [125.63323, 7.19343],
    [125.63515, 7.19032],
    [125.6462, 7.19429],
    [125.64794, 7.19379],
    [125.65709, 7.16537],
    [125.65744, 7.15527],
    [125.66001, 7.14943],
    [125.658, 7.146],
  ],
  'wh-calinan|wh-toril': [
    [125.45546, 7.18953],
    [125.47199, 7.1717],
    [125.481, 7.13515],
    [125.47958, 7.11447],
    [125.49212, 7.10182],
    [125.49844, 7.0934],
    [125.49698, 7.09116],
    [125.49676, 7.07889],
    [125.49855, 7.07213],
    [125.49656, 7.06886],
    [125.50199, 7.06691],
    [125.49735, 7.05748],
    [125.50353, 7.0499],
    [125.49317, 7.03804],
    [125.49714, 7.01873],
  ],
  'wh-panacan|wh-toril': [
    [125.658, 7.146],
    [125.63281, 7.12489],
    [125.6238, 7.11501],
    [125.61671, 7.10997],
    [125.60306, 7.10534],
    [125.5854, 7.10511],
    [125.57202, 7.09613],
    [125.56972, 7.09361],
    [125.56939, 7.09105],
    [125.57258, 7.08787],
    [125.57208, 7.08114],
    [125.57466, 7.07079],
    [125.57169, 7.0653],
    [125.55625, 7.06453],
    [125.54159, 7.05098],
    [125.49681, 7.02051],
    [125.49714, 7.01873],
  ],
};

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Saved road from -> to (reversed when needed); a straight line when no road is saved. */
export function routeBetween(fromId: string, toId: string, from: LngLat, to: LngLat): LngLat[] {
  const known = ROUTES[pairKey(fromId, toId)];
  if (!known) return [from, to];
  return fromId < toId ? known : [...known].reverse();
}

/** All saved roads, for drawing them on the map. */
export const SAVED_ROUTES = Object.values(ROUTES);

/** Position and heading (degrees clockwise from east, on screen) at fraction `t` (0..1) of a route. */
export function pointAlong(route: LngLat[], t: number): { at: LngLat; heading: number } {
  // Planar approximation (lng scaled by cos(lat)); accurate enough at city scale.
  const k = Math.cos((route[0]![1] * Math.PI) / 180);
  const seg = route
    .slice(1)
    .map((p, i) => Math.hypot((p[0] - route[i]![0]) * k, p[1] - route[i]![1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let left = Math.min(1, Math.max(0, t)) * total;
  for (let i = 0; i < seg.length; i++) {
    const a = route[i]!;
    const b = route[i + 1]!;
    const heading = (-Math.atan2(b[1] - a[1], (b[0] - a[0]) * k) * 180) / Math.PI;
    if (left <= seg[i]! || i === seg.length - 1) {
      const f = seg[i] ? Math.min(1, left / seg[i]!) : 1;
      return { at: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], heading };
    }
    left -= seg[i]!;
  }
  return { at: route[route.length - 1]!, heading: 0 };
}
