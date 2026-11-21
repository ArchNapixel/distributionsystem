import type { Movement } from '@drh/shared';
import { describe, expect, it } from 'vitest';
import { truckTrips } from './trucks';

const now = Date.parse('2026-11-22T12:00:00Z');
const bins = new Map([
  ['a1', 'wh-a'],
  ['a2', 'wh-a'],
  ['b1', 'wh-b'],
]);
const mv = (over: Partial<Movement>): Movement => ({
  id: 'm1',
  at: '2026-11-22T10:00:00Z',
  type: 'transfer',
  fromLocation: 'a1',
  toLocation: 'b1',
  productId: 'p',
  lotId: 'l',
  sacks: 5,
  userName: 'u',
  reference: null,
  note: null,
  ...over,
});

describe('truckTrips', () => {
  it('makes a trip for a recent inter-warehouse transfer', () => {
    expect(truckTrips([mv({})], bins, now)).toEqual([
      {
        id: 'm1',
        fromWarehouseId: 'wh-a',
        toWarehouseId: 'wh-b',
        at: '2026-11-22T10:00:00Z',
        sacks: 5,
      },
    ]);
  });
  it('skips old, same-warehouse, non-transfer and unknown-bin movements', () => {
    const list = [
      mv({ at: '2026-11-21T11:00:00Z' }),
      mv({ toLocation: 'a2' }),
      mv({ type: 'receipt', fromLocation: 'supplier' }),
      mv({ type: 'adjustment' }),
      mv({ toLocation: 'loss' }),
    ];
    expect(truckTrips(list, bins, now)).toEqual([]);
  });
});
