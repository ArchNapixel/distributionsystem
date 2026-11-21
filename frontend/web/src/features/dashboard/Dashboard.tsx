import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { useRefs } from '@/api/hooks';
import { Card, DataTable, PageHeader } from '@/components/ui';
import { dateTime, kg, sacks } from '@/lib/format';

export function Dashboard() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: api.getDashboard });
  const { lookup } = useRefs();
  if (!data) return null;
  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.warehouses.map(({ warehouse, sacks: s, kg: k }) => (
          <Card key={warehouse.id}>
            <p className="text-sm text-neutral-500">{warehouse.name}</p>
            <p className="text-2xl font-semibold">{sacks(s)}</p>
            <p className="text-sm text-neutral-500">{kg(k)}</p>
          </Card>
        ))}
        <Card>
          <p className="text-sm text-neutral-500">Low-stock products</p>
          <p className="text-2xl font-semibold">{data.lowStockCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-neutral-500">Lots older than 90 days</p>
          <p className="text-2xl font-semibold">{data.agingLotCount}</p>
        </Card>
      </div>
      <h2 className="mb-2 font-medium">Recent movements</h2>
      <DataTable
        rows={data.recent}
        rowKey={(m) => m.id}
        columns={[
          { header: 'Time', cell: (m) => dateTime(m.at) },
          { header: 'Type', cell: (m) => m.type.replace('_', ' ') },
          { header: 'Product', cell: (m) => lookup.productName(m.productId) },
          {
            header: 'From → To',
            cell: (m) => `${lookup.location(m.fromLocation)} → ${lookup.location(m.toLocation)}`,
          },
          { header: 'Sacks', cell: (m) => m.sacks, className: 'text-right' },
        ]}
      />
    </>
  );
}
