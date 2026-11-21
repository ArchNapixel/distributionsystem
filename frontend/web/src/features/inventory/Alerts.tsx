import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { useRefs } from '@/api/hooks';
import { DataTable, PageHeader } from '@/components/ui';
import { date, sacks } from '@/lib/format';

export function Alerts() {
  const { lookup } = useRefs();
  const { data } = useQuery({ queryKey: ['alerts'], queryFn: api.getAlerts });
  if (!data) return null;
  return (
    <>
      <PageHeader title="Alerts" />
      <h2 className="mb-2 font-medium">Low stock</h2>
      <div className="mb-6">
        <DataTable
          rows={data.lowStock}
          rowKey={(a) => a.product.id}
          empty="No products are below their reorder point."
          columns={[
            { header: 'Product', cell: (a) => a.product.name },
            { header: 'On hand', cell: (a) => sacks(a.sacks), className: 'text-right' },
            {
              header: 'Reorder point',
              cell: (a) => sacks(a.product.reorderPoint),
              className: 'text-right',
            },
          ]}
        />
      </div>
      <h2 className="mb-2 font-medium">Aging stock (received over 90 days ago)</h2>
      <DataTable
        rows={data.aging}
        rowKey={(a) => a.lot.id}
        empty="No aging lots."
        columns={[
          { header: 'Lot', cell: (a) => a.lot.code },
          { header: 'Product', cell: (a) => lookup.productName(a.lot.productId) },
          { header: 'Received', cell: (a) => date(a.lot.receivedOn) },
          { header: 'Age', cell: (a) => `${a.ageDays} days`, className: 'text-right' },
          { header: 'On hand', cell: (a) => sacks(a.sacks), className: 'text-right' },
        ]}
      />
    </>
  );
}
