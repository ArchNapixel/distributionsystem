// Typed API surface. Backed by the in-memory mock for now (plan 004); the real
// API replaces this module only. Inputs are validated at this boundary.
import {
  AdjustmentInput,
  BinInput,
  LOSS_LOCATION,
  PurchaseOrderInput,
  ProductInput,
  ReceiveInput,
  SUPPLIER_LOCATION,
  SupplierInput,
  TransferInput,
  WarehouseInput,
  isRealLocation,
  type Bin,
  type Lot,
  type Movement,
  type Product,
  type PurchaseOrder,
  type StockBalance,
  type Supplier,
  type Warehouse,
} from '@drh/shared';
import type { ZodType } from 'zod';
import * as seed from './mock/seed';
import {
  ApiError,
  actor,
  balanceOf,
  logAudit,
  newId,
  post,
  setActor,
  state,
  type AuditEntry,
  type CountLine,
  type CycleCountRecord,
} from './mock/store';

export { ApiError, resetMock } from './mock/store';
export type { AuditEntry, CountLine, CycleCountRecord } from './mock/store';

const AGING_DAYS = 90;
const DAY = 86_400_000;

const read = <T>(v: T): Promise<T> => Promise.resolve(structuredClone(v));

function parse<T>(schema: ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new ApiError('invalid', r.error.issues[0]?.message ?? 'Invalid input');
  return r.data;
}

const find = <T extends { id: string }>(list: T[], id: string, what: string): T => {
  const item = list.find((x) => x.id === id);
  if (!item) throw new ApiError('not_found', `${what} not found`);
  return item;
};

const lotFor = (lotId: string, productId: string) => {
  const lot = find(state.lots, lotId, 'Lot');
  if (lot.productId !== productId)
    throw new ApiError('invalid', 'That lot is for a different product');
  return lot;
};

const binWarehouse = (binId: string) => find(state.bins, binId, 'Bin').warehouseId;

export interface Refs {
  products: Product[];
  warehouses: Warehouse[];
  bins: Bin[];
  suppliers: Supplier[];
  lots: Lot[];
}

export interface Dashboard {
  warehouses: { warehouse: Warehouse; sacks: number; kg: number }[];
  lowStockCount: number;
  agingLotCount: number;
  recent: Movement[];
}

export interface LowStockAlert {
  product: Product;
  sacks: number;
}
export interface AgingAlert {
  lot: Lot;
  sacks: number;
  ageDays: number;
}

export interface WarehouseSummary {
  id: string;
  name: string;
  sacks: number;
  pctFull: number;
  low: boolean;
  lat?: number | undefined;
  lng?: number | undefined;
}
export interface BinSummary {
  id: string;
  warehouseId: string;
  code: string;
  /** Floor-plan grid position parsed from the code; "Other" row for codes that do not match. */
  row: string;
  col: number;
  sacks: number;
  kg: number;
  capacitySacks: number;
  pctFull: number;
  low: boolean;
  lots: { lotId: string; productId: string; sacks: number }[];
}
export interface WarehouseOverview {
  warehouses: WarehouseSummary[];
  bins: BinSummary[];
}

export const OTHER_ROW = 'Other';
/** "A1" gives row A, col 1; anything else goes to the trailing Other row (col set by caller). */
export function parseBinCode(code: string): { row: string; col: number } {
  const m = /^([A-Za-z]+)(\d+)$/.exec(code.trim());
  return m ? { row: m[1]!.toUpperCase(), col: Number(m[2]) } : { row: OTHER_ROW, col: 0 };
}

export interface CycleCountView extends Omit<CycleCountRecord, 'lines'> {
  lines: (CountLine & { system: number })[];
}

const realBalances = (): StockBalance[] =>
  [...state.balances.values()].filter((b) => isRealLocation(b.locationId) && b.sacks > 0);

const productSacks = (productId: string) =>
  realBalances()
    .filter((b) => b.productId === productId)
    .reduce((n, b) => n + b.sacks, 0);

const ageDays = (lot: Lot) => Math.floor((Date.now() - new Date(lot.receivedOn).getTime()) / DAY);

function lowStock(): LowStockAlert[] {
  return state.products
    .filter((p) => p.active)
    .map((product) => ({ product, sacks: productSacks(product.id) }))
    .filter((a) => a.sacks < a.product.reorderPoint);
}

