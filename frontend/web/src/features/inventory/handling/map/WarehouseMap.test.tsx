import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, resetMock } from '@/api';
import { WarehouseMap, type WarehouseMapProps } from './WarehouseMap';

const warehouses: WarehouseMapProps['warehouses'] = [
  { id: 'wh-toril', name: 'Toril Warehouse', sacks: 900, pctFull: 60, low: false },
  { id: 'wh-calinan', name: 'Calinan Warehouse', sacks: 40, pctFull: 5, low: true },
  { id: 'wh-panacan', name: 'Panacan Warehouse', sacks: 500, pctFull: 35, low: false },
];

const renderMap = (onSelect = vi.fn()) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <WarehouseMap warehouses={warehouses} onSelect={onSelect} />
    </QueryClientProvider>,
  );
  return onSelect;
};

beforeEach(() => resetMock());

describe('WarehouseMap', () => {
  it('renders one pin per warehouse and flags low stock', () => {
    renderMap();
    expect(screen.getAllByRole('button')).toHaveLength(3);
    const low = screen.getByRole('button', { name: /Calinan Warehouse.*low stock/ });
    expect(low).toHaveAttribute('data-low', 'true');
    expect(screen.getByRole('button', { name: /Toril Warehouse/ })).toHaveAttribute(
      'data-low',
      'false',
    );
  });

  it('selects a warehouse by click and by Enter', async () => {
    const onSelect = renderMap();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Toril Warehouse/ }));
    expect(onSelect).toHaveBeenLastCalledWith('wh-toril');
    screen.getByRole('button', { name: /Panacan Warehouse/ }).focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('wh-panacan');
  });

  it('shows one truck for a recent inter-warehouse transfer', async () => {
    const refs = await api.getRefs();
    const from = refs.bins.find((b) => b.warehouseId === 'wh-toril')!;
    const to = refs.bins.find((b) => b.warehouseId === 'wh-panacan')!;
    const bal = (await api.listStock()).find((b) => b.locationId === from.id && b.sacks > 0)!;
    await api.transfer({
      fromBinId: from.id,
      toBinId: to.id,
      productId: bal.productId,
      lotId: bal.lotId,
      sacks: 1,
    });
    renderMap();
    await waitFor(() => expect(screen.getAllByTestId('truck')).toHaveLength(1));
  });
});
