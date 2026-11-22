import { lazy, Suspense, useRef, useState } from 'react';
import { useWarehouseOverview } from '@/api/hooks';
import { useRole } from '@/components/layout/role';
import { Button, PageHeader } from '@/components/ui';
import { canAccess } from '@/lib/roles';
import { BinPanel } from './BinPanel';
import type { WarehouseMapHandle } from './map/WarehouseMap';
import { WarehouseFloor } from './WarehouseFloor';
import './handling.css';

// MapLibre is large: load the map only on this screen.
const WarehouseMap = lazy(() =>
  import('./map/WarehouseMap').then((m) => ({ default: m.WarehouseMap })),
);

export function WarehouseHandling() {
  const { role } = useRole();
  const { data } = useWarehouseOverview();
  const [warehouseId, setWarehouseId] = useState<string | null>(null); // floor plan open
  const [binId, setBinId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null); // map selection
  const mapRef = useRef<WarehouseMapHandle>(null);

  if (!data) return <PageHeader title="Warehouse handling" />;
  const warehouse = data.warehouses.find((w) => w.id === warehouseId);
  const bins = data.bins.filter((b) => b.warehouseId === warehouseId);
  const bin = bins.find((b) => b.id === binId);

  return (
    <>
      <PageHeader title="Warehouse handling">
        {warehouse ? (
          <Button
            variant="outline"
            onClick={() => {
              setWarehouseId(null);
              setBinId(null);
            }}
          >
            All warehouses
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => mapRef.current?.fit()}
            disabled={!data.warehouses.some((w) => w.lat !== undefined && w.lng !== undefined)}
          >
            Fit all warehouses
          </Button>
        )}
      </PageHeader>
      {warehouse ? (
        <>
          <h2 className="mb-2 font-medium">{warehouse.name}</h2>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
            <WarehouseFloor bins={bins} selectedId={binId} onSelect={setBinId} />
            {bin && (
              <BinPanel
                bin={bin}
                canAct={canAccess(role, 'stockops')}
                onClose={() => setBinId(null)}
              />
            )}
          </div>
        </>
      ) : (
        // Fill the content area below the header (top bar + page padding + page title ≈ 11rem).
        <div className="h-[calc(100dvh-11rem)] min-h-[420px]">
          <Suspense fallback={<div className="h-full rounded-lg bg-white" />}>
            <WarehouseMap
              ref={mapRef}
              warehouses={data.warehouses}
              bins={data.bins}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onBack={() => setSelectedId(null)}
              onOpenFloor={(id, bin) => {
                setWarehouseId(id);
                setBinId(bin ?? null);
                setSelectedId(null);
              }}
            />
          </Suspense>
        </div>
      )}
    </>
  );
}