function overview(): WarehouseOverview {
  const lowIds = new Set(lowStock().map((a) => a.product.id));
  const stock = realBalances();
  const bins: BinSummary[] = [];
  const warehouses = state.warehouses.map((w): WarehouseSummary => {
    let other = 0;
    const mine = state.bins.filter((b) => b.warehouseId === w.id);
    for (const b of mine) {
      const lots = stock
        .filter((x) => x.locationId === b.id)
        .map((x) => ({ lotId: x.lotId, productId: x.productId, sacks: x.sacks }));
      const sacks = lots.reduce((n, l) => n + l.sacks, 0);
      const kg = lots.reduce(
        (n, l) => n + l.sacks * find(state.products, l.productId, 'Product').sackKg,
        0,
      );
      const pos = parseBinCode(b.code);
      bins.push({
        id: b.id,
        warehouseId: w.id,
        code: b.code,
        row: pos.row,
        col: pos.row === OTHER_ROW ? ++other : pos.col,
        sacks,
        kg,
        capacitySacks: b.capacitySacks,
        pctFull: (sacks / b.capacitySacks) * 100,
        low: lots.some((l) => lowIds.has(l.productId)),
        lots,
      });
    }
    const wb = bins.filter((b) => b.warehouseId === w.id);
    const sacks = wb.reduce((n, b) => n + b.sacks, 0);
    const capacity = wb.reduce((n, b) => n + b.capacitySacks, 0);
    return {
      id: w.id,
      name: w.name,
      sacks,
      pctFull: capacity ? (sacks / capacity) * 100 : 0,
      low: wb.some((b) => b.low),
      lat: w.lat,
      lng: w.lng,
    };
  });
  return { warehouses, bins };
}

function aging(): AgingAlert[] {
  return state.lots
    .map((lot) => ({
      lot,
      sacks: realBalances()
        .filter((b) => b.lotId === lot.id)
        .reduce((n, b) => n + b.sacks, 0),
      ageDays: ageDays(lot),
    }))
    .filter((a) => a.sacks > 0 && a.ageDays > AGING_DAYS);
}

function updateCrud<T extends { id: string }>(
  list: T[],
  id: string,
  patch: Omit<T, 'id'>,
  what: string,
) {
  const item = find(list, id, what);
  Object.assign(item, patch);
  logAudit(`Updated ${what.toLowerCase()}`, `${what} ${id}`);
}

function updatePoStatus(po: PurchaseOrder) {
  if (po.status === 'cancelled') return;
  const total = po.lines.reduce((n, l) => n + l.receivedSacks, 0);
  const done = po.lines.every((l) => l.receivedSacks >= l.sacks);
  po.status = done ? 'received' : total > 0 ? 'partially_received' : po.status;
}

