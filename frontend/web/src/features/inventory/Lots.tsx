import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { api } from '@/api';
import { useRefs } from '@/api/hooks';
import { Card, DataTable, PageHeader } from '@/components/ui';
import { date, sacks } from '@/lib/format';

export function Lots() {
  const { refs, lookup } = useRefs();
  const { data: stock = [] } = useQuery({ queryKey: ['stock'], queryFn: api.listStock });
  const onHand = (lotId: string) =>
    stock.filter((b) => b.lotId === lotId).reduce((n, b) => n + b.sacks, 0);
  return (
    <>
      <PageHeader title="Lots" />
      <DataTable
        rows={refs.lots}
        rowKey={(l) => l.id}
        columns={[
          {
            header: 'Lot',
            cell: (l) => (
              <Link
                to="/inventory/lots/$lotId"
                params={{ lotId: l.id }}
                className="text-green-700 underline"
              >
                {l.code}
              </Link>
            ),
          },
          { header: 'Product', cell: (l) => lookup.productName(l.productId) },
          { header: 'Supplier', cell: (l) => lookup.supplierName(l.supplierId) },
          { header: 'Received', cell: (l) => date(l.receivedOn) },
          { header: 'On hand', cell: (l) => sacks(onHand(l.id)), className: 'text-right' },
        ]}
      />
    </>
  );
}

export function LotDetail() {
  const { lotId } = useParams({ strict: false }) as { lotId: string };
  const { lookup } = useRefs();
  const { data: stock = [] } = useQuery({ queryKey: ['stock'], queryFn: api.listStock });
  const lot = lookup.lot.get(lotId);
  if (!lot) return <PageHeader title="Lot not found" />;
  const fact = (label: string, value: string) => (
    <p>
      <span className="text-neutral-500">{label}</span>
      <br />
      {value}
    </p>
  );
  return (
    <>
      <PageHeader title={`Lot ${lot.code}`}>
        <Link to="/inventory/lots" className="text-sm underline">
          Back to lots
        </Link>
      </PageHeader>
      <Card className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
        {fact('Product', lookup.productName(lot.productId))}
        {fact('Supplier', lookup.supplierName(lot.supplierId))}
        {fact('Grade', lot.grade)}
        {fact('Milled', date(lot.milledOn))}
        {fact('Received', date(lot.receivedOn))}
        {fact('Moisture', `${lot.moisturePct}%`)}
      </Card>
      <h2 className="mb-2 font-medium">Current stock by location</h2>
      <DataTable
        rows={stock.filter((b) => b.lotId === lotId)}
        rowKey={(b) => b.locationId}
        empty="No stock of this lot on hand."
        columns={[
          { header: 'Location', cell: (b) => lookup.location(b.locationId) },
          { header: 'Sacks', cell: (b) => sacks(b.sacks), className: 'text-right' },
        ]}
      />
    </>
  );
}
