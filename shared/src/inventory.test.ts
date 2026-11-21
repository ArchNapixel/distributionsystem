import { describe, expect, it } from 'vitest';
import { AdjustmentInput, ReceiveInput, TransferInput } from './inventory.js';

const adj = {
  kind: 'writeoff',
  binId: 'b',
  productId: 'p',
  lotId: 'l',
  sacks: -2,
  reason: 'damaged',
  note: 'wet',
};

describe('inventory schemas', () => {
  it('rejects non-positive or fractional sacks', () => {
    const base = { supplierId: 's', binId: 'b', productId: 'p', lotId: 'l' };
    expect(ReceiveInput.safeParse({ ...base, sacks: 0 }).success).toBe(false);
    expect(ReceiveInput.safeParse({ ...base, sacks: 1.5 }).success).toBe(false);
    expect(ReceiveInput.safeParse({ ...base, sacks: 10 }).success).toBe(true);
  });
  it('requires exactly one of existing or new lot', () => {
    const base = { supplierId: 's', binId: 'b', productId: 'p', sacks: 1 };
    expect(ReceiveInput.safeParse(base).success).toBe(false);
  });
  it('rejects transfer to the same bin', () => {
    expect(
      TransferInput.safeParse({
        fromBinId: 'a',
        toBinId: 'a',
        productId: 'p',
        lotId: 'l',
        sacks: 1,
      }).success,
    ).toBe(false);
  });
  it('write-off needs a photo and a negative quantity', () => {
    expect(AdjustmentInput.safeParse(adj).success).toBe(false);
    expect(AdjustmentInput.safeParse({ ...adj, photo: 'a.jpg' }).success).toBe(true);
    expect(AdjustmentInput.safeParse({ ...adj, photo: 'a.jpg', sacks: 2 }).success).toBe(false);
  });
  it('adjustment needs a note and non-zero sacks', () => {
    const a = { ...adj, kind: 'adjustment', reason: 'count_correction' };
    expect(AdjustmentInput.safeParse(a).success).toBe(true);
    expect(AdjustmentInput.safeParse({ ...a, note: ' ' }).success).toBe(false);
    expect(AdjustmentInput.safeParse({ ...a, sacks: 0 }).success).toBe(false);
  });
});
