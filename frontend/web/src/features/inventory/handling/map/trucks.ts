import type { Movement } from '@drh/shared';

export type TruckTrip = {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  at: string;
  sacks: number;
};

const DAY = 86_400_000;

/** Inter-warehouse transfers from the last 24h, one trip each. `now` is epoch ms. */
export function truckTrips(
  movements: Movement[],
  binToWarehouse: Map<string, string>,
  now: number,
): TruckTrip[] {
  const trips: TruckTrip[] = [];
  for (const m of movements) {
    if (m.type !== 'transfer' || now - Date.parse(m.at) > DAY) continue;
    const from = binToWarehouse.get(m.fromLocation);
    const to = binToWarehouse.get(m.toLocation);
    if (from && to && from !== to) {
      trips.push({ id: m.id, fromWarehouseId: from, toWarehouseId: to, at: m.at, sacks: m.sacks });
    }
  }
  return trips;
}
