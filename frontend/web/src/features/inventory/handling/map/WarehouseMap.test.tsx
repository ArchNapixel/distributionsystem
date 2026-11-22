import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, resetMock } from '@/api';
import { FALLBACK_STYLE } from './layout';
import { LocationPicker, type Location } from './LocationPicker';
import { maps } from './maplibre.mock';
import { WarehouseMap, type WarehouseMapHandle, type WarehouseMapProps } from './WarehouseMap';

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

function setup(props: Partial<WarehouseMapProps> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ref = createRef<WarehouseMapHandle>();
  const full: WarehouseMapProps = {
    warehouses,
    bins: [],
    selectedId: null,
    onSelect: vi.fn(),
    onBack: vi.fn(),
    onOpenFloor: vi.fn(),
    ref,
    ...props,
  };
  const element = (p: Partial<WarehouseMapProps> = {}) => (
    <QueryClientProvider client={qc}>
      <WarehouseMap {...full} {...p} />
    </QueryClientProvider>
  );
  const view = render(element());
  return {
    ...full,
    ref,
    rerender: (p: Partial<WarehouseMapProps>) => view.rerender(element(p)),
  };
}
const pins = () => screen.getAllByRole('button', { name: /Warehouse,/ });
const panel = () => document.querySelector('.wmap-panel') as HTMLElement;

beforeEach(() => {
  resetMock();
  maps.length = 0;
});

