// In-memory mock of the future API. UI SIMULATION ONLY: the real invariants
// (append-only ledger, no negative stock, locking) are enforced server-side in the ledger plan.
import {
  SUPPLIER_LOCATION,
  isRealLocation,
  type Bin,
  type Lot,
  type Movement,
  type MovementType,
  type Product,
  type PurchaseOrder,
  type StockBalance,
  type Supplier,
  type Warehouse,
} from '@drh/shared';
import * as seed from './seed';

export class ApiError extends Error {
  constructor(
    readonly code: 'insufficient_stock' | 'invalid' | 'not_found',
    message: string,
  ) {
    super(message);
  }
}

export interface AuditEntry {
  id: string;
  at: string;
  userName: string;
  action: string;
  entity: string;
}

export interface CountLine {
  binId: string;
  productId: string;
  lotId: string;
  counted: number | null;
}

export interface CycleCountRecord {
  id: string;
  warehouseId: string;
  status: 'open' | 'posted';
  createdAt: string;
  lines: CountLine[];
}

interface State {
  products: Product[];
  warehouses: Warehouse[];
  bins: Bin[];
  suppliers: Supplier[];
  lots: Lot[];
  purchaseOrders: PurchaseOrder[];
  movements: Movement[];
  balances: Map<string, StockBalance>;
  counts: CycleCountRecord[];
  audit: AuditEntry[];
  seq: number;
}

export let state: State = emptyState();
export let actor = 'Owner';
export const setActor = (name: string) => {
  actor = name;
};

function emptyState(): State {
  return {
    products: [],
    warehouses: [],
    bins: [],
    suppliers: [],
    lots: [],
    purchaseOrders: [],
    movements: [],
    balances: new Map(),
    counts: [],
    audit: [],
    seq: 0,
  };
}

export const newId = (prefix: string) => `${prefix}-${++state.seq}`;

const key = (loc: string, productId: string, lotId: string) => `${loc}|${productId}|${lotId}`;

export const balanceOf = (loc: string, productId: string, lotId: string) =>
  state.balances.get(key(loc, productId, lotId))?.sacks ?? 0;

export function logAudit(action: string, entity: string, at = new Date()) {
  state.audit.push({ id: newId('aud'), at: at.toISOString(), userName: actor, action, entity });
}

function bump(loc: string, productId: string, lotId: string, delta: number) {
  const k = key(loc, productId, lotId);
  const sacks = (state.balances.get(k)?.sacks ?? 0) + delta;
  state.balances.set(k, { locationId: loc, productId, lotId, sacks });
}

export interface MovementDraft {
  type: MovementType;
  fromLocation: string;
  toLocation: string;
  productId: string;
  lotId: string;
  sacks: number;
  reference?: string | null;
  note?: string | null;
  at?: Date;
}

/** The only way stock changes: append a movement and update the balance projection together. */
export function post(d: MovementDraft): Movement {
  if (isRealLocation(d.fromLocation)) {
    const have = balanceOf(d.fromLocation, d.productId, d.lotId);
    if (have < d.sacks) {
      throw new ApiError(
        'insufficient_stock',
        `Not enough stock: ${have} sack${have === 1 ? '' : 's'} available, ${d.sacks} requested.`,
      );
    }
  }
  bump(d.fromLocation, d.productId, d.lotId, -d.sacks);
  bump(d.toLocation, d.productId, d.lotId, d.sacks);
  const movement: Movement = {
    id: newId('mov'),
    at: (d.at ?? new Date()).toISOString(),
    type: d.type,
    fromLocation: d.fromLocation,
    toLocation: d.toLocation,
    productId: d.productId,
    lotId: d.lotId,
    sacks: d.sacks,
    userName: actor,
    reference: d.reference ?? null,
    note: d.note ?? null,
  };
  state.movements.push(movement);
  return movement;
}

export function resetMock() {
  state = emptyState();
  actor = 'Owner';
  state.products = structuredClone(seed.products);
  state.warehouses = structuredClone(seed.warehouses);
  state.bins = structuredClone(seed.bins);
  state.suppliers = structuredClone(seed.suppliers);
  state.lots = structuredClone(seed.lots);
  state.purchaseOrders = structuredClone(seed.purchaseOrders);
  state.lots.forEach((lot, i) => {
    const received = new Date(lot.receivedOn);
    for (const { binId, sacks } of seed.openingStock(i)) {
      post({
        type: 'receipt',
        fromLocation: SUPPLIER_LOCATION,
        toLocation: binId,
        productId: lot.productId,
        lotId: lot.id,
        sacks,
        reference: 'Opening stock',
        at: received,
      });
    }
  });
  state.movements.sort((a, b) => a.at.localeCompare(b.at));
  logAudit('Loaded demo data', 'system');
}

resetMock();
