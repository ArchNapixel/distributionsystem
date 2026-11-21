import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, resetMock } from '@/api';
import { LocationPicker, type Location } from './LocationPicker';
import { maps } from './maplibre.mock';
import { WarehouseMap, type WarehouseMapProps } from './WarehouseMap';

vi.mock('maplibre-gl', () => import('./maplibre.mock'));

const warehouses: WarehouseMapProps['warehouses'] = [
  {
    id: 'wh-toril',
    name: 'Toril Warehouse',
    sacks: 900,
    pctFull: 60,
    low: false,
    lat: 7.0186,
    lng: 125.497,
  },
  {
    id: 'wh-calinan',
    name: 'Calinan Warehouse',
    sacks: 40,
    pctFull: 5.4,
    low: true,
    lat: 7.1897,
    lng: 125.4553,
  },
  {
    id: 'wh-panacan',
    name: 'Panacan Warehouse',
    sacks: 500,
    pctFull: 35,
    low: false,
    lat: 7.146,
    lng: 125.658,
  },
];

const renderMap = (list = warehouses, onSelect = vi.fn()) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <WarehouseMap warehouses={list} onSelect={onSelect} />
    </QueryClientProvider>,
  );
  return onSelect;
};
const pins = () => screen.getAllByRole('button', { name: /Warehouse,/ });

beforeEach(() => {
  resetMock();
  maps.length = 0;
});

describe('WarehouseMap', () => {
  it('renders one marker per placed warehouse and flags low stock', async () => {
    renderMap();
    await waitFor(() => expect(pins()).toHaveLength(3));
    const low = screen.getByRole('button', {
      name: 'Calinan Warehouse, 40 sacks, 5% full, low stock',
    });
    expect(low).toHaveAttribute('data-low', 'true');
    expect(low).toHaveTextContent('Low stock');
    expect(screen.getByRole('button', { name: /Toril Warehouse/ })).toHaveAttribute(
      'data-low',
      'false',
    );
  });

  it('selects a warehouse by click and by Enter', async () => {
    const onSelect = renderMap();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Toril Warehouse/ }));
    expect(onSelect).toHaveBeenLastCalledWith('wh-toril');
    screen.getByRole('button', { name: /Panacan Warehouse/ }).focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('wh-panacan');
  });

  it('fits all warehouses on load and from the button', async () => {
    renderMap();
    const map = maps[0]!;
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Fit all warehouses' }));
    expect(map.fitBounds).toHaveBeenCalledTimes(2);
  });

  it('skips warehouses without a location and says so', async () => {
    renderMap([
      ...warehouses,
      { id: 'wh-new', name: 'New Warehouse', sacks: 0, pctFull: 0, low: false },
    ]);
    await waitFor(() => expect(pins()).toHaveLength(3));
    expect(screen.getByRole('status')).toHaveTextContent('1 warehouse has no location yet');
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

describe('LocationPicker', () => {
  function Harness() {
    const [value, setValue] = useState<Location | undefined>();
    return <LocationPicker value={value} onChange={setValue} />;
  }

  it('places the warehouse where the map is clicked', async () => {
    render(<Harness />);
    expect(screen.getByText(/No location yet/)).toBeInTheDocument();
    await waitFor(() => expect(maps).toHaveLength(1));
    act(() => maps[0]!.fire('click', { lngLat: { lat: 7.123456789, lng: 125.6543219 } }));
    expect(await screen.findByText('Location: 7.12346, 125.65432')).toBeInTheDocument();
  });
});
