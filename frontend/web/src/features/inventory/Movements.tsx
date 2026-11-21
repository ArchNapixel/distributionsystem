import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/api';
import { useRefs } from '@/api/hooks';
import { DataTable, PageHeader, Select } from '@/components/ui';
import { dateTime } from '@/lib/format';

export function Movements() {
  const { refs, lookup } = useRefs();
  const { data: movements = [] } = useQuery({
    queryKey: ['movements'],
    queryFn: api.listMovements,
  });
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const inWarehouse = (loc: string) => lookup.bin.get(loc)?.warehouseId === warehouseId;
  const rows = movements.filter(
    (m) =>
      (!productId || m.productId === productId) &&
      (!warehouseId || inWarehouse(m.fromLocation) || inWarehouse(m.toLocation)),
  );
  return (
    <>
      <PageHeader title="Movements" />
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor="m-prod" className="sr-only">
            Product
          </label>
          <Select id="m-prod" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">All products</option>
            {refs.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="m-wh" className="sr-only">
            Warehouse
          </label>
          <Select id="m-wh" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">All warehouses</option>
            {refs.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <DataTable
        rows={rows}
        rowKey={(m) => m.id}
        columns={[
          { header: 'Time', cell: (m) => dateTime(m.at) },
          { header: 'Type', cell: (m) => m.type.replace('_', ' ') },
          { header: 'From', cell: (m) => lookup.location(m.fromLocation) },
          { header: 'To', cell: (m) => lookup.location(m.toLocation) },
          { header: 'Product', cell: (m) => lookup.productName(m.productId) },
          { header: 'Lot', cell: (m) => lookup.lotCode(m.lotId) },
          { header: 'Sacks', cell: (m) => m.sacks, className: 'text-right' },
          { header: 'User', cell: (m) => m.userName },
          { header: 'Reference', cell: (m) => m.reference ?? m.note ?? '' },
        ]}
      />
    </>
  );
}
