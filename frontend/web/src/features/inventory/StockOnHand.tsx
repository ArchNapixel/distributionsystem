import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/api';
import { useRefs } from '@/api/hooks';
import { Badge, DataTable, Input, PageHeader, Select } from '@/components/ui';
import { kg, sacks } from '@/lib/format';

export function StockOnHand() {
  const { refs, lookup } = useRefs();
  const { data: stock = [] } = useQuery({ queryKey: ['stock'], queryFn: api.listStock });
  const { data: alerts } = useQuery({ queryKey: ['alerts'], queryFn: api.getAlerts });
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [search, setSearch] = useState('');
  const low = new Set(alerts?.lowStock.map((a) => a.product.id));

  const rows = stock.filter((b) => {
    const bin = lookup.bin.get(b.locationId);
    return (
      (!warehouseId || bin?.warehouseId === warehouseId) &&
      (!productId || b.productId === productId) &&
      (!search ||
        `${lookup.productName(b.productId)} ${lookup.lotCode(b.lotId)}`
          .toLowerCase()
          .includes(search.toLowerCase()))
    );
  });

  return (
    <>
      <PageHeader title="Stock on hand" />
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <div>
          <label htmlFor="f-wh" className="sr-only">
            Warehouse
          </label>
          <Select id="f-wh" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">All warehouses</option>
            {refs.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-prod" className="sr-only">
            Product
          </label>
          <Select id="f-prod" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">All products</option>
            {refs.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-search" className="sr-only">
            Search
          </label>
          <Input
            id="f-search"
            type="search"
            placeholder="Search product or lot"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <DataTable
        rows={rows}
        rowKey={(b) => `${b.locationId}|${b.productId}|${b.lotId}`}
        empty="No stock matches these filters."
        columns={[
          {
            header: 'Warehouse',
            cell: (b) => lookup.warehouseName(lookup.bin.get(b.locationId)?.warehouseId ?? ''),
          },
          { header: 'Bin', cell: (b) => lookup.bin.get(b.locationId)?.code },
          {
            header: 'Product',
            cell: (b) => (
              <>
                {lookup.productName(b.productId)}{' '}
                {low.has(b.productId) && <Badge tone="amber">Low stock</Badge>}
              </>
            ),
          },
          { header: 'Lot', cell: (b) => lookup.lotCode(b.lotId) },
          { header: 'Sacks', cell: (b) => sacks(b.sacks), className: 'text-right' },
          {
            header: 'Weight',
            cell: (b) => kg(b.sacks * (lookup.product.get(b.productId)?.sackKg ?? 0)),
            className: 'text-right',
          },
        ]}
      />
    </>
  );
}