describe('WarehouseMap', () => {
  it('renders one marker per placed warehouse and flags low stock', async () => {
    setup();
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
    const { onSelect } = setup();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Toril Warehouse/ }));
    expect(onSelect).toHaveBeenLastCalledWith('wh-toril');
    screen.getByRole('button', { name: /Panacan Warehouse/ }).focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('wh-panacan');
  });

  it('fits all warehouses on load and from the handle, tilted and rotated', () => {
    const { ref } = setup();
    const map = maps[0]!;
    expect(map.jumpTo).toHaveBeenCalledTimes(1);
    expect(map.jumpTo).toHaveBeenCalledWith(expect.objectContaining({ pitch: 45, bearing: -12 }));
    act(() => ref.current!.fit());
    expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ duration: 1800, pitch: 45 }));
  });

  it('skips warehouses without a location and says so', async () => {
    setup({
      warehouses: [
        ...warehouses,
        { id: 'wh-new', name: 'New Warehouse', sacks: 0, pctFull: 0, low: false },
      ],
    });
    await waitFor(() => expect(pins()).toHaveLength(3));
    expect(screen.getByRole('status')).toHaveTextContent('1 warehouse has no location yet');
  });

  it('resizes and adds the flow layers on every style load', () => {
    setup();
    const map = maps[0]!;
    act(() => map.fire('style.load', {}));
    expect(map.resize).toHaveBeenCalled();
    expect(map.sources.has('wh-flow')).toBe(true);
    expect(map.sources.has('wh-dots')).toBe(true);
  });

  it('falls back to the second basemap once, and only for fetch errors', () => {
    setup();
    const map = maps[0]!;
    act(() => map.fire('error', { error: new Error('Could not load image') }));
    expect(map.setStyle).not.toHaveBeenCalled();
    act(() => map.fire('error', { sourceId: 'openmaptiles', error: new Error('x') }));
    act(() => map.fire('error', { error: new Error('Failed to fetch') }));
    expect(map.setStyle).toHaveBeenCalledTimes(1);
    expect(map.setStyle).toHaveBeenCalledWith(FALLBACK_STYLE);
  });

  describe('with a warehouse selected', () => {
    const open = async () => {
      const overview = await api.getWarehouseOverview();
      const view = setup({
        warehouses: overview.warehouses,
        bins: overview.bins,
        selectedId: 'wh-toril',
      });
      return { ...view, overview };
    };

    it('flies in, opens the panel and dims the other warehouses', async () => {
      const { overview } = await open();
      expect(maps[0]!.flyTo).toHaveBeenCalledWith(
        expect.objectContaining({ zoom: 15.6, pitch: 58, bearing: -24 }),
      );
      const bins = overview.bins.filter((b) => b.warehouseId === 'wh-toril');
      const sacks = overview.warehouses.find((w) => w.id === 'wh-toril')!.sacks;
      const capacity = bins.reduce((n, b) => n + b.capacitySacks, 0);
      const p = within(screen.getByRole('complementary', { name: 'Toril Warehouse details' }));
      expect(await p.findByText('Toril, Davao City')).toBeInTheDocument();
      expect(
        p.getByText(
          `${sacks.toLocaleString('en-US')} of ${capacity.toLocaleString('en-US')} sacks`,
        ),
      ).toBeInTheDocument();
      expect(p.getAllByRole('button', { name: /^Open bin / })).toHaveLength(bins.length);
      const markers = screen.getAllByRole('button', { name: /Warehouse, [\d,]+ sacks/ });
      expect(markers.filter((m) => m.dataset.state === 'dimmed')).toHaveLength(
        overview.warehouses.length - 1,
      );
      expect(markers.find((m) => m.dataset.state === 'selected')).toHaveAccessibleName(/^Toril/);
    });

    it('opens the floor plan from the header button and from a bin card', async () => {
      const { onOpenFloor } = await open();
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Open floor plan' }));
      expect(onOpenFloor).toHaveBeenLastCalledWith('wh-toril', undefined);
      await user.click(screen.getByRole('button', { name: /^Open bin A1,/ }));
      expect(onOpenFloor).toHaveBeenLastCalledWith('wh-toril', 'wh-toril-A1');
    });

    it('goes back from the close button and flies out when deselected', async () => {
      const { onBack, rerender } = await open();
      await userEvent.click(screen.getByRole('button', { name: 'Close details' }));
      expect(onBack).toHaveBeenCalled();
      const map = maps[0]!;
      rerender({ selectedId: null });
      expect(map.stop).toHaveBeenCalled();
      expect(map.setPadding).toHaveBeenCalledWith({ top: 0, right: 0, bottom: 0, left: 0 });
      expect(map.flyTo).toHaveBeenLastCalledWith(expect.objectContaining({ duration: 1800 }));
      // The panel slides out but keeps its content, and is no longer reachable.
      expect(panel()).toHaveAttribute('data-open', 'false');
      expect(panel()).toHaveTextContent('Toril Warehouse');
      expect(panel()).toHaveAttribute('inert');
    });

    it('Fit all while open goes back instead of re-fitting under the panel', async () => {
      const { ref, onBack } = await open();
      act(() => ref.current!.fit());
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('transfers', () => {
    const transfer = async () => {
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
    };
    type Collection = { features: { geometry: { type: string; coordinates: unknown } }[] };
    const lastData = (map: (typeof maps)[number], source: string) =>
      map.sources.get(source)!.setData.mock.lastCall![0] as Collection;

    it('draws one route and its two dots for a recent inter-warehouse transfer', async () => {
      await transfer();
      setup();
      const map = maps[0]!;
      act(() => map.fire('style.load', {}));
      await waitFor(() => expect(lastData(map, 'wh-flow').features).toHaveLength(1));
      expect(lastData(map, 'wh-flow').features[0]!.geometry.type).toBe('LineString');
      await waitFor(() => expect(lastData(map, 'wh-dots').features).toHaveLength(2));
    });

    it('draws nothing without transfers', async () => {
      setup();
      const map = maps[0]!;
      act(() => map.fire('style.load', {}));
      await waitFor(() => expect(map.sources.get('wh-flow')!.setData).toHaveBeenCalled());
      expect(lastData(map, 'wh-flow').features).toHaveLength(0);
    });

    it('lists the transfer in the panel at both ends', async () => {
      await transfer();
      const overview = await api.getWarehouseOverview();
      const view = setup({
        warehouses: overview.warehouses,
        bins: overview.bins,
        selectedId: 'wh-toril',
      });
      expect(await screen.findByText('Out to Panacan Warehouse')).toBeInTheDocument();
      view.rerender({ selectedId: 'wh-panacan' });
      expect(await screen.findByText('In from Toril Warehouse')).toBeInTheDocument();
    });

    it('parks the two dots at the same midpoint when motion is reduced', async () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      try {
        await transfer();
        setup();
        const map = maps[0]!;
        act(() => map.fire('style.load', {}));
        await waitFor(() => expect(lastData(map, 'wh-dots').features).toHaveLength(2));
        const [a, b] = lastData(map, 'wh-dots').features;
        expect(a!.geometry.coordinates).toEqual(b!.geometry.coordinates);
      } finally {
        vi.unstubAllGlobals();
      }
    });
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
