/** Stylised Davao City map art. Coordinates are SVG units, not geography. */
export const VIEW_BOX = { width: 400, height: 300 };

type Point = { x: number; y: number };

const PINS: Record<string, Point> = {
  'wh-calinan': { x: 110, y: 70 },
  'wh-panacan': { x: 285, y: 85 },
  'wh-toril': { x: 95, y: 220 },
};

/** Road path data per warehouse pair; key is the two ids sorted and joined by `|`. */
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const ROADS: Record<string, string> = {
  [pairKey('wh-calinan', 'wh-panacan')]: 'M110 70 C160 40 230 120 285 85',
  [pairKey('wh-calinan', 'wh-toril')]: 'M110 70 C60 120 140 170 95 220',
  [pairKey('wh-panacan', 'wh-toril')]: 'M285 85 C260 180 160 140 95 220',
};
export const ROAD_PATHS = Object.values(ROADS);

/** Fallback for warehouses added later: spread along a default road across the middle. */
export function pinPosition(id: string, index: number): Point {
  return PINS[id] ?? { x: 60 + ((index * 70) % 280), y: 150 };
}

/**
 * Path for a truck from -> to. Stored roads run from the lower id to the higher one,
 * so `reversed` is true when the truck drives the other way. Unknown pairs get a straight line.
 */
export function truckRoute(from: Point, to: Point, fromId: string, toId: string) {
  const known = ROADS[pairKey(fromId, toId)];
  if (!known) return { path: `M${from.x} ${from.y} L${to.x} ${to.y}`, reversed: false };
  return { path: known, reversed: fromId > toId };
}

export const LAND = 'M0 0 H400 V200 C340 250 300 210 220 240 C140 270 60 260 0 210 Z';
