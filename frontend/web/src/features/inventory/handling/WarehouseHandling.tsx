import { lazy, Suspense, useState } from 'react';
import { useWarehouseOverview } from '@/api/hooks';
import { useRole } from '@/components/layout/role';
import { Button, PageHeader } from '@/components/ui';
import { canAccess } from '@/lib/roles';
import { BinPanel } from './BinPanel';
import { WarehouseFloor } from './WarehouseFloor';
import './handling.css';

// MapLibre is large: load the map only on this screen.
const WarehouseMap = lazy(() =>
  import('./map/WarehouseMap').then((m) => ({ default: m.WarehouseMap })),
);

export function WarehouseHandling() {
  const { role } = useRole();
  const { data } = useWarehouseOverview();
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [binId, setBinId] = useState<string | null>(null);

  if (!data) return <PageHeader title="Warehouse handling" />;
  const warehouse = data.warehouses.find((w) => w.id === warehouseId);
  const bins = data.bins.filter((b) => b.warehouseId === warehouseId);
  const bin = bins.find((b) => b.id === binId);

  return (
    <>
      <PageHeader title="Warehouse handling">
        {warehouse && (
          <Button
            variant="outline"
            onClick={() => {
              setWarehouseId(null);
              setBinId(null);
            }}
          >
            All warehouses
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
            <WarehouseMap warehouses={data.warehouses} onSelect={setWarehouseId} />
          </Suspense>
        </div>
      )}
    </>
  );
}
