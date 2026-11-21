import type { Bin, Lot, Product, PurchaseOrder, Supplier, Warehouse } from '@drh/shared';

const DAY = 86_400_000;
export const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export const warehouses: Warehouse[] = [
  { id: 'wh-toril', name: 'Toril Warehouse', address: 'Toril, Davao City' },
  { id: 'wh-calinan', name: 'Calinan Warehouse', address: 'Calinan, Davao City' },
  { id: 'wh-panacan', name: 'Panacan Warehouse', address: 'Panacan, Davao City' },
];

export const bins: Bin[] = warehouses.flatMap((w) =>
  ['A1', 'A2', 'B1'].map((code) => ({
    id: `${w.id}-${code}`,
    warehouseId: w.id,
    code,
    capacitySacks: 500,
  })),
);

export const suppliers: Supplier[] = [
  { id: 'sup-1', name: 'Mindanao Grains Cooperative', contact: '0917 555 0101' },
  { id: 'sup-2', name: 'Cotabato Rice Mill', contact: '0918 555 0102' },
  { id: 'sup-3', name: 'Bukidnon Farmers Association', contact: '0919 555 0103' },
];

const product = (
  n: number,
  name: string,
  variety: string,
  brand: string,
  sackKg: number,
  reorderPoint: number,
): Product => ({ id: `prod-${n}`, name, variety, brand, sackKg, reorderPoint, active: true });

export const products: Product[] = [
  product(1, 'Dinorado 25kg', 'Dinorado', 'Davao Gold', 25, 100),
  product(2, 'Dinorado 50kg', 'Dinorado', 'Davao Gold', 50, 80),
  product(3, 'Jasmine 25kg', 'Jasmine', 'Mindanao Choice', 25, 120),
  product(4, 'Sinandomeng 50kg', 'Sinandomeng', 'Mindanao Choice', 50, 100),
  product(5, 'Well-milled 50kg', 'Well-milled', 'Hub Standard', 50, 150),
  product(6, 'Premium 25kg', 'Premium', 'Davao Gold', 25, 90),
  product(7, 'Special 50kg', 'Special', 'Hub Standard', 50, 60),
  product(8, 'Brown rice 25kg', 'Brown', 'Healthy Hub', 25, 40),
  product(9, 'Sticky rice 25kg', 'Glutinous', 'Healthy Hub', 25, 30),
  product(10, 'Red rice 25kg', 'Red', 'Healthy Hub', 25, 30),
  product(11, 'Angelica 50kg', 'Angelica', 'Mindanao Choice', 50, 70),
  product(12, 'Denorado Premium 25kg', 'Dinorado', 'Davao Gold', 25, 500),
];

/** Every 4th product is old stock (received >90 days ago) so the Alerts screen has aging rows. */
export const lots: Lot[] = products.map((p, i) => {
  const age = i % 4 === 0 ? 120 : 15 + i * 4;
  return {
    id: `lot-${i + 1}`,
    code: `L${isoDate(daysAgo(age)).replaceAll('-', '')}-${i + 1}`,
    productId: p.id,
    supplierId: suppliers[i % suppliers.length]!.id,
    milledOn: isoDate(daysAgo(age + 7)),
    receivedOn: isoDate(daysAgo(age)),
    moisturePct: 12 + (i % 3) * 0.5,
    grade: i % 2 === 0 ? 'Premium' : 'Regular',
  };
});

/** Opening stock per lot: sacks placed in successive bins (deterministic). */
export const openingStock = (lotIndex: number): { binId: string; sacks: number }[] =>
  bins
    .filter((_, i) => (i + lotIndex) % 4 !== 0)
    .map((b, i) => ({ binId: b.id, sacks: 10 + ((lotIndex * 7 + i * 13) % 60) }))
    .slice(0, 3);

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-1',
    number: 'PO-0001',
    supplierId: 'sup-1',
    status: 'ordered',
    createdOn: isoDate(daysAgo(3)),
    lines: [
      { productId: 'prod-1', sacks: 200, receivedSacks: 0 },
      { productId: 'prod-3', sacks: 150, receivedSacks: 0 },
    ],
  },
  {
    id: 'po-2',
    number: 'PO-0002',
    supplierId: 'sup-2',
    status: 'partially_received',
    createdOn: isoDate(daysAgo(10)),
    lines: [{ productId: 'prod-5', sacks: 300, receivedSacks: 120 }],
  },
  {
    id: 'po-3',
    number: 'PO-0003',
    supplierId: 'sup-3',
    status: 'draft',
    createdOn: isoDate(daysAgo(1)),
    lines: [{ productId: 'prod-2', sacks: 100, receivedSacks: 0 }],
  },
];
