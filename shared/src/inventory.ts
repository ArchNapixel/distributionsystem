// DRAFT CONTRACT (plan 004): shapes used by the mock-data frontend.
// The ledger/schema plan may revise these.
import { z } from 'zod';

const id = z.string().min(1, 'Select an option');
const sacks = z
  .number({ error: 'Enter the number of sacks' })
  .int('Enter a whole number of sacks')
  .positive('Enter a number of sacks above 0');

/** Virtual locations. Every other location id is a bin id (a real location). */
export const SUPPLIER_LOCATION = 'supplier';
export const LOSS_LOCATION = 'loss';
export const isRealLocation = (locationId: string) =>
  locationId !== SUPPLIER_LOCATION && locationId !== LOSS_LOCATION;

export const Product = z.object({
  id,
  name: z.string().trim().min(1, 'Name is required'),
  variety: z.string().trim().min(1, 'Variety is required'),
  brand: z.string().trim().min(1, 'Brand is required'),
  sackKg: z.number().int().positive('Sack size must be above 0 kg'),
  reorderPoint: z.number().int().min(0, 'Reorder point cannot be negative'),
  active: z.boolean(),
});
export type Product = z.infer<typeof Product>;
export const ProductInput = Product.omit({ id: true });
export type ProductInput = z.infer<typeof ProductInput>;

export const Warehouse = z.object({
  id,
  name: z.string().trim().min(1, 'Name is required'),
  address: z.string().trim().min(1, 'Address is required'),
  /** Map location (draft). Optional: an unplaced warehouse is not drawn on the map. */
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
export type Warehouse = z.infer<typeof Warehouse>;
export const WarehouseInput = Warehouse.omit({ id: true });
export type WarehouseInput = z.infer<typeof WarehouseInput>;

export const Bin = z.object({
  id,
  warehouseId: id,
  code: z.string().trim().min(1, 'Bin code is required'),
  capacitySacks: z
    .number({ error: 'Enter the capacity in sacks' })
    .int('Enter a whole number of sacks')
    .positive('Capacity must be above 0')
    .default(500),
});
export type Bin = z.infer<typeof Bin>;
export const BinInput = Bin.omit({ id: true });
export type BinInput = z.infer<typeof BinInput>;

export const Supplier = z.object({
  id,
  name: z.string().trim().min(1, 'Name is required'),
  contact: z.string().trim().min(1, 'Contact is required'),
});
export type Supplier = z.infer<typeof Supplier>;
export const SupplierInput = Supplier.omit({ id: true });
export type SupplierInput = z.infer<typeof SupplierInput>;

export const Lot = z.object({
  id,
  code: z.string().trim().min(1, 'Lot code is required'),
  productId: id,
  supplierId: id,
  milledOn: z.iso.date('Enter the milling date'),
  receivedOn: z.iso.date(),
  moisturePct: z.number({ error: 'Enter the moisture %' }).min(0).max(100),
  grade: z.string().trim().min(1, 'Grade is required'),
});
export type Lot = z.infer<typeof Lot>;
export const NewLotInput = Lot.pick({ code: true, milledOn: true, moisturePct: true, grade: true });
export type NewLotInput = z.infer<typeof NewLotInput>;

export const MovementType = z.enum([
  'receipt',
  'transfer',
  'adjustment',
  'writeoff',
  'count_correction',
]);
export type MovementType = z.infer<typeof MovementType>;

/** Append-only ledger row. Never edited or deleted; corrected by reversing entries. */
export const Movement = z.object({
  id,
  at: z.iso.datetime(),
  type: MovementType,
  fromLocation: id,
  toLocation: id,
  productId: id,
  lotId: id,
  sacks,
  userName: z.string(),
  reference: z.string().nullable(),
  note: z.string().nullable(),
});
export type Movement = z.infer<typeof Movement>;

export const StockBalance = z.object({
  locationId: id,
  productId: id,
  lotId: id,
  sacks: z.number().int().min(0),
});
export type StockBalance = z.infer<typeof StockBalance>;

export const PurchaseOrderStatus = z.enum([
  'draft',
  'ordered',
  'partially_received',
  'received',
  'cancelled',
]);
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatus>;

export const PurchaseOrderLine = z.object({
  productId: id,
  sacks,
  receivedSacks: z.number().int().min(0),
});
export type PurchaseOrderLine = z.infer<typeof PurchaseOrderLine>;

export const PurchaseOrder = z.object({
  id,
  number: z.string(),
  supplierId: id,
  status: PurchaseOrderStatus,
  createdOn: z.iso.date(),
  lines: z.array(PurchaseOrderLine).min(1),
});
export type PurchaseOrder = z.infer<typeof PurchaseOrder>;

export const PurchaseOrderInput = z.object({
  supplierId: id,
  lines: z
    .array(z.object({ productId: id, sacks }))
    .min(1, 'Add at least one line')
    .refine((lines) => new Set(lines.map((l) => l.productId)).size === lines.length, {
      message: 'Each product can appear once',
    }),
});
export type PurchaseOrderInput = z.infer<typeof PurchaseOrderInput>;

export const ReceiveInput = z
  .object({
    supplierId: id,
    purchaseOrderId: z.string().optional(),
    binId: id,
    productId: id,
    lotId: z.string().optional(),
    newLot: NewLotInput.optional(),
    sacks,
  })
  .refine((v) => Boolean(v.lotId) !== Boolean(v.newLot), {
    message: 'Pick an existing lot or enter a new one',
    path: ['lotId'],
  });
export type ReceiveInput = z.infer<typeof ReceiveInput>;

export const TransferInput = z
  .object({ fromBinId: id, toBinId: id, productId: id, lotId: id, sacks })
  .refine((v) => v.fromBinId !== v.toBinId, {
    message: 'Source and destination must differ',
    path: ['toBinId'],
  });
export type TransferInput = z.infer<typeof TransferInput>;

export const AdjustmentReason = z.enum(['damaged', 'spoiled', 'pest', 'count_correction', 'other']);
export type AdjustmentReason = z.infer<typeof AdjustmentReason>;

/** `sacks` is signed: negative removes stock (to loss), positive adds it. Write-offs are negative and need a photo. */
export const AdjustmentInput = z
  .object({
    kind: z.enum(['adjustment', 'writeoff']),
    binId: id,
    productId: id,
    lotId: id,
    sacks: z
      .number({ error: 'Enter the number of sacks' })
      .int('Enter a whole number of sacks')
      .refine((n) => n !== 0, 'Sacks cannot be 0'),
    reason: AdjustmentReason,
    note: z.string().trim().min(1, 'Add a note'),
    photo: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind !== 'writeoff') return;
    if (v.sacks > 0)
      ctx.addIssue({ code: 'custom', path: ['sacks'], message: 'A write-off removes stock' });
    if (v.reason === 'count_correction')
      ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Pick the cause of the loss' });
    if (!v.photo)
      ctx.addIssue({
        code: 'custom',
        path: ['photo'],
        message: 'A photo is required for write-offs',
      });
  });
export type AdjustmentInput = z.infer<typeof AdjustmentInput>;
