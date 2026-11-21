import { describe, expect, it } from 'vitest';
import { pointAlong, routeBetween, type LngLat } from './routes';

const C: LngLat = [125.4553, 7.1897];
const T: LngLat = [125.497, 7.0186];

describe('routeBetween', () => {
  it('returns the saved road for a known pair, reversed when driving the other way', () => {
    const there = routeBetween('wh-calinan', 'wh-toril', C, T);
    const back = routeBetween('wh-toril', 'wh-calinan', T, C);
    expect(there.length).toBeGreaterThan(2);
    expect(back).toEqual([...there].reverse());
    expect(there[0]![1]).toBeGreaterThan(there.at(-1)![1]); // Calinan is north of Toril
  });

  it('falls back to a straight line for an unknown pair', () => {
    expect(routeBetween('wh-new', 'wh-toril', C, T)).toEqual([C, T]);
  });
});

describe('pointAlong', () => {
  const east: LngLat[] = [
    [125, 7],
    [125.1, 7],
    [125.1, 6.9],
  ];
  it('starts at the start and ends at the end', () => {
    expect(pointAlong(east, 0).at).toEqual([125, 7]);
    expect(pointAlong(east, 1).at[0]).toBeCloseTo(125.1);
    expect(pointAlong(east, 1).at[1]).toBeCloseTo(6.9);
  });
  it('gives the heading of the current segment (0 = east, 90 = south)', () => {
    expect(pointAlong(east, 0.2).heading).toBeCloseTo(0);
    expect(pointAlong(east, 0.9).heading).toBeCloseTo(90);
  });
});
