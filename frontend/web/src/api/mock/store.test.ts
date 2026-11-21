import { LOSS_LOCATION, SUPPLIER_LOCATION } from '@drh/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { api, ApiError, resetMock } from '..';
import { balanceOf, state } from './store';

const bin1 = 'wh-toril-A2';
const bin2 = 'wh-calinan-A1';
const total = (productId: string, lotId: string) =>
  state.bins.reduce((n, b) => n + balanceOf(b.id, productId, lotId), 0);

beforeEach(resetMock);

describe('mock ledger', () => {
  it('receiving increases the bin balance and appends a movement', async () => {
    const before = balanceOf(bin1, 'prod-1', 'lot-1');
    const n = state.movements.length;
    await api.receive({
      supplierId: 'sup-1',
      binId: bin1,
      productId: 'prod-1',
      lotId: 'lot-1',
      sacks: 7,
    });
    expect(balanceOf(bin1, 'prod-1', 'lot-1')).toBe(before + 7);
    expect(state.movements).toHaveLength(n + 1);
    expect(state.movements.at(-1)).toMatchObject({
      fromLocation: SUPPLIER_LOCATION,
      toLocation: bin1,
    });
  });

  it('a transfer moves stock and keeps the total unchanged', async () => {
    await api.receive({
      supplierId: 'sup-1',
      binId: bin1,
      productId: 'prod-1',
      lotId: 'lot-1',
      sacks: 20,
    });
    const t = total('prod-1', 'lot-1');
    await api.transfer({
      fromBinId: bin1,
      toBinId: bin2,
      productId: 'prod-1',
      lotId: 'lot-1',
      sacks: 5,
    });
    expect(balanceOf(bin2, 'prod-1', 'lot-1')).toBeGreaterThanOrEqual(5);
    expect(total('prod-1', 'lot-1')).toBe(t);
  });

  it('rejects a transfer beyond the balance and changes nothing', async () => {
    const have = balanceOf(bin1, 'prod-1', 'lot-1');
    const n = state.movements.length;
    await expect(
      Promise.resolve().then(() =>
        api.transfer({
          fromBinId: bin1,
          toBinId: bin2,
          productId: 'prod-1',
          lotId: 'lot-1',
          sacks: have + 1,
        }),
      ),
    ).rejects.toMatchObject({ code: 'insufficient_stock' });
    expect(balanceOf(bin1, 'prod-1', 'lot-1')).toBe(have);
    expect(state.movements).toHaveLength(n);
  });

  it('rejects an adjustment beyond the balance', async () => {
    const have = balanceOf(bin1, 'prod-1', 'lot-1');
    expect(() =>
      api.adjust({
        kind: 'adjustment',
        binId: bin1,
        productId: 'prod-1',
        lotId: 'lot-1',
        sacks: -(have + 1),
        reason: 'other',
        note: 'x',
      }),
    ).toThrow(ApiError);
  });

  it('a write-off moves stock to the loss location', async () => {
    const have = balanceOf(bin1, 'prod-1', 'lot-1');
    await api.adjust({
      kind: 'writeoff',
      binId: bin1,
      productId: 'prod-1',
      lotId: 'lot-1',
      sacks: -2,
      reason: 'damaged',
      note: 'wet',
      photo: 'a.jpg',
    });
    expect(balanceOf(bin1, 'prod-1', 'lot-1')).toBe(have - 2);
    expect(balanceOf(LOSS_LOCATION, 'prod-1', 'lot-1')).toBe(2);
  });

  it('posting a cycle count creates corrections equal to the variance', async () => {
    const c = await api.startCount('wh-toril');
    const idx = c.lines.findIndex((l) => l.binId === bin1 && l.productId === 'prod-1');
    const system = balanceOf(bin1, 'prod-1', 'lot-1');
    for (const [i, l] of c.lines.entries()) {
      await api.setCounted(
        c.id,
        i,
        i === idx ? system - 3 : balanceOf(l.binId, l.productId, l.lotId),
      );
    }
    expect(await api.postCount(c.id)).toBe(1);
    expect(balanceOf(bin1, 'prod-1', 'lot-1')).toBe(system - 3);
    expect(state.movements.at(-1)).toMatchObject({ type: 'count_correction', sacks: 3 });
  });

  it('receiving against a PO updates received quantities and status', async () => {
    await api.receive({
      supplierId: 'sup-1',
      purchaseOrderId: 'po-1',
      binId: bin1,
      productId: 'prod-1',
      lotId: 'lot-1',
      sacks: 200,
    });
    const po = state.purchaseOrders.find((p) => p.id === 'po-1')!;
    expect(po.lines[0]!.receivedSacks).toBe(200);
    expect(po.status).toBe('partially_received');
  });
});