export const api = {
  setActor,
  getRefs: (): Promise<Refs> =>
    read({
      products: state.products,
      warehouses: state.warehouses,
      bins: state.bins,
      suppliers: state.suppliers,
      lots: state.lots,
    }),

  listStock: (): Promise<StockBalance[]> => read(realBalances()),
  listMovements: (): Promise<Movement[]> => read([...state.movements].reverse()),
  listAudit: (): Promise<AuditEntry[]> => read([...state.audit].reverse()),

  getDashboard: (): Promise<Dashboard> =>
    read({
      warehouses: state.warehouses.map((warehouse) => {
        const binIds = new Set(
          state.bins.filter((b) => b.warehouseId === warehouse.id).map((b) => b.id),
        );
        let sacks = 0;
        let kg = 0;
        for (const b of realBalances().filter((x) => binIds.has(x.locationId))) {
          sacks += b.sacks;
          kg += b.sacks * find(state.products, b.productId, 'Product').sackKg;
        }
        return { warehouse, sacks, kg };
      }),
      lowStockCount: lowStock().length,
      agingLotCount: aging().length,
      recent: [...state.movements].reverse().slice(0, 8),
    }),

  getWarehouseOverview: (): Promise<WarehouseOverview> => read(overview()),

  getAlerts: (): Promise<{ lowStock: LowStockAlert[]; aging: AgingAlert[] }> =>
    read({ lowStock: lowStock(), aging: aging() }),

  receive(input: unknown): Promise<Movement> {
    const v = parse(ReceiveInput, input);
    find(state.suppliers, v.supplierId, 'Supplier');
    find(state.products, v.productId, 'Product');
    binWarehouse(v.binId);
    const po = v.purchaseOrderId
      ? find(state.purchaseOrders, v.purchaseOrderId, 'Purchase order')
      : undefined;
    if (po && !['ordered', 'partially_received'].includes(po.status)) {
      throw new ApiError('invalid', `${po.number} is not open for receiving`);
    }
    const poLine = po?.lines.find((l) => l.productId === v.productId);
    if (po && !poLine) throw new ApiError('invalid', `${po.number} has no line for that product`);

    let lotId = v.lotId;
    if (v.newLot) {
      if (state.lots.some((l) => l.code === v.newLot!.code)) {
        throw new ApiError('invalid', 'A lot with that code already exists');
      }
      lotId = newId('lot');
      state.lots.push({
        id: lotId,
        ...v.newLot,
        productId: v.productId,
        supplierId: v.supplierId,
        receivedOn: seed.isoDate(new Date()),
      });
    } else {
      lotFor(lotId!, v.productId);
    }
    const m = post({
      type: 'receipt',
      fromLocation: SUPPLIER_LOCATION,
      toLocation: v.binId,
      productId: v.productId,
      lotId: lotId!,
      sacks: v.sacks,
      reference: po?.number ?? null,
    });
    if (po && poLine) {
      poLine.receivedSacks += v.sacks;
      updatePoStatus(po);
    }
    logAudit('Received stock', `${v.sacks} sacks to ${v.binId}`);
    return read(m);
  },

  transfer(input: unknown): Promise<Movement> {
    const v = parse(TransferInput, input);
    binWarehouse(v.fromBinId);
    binWarehouse(v.toBinId);
    lotFor(v.lotId, v.productId);
    const m = post({
      type: 'transfer',
      fromLocation: v.fromBinId,
      toLocation: v.toBinId,
      productId: v.productId,
      lotId: v.lotId,
      sacks: v.sacks,
    });
    logAudit('Transferred stock', `${v.sacks} sacks ${v.fromBinId} to ${v.toBinId}`);
    return read(m);
  },

  /** Negative sacks move stock to the loss location; positive sacks bring it back. */
  adjust(input: unknown): Promise<Movement> {
    const v = parse(AdjustmentInput, input);
    binWarehouse(v.binId);
    lotFor(v.lotId, v.productId);
    const out = v.sacks < 0;
    const m = post({
      type: v.kind,
      fromLocation: out ? v.binId : LOSS_LOCATION,
      toLocation: out ? LOSS_LOCATION : v.binId,
      productId: v.productId,
      lotId: v.lotId,
      sacks: Math.abs(v.sacks),
      note: `${v.reason}: ${v.note}`,
    });
    logAudit(
      v.kind === 'writeoff' ? 'Wrote off stock' : 'Adjusted stock',
      `${v.sacks} sacks at ${v.binId}`,
    );
    return read(m);
  },

  listCounts(): Promise<CycleCountRecord[]> {
    return read([...state.counts].reverse());
  },

  getCount(id: string): Promise<CycleCountView> {
    const c = find(state.counts, id, 'Cycle count');
    return read({
      ...c,
      lines: c.lines.map((l) => ({ ...l, system: balanceOf(l.binId, l.productId, l.lotId) })),
    });
  },

  startCount(warehouseId: string): Promise<CycleCountRecord> {
    find(state.warehouses, warehouseId, 'Warehouse');
    const binIds = new Set(
      state.bins.filter((b) => b.warehouseId === warehouseId).map((b) => b.id),
    );
    const lines: CountLine[] = realBalances()
      .filter((b) => binIds.has(b.locationId))
      .map((b) => ({ binId: b.locationId, productId: b.productId, lotId: b.lotId, counted: null }));
    if (lines.length === 0) throw new ApiError('invalid', 'This warehouse has no stock to count');
    const count: CycleCountRecord = {
      id: newId('cc'),
      warehouseId,
      status: 'open',
      createdAt: new Date().toISOString(),
      lines,
    };
    state.counts.push(count);
    logAudit('Started cycle count', warehouseId);
    return read(count);
  },

  setCounted(countId: string, index: number, counted: number | null): Promise<void> {
    const c = find(state.counts, countId, 'Cycle count');
    const line = c.lines[index];
    if (c.status !== 'open' || !line) throw new ApiError('invalid', 'Count is closed');
    if (counted !== null && (!Number.isInteger(counted) || counted < 0)) {
      throw new ApiError('invalid', 'Counted sacks must be a whole number, 0 or more');
    }
    line.counted = counted;
    return Promise.resolve();
  },

  /** Posts a count_correction movement for each variance against the current balance. */
  postCount(countId: string): Promise<number> {
    const c = find(state.counts, countId, 'Cycle count');
    if (c.status !== 'open') throw new ApiError('invalid', 'Count is already posted');
    if (c.lines.some((l) => l.counted === null))
      throw new ApiError('invalid', 'Enter a count for every line');
    let corrections = 0;
    for (const l of c.lines) {
      const diff = l.counted! - balanceOf(l.binId, l.productId, l.lotId);
      if (diff === 0) continue;
      post({
        type: 'count_correction',
        fromLocation: diff < 0 ? l.binId : LOSS_LOCATION,
        toLocation: diff < 0 ? LOSS_LOCATION : l.binId,
        productId: l.productId,
        lotId: l.lotId,
        sacks: Math.abs(diff),
        reference: c.id,
        note: 'count_correction: cycle count',
      });
      corrections++;
    }
    c.status = 'posted';
    logAudit('Posted cycle count', `${c.id} (${corrections} corrections)`);
    return read(corrections);
  },

  saveProduct(input: unknown, id?: string): Promise<void> {
    const v = parse(ProductInput, input);
    if (id) updateCrud(state.products, id, v, 'Product');
    else {
      state.products.push({ id: newId('prod'), ...v });
      logAudit('Created product', v.name);
    }
    return Promise.resolve();
  },

  saveWarehouse(input: unknown, id?: string): Promise<void> {
    const v = parse(WarehouseInput, input);
    if (id) updateCrud(state.warehouses, id, v, 'Warehouse');
    else {
      state.warehouses.push({ id: newId('wh'), ...v });
      logAudit('Created warehouse', v.name);
    }
    return Promise.resolve();
  },

  saveBin(input: unknown, id?: string): Promise<void> {
    const v = parse(BinInput, input);
    find(state.warehouses, v.warehouseId, 'Warehouse');
    if (
      state.bins.some((b) => b.id !== id && b.warehouseId === v.warehouseId && b.code === v.code)
    ) {
      throw new ApiError('invalid', 'That bin code already exists in this warehouse');
    }
    if (id) updateCrud(state.bins, id, v, 'Bin');
    else {
      state.bins.push({ id: newId('bin'), ...v });
      logAudit('Created bin', v.code);
    }
    return Promise.resolve();
  },

  saveSupplier(input: unknown, id?: string): Promise<void> {
    const v = parse(SupplierInput, input);
    if (id) updateCrud(state.suppliers, id, v, 'Supplier');
    else {
      state.suppliers.push({ id: newId('sup'), ...v });
      logAudit('Created supplier', v.name);
    }
    return Promise.resolve();
  },

  listPurchaseOrders: (): Promise<PurchaseOrder[]> => read([...state.purchaseOrders].reverse()),

  createPurchaseOrder(input: unknown): Promise<PurchaseOrder> {
    const v = parse(PurchaseOrderInput, input);
    find(state.suppliers, v.supplierId, 'Supplier');
    const po: PurchaseOrder = {
      id: newId('po'),
      number: `PO-${String(state.purchaseOrders.length + 1).padStart(4, '0')}`,
      supplierId: v.supplierId,
      status: 'draft',
      createdOn: seed.isoDate(new Date()),
      lines: v.lines.map((l) => ({ ...l, receivedSacks: 0 })),
    };
    state.purchaseOrders.push(po);
    logAudit('Created purchase order', po.number);
    return read(po);
  },

  setPurchaseOrderStatus(id: string, status: 'ordered' | 'cancelled'): Promise<void> {
    const po = find(state.purchaseOrders, id, 'Purchase order');
    const allowed =
      status === 'ordered' ? po.status === 'draft' : ['draft', 'ordered'].includes(po.status);
    if (!allowed)
      throw new ApiError('invalid', `A ${po.status.replace('_', ' ')} order cannot be ${status}`);
    po.status = status;
    logAudit(`Purchase order ${status}`, po.number);
    return Promise.resolve();
  },

  currentActor: () => actor,
};
