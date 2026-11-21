import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/api';
import { useRefs, useWrite } from '@/api/hooks';
import { Badge, Button, DataTable, Input, Notice, PageHeader, Select } from '@/components/ui';
import { dateTime } from '@/lib/format';

export function CycleCounts() {
  const { refs, lookup } = useRefs();
  const { data: counts = [] } = useQuery({ queryKey: ['counts'], queryFn: api.listCounts });
  const [selected, setSelected] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState('');
  const start = useWrite(api.startCount);

  if (selected) return <CountDetail id={selected} onBack={() => setSelected(null)} />;
  return (
    <>
      <PageHeader title="Cycle counts" />
      <div className="mb-4 flex max-w-xl gap-2">
        <div className="flex-1">
          <label htmlFor="cc-wh" className="sr-only">
            Warehouse
          </label>
          <Select id="cc-wh" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">Select a warehouse</option>
            {refs.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          disabled={!warehouseId || start.isPending}
          onClick={() => start.mutate([warehouseId], { onSuccess: (c) => setSelected(c.id) })}
        >
          Start count
        </Button>
      </div>
      {start.isError && <Notice>{start.error.message}</Notice>}
      <DataTable
        rows={counts}
        rowKey={(c) => c.id}
        empty="No cycle counts yet."
        columns={[
          { header: 'Started', cell: (c) => dateTime(c.createdAt) },
          { header: 'Warehouse', cell: (c) => lookup.warehouseName(c.warehouseId) },
          {
            header: 'Status',
            cell: (c) => <Badge tone={c.status === 'open' ? 'amber' : 'green'}>{c.status}</Badge>,
          },
          {
            header: '',
            cell: (c) => (
              <Button variant="outline" onClick={() => setSelected(c.id)}>
                Open
              </Button>
            ),
          },
        ]}
      />
    </>
  );
}

function CountDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { lookup } = useRefs();
  const { data: count } = useQuery({ queryKey: ['count', id], queryFn: () => api.getCount(id) });
  const setCounted = useWrite(api.setCounted);
  const post = useWrite(api.postCount);
  if (!count) return null;
  const open = count.status === 'open';
  const complete = count.lines.every((l) => l.counted !== null);

  return (
    <>
      <PageHeader title={`Count: ${lookup.warehouseName(count.warehouseId)}`}>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        {open && (
          <Button disabled={!complete || post.isPending} onClick={() => post.mutate([id])}>
            Post corrections
          </Button>
        )}
      </PageHeader>
      {open && !complete && (
        <p className="mb-3 text-sm text-neutral-500">Enter a count for every line to post.</p>
      )}
      {post.isError && <Notice>{post.error.message}</Notice>}
      {post.isSuccess && <Notice tone="green">Posted {post.data} correction(s).</Notice>}
      <DataTable
        rows={count.lines.map((l, index) => ({ ...l, index }))}
        rowKey={(l) => String(l.index)}
        columns={[
          { header: 'Bin', cell: (l) => lookup.location(l.binId) },
          { header: 'Product', cell: (l) => lookup.productName(l.productId) },
          { header: 'Lot', cell: (l) => lookup.lotCode(l.lotId) },
          { header: 'System', cell: (l) => l.system, className: 'text-right' },
          {
            header: 'Counted',
            className: 'text-right',
            cell: (l) =>
              open ? (
                <Input
                  aria-label={`Counted sacks for ${lookup.productName(l.productId)} in ${lookup.location(l.binId)}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="ml-auto w-24"
                  defaultValue={l.counted ?? ''}
                  onBlur={(e) =>
                    setCounted.mutate([
                      id,
                      l.index,
                      e.target.value === '' ? null : Number(e.target.value),
                    ])
                  }
                />
              ) : (
                l.counted
              ),
          },
          {
            header: 'Variance',
            className: 'text-right',
            cell: (l) => {
              if (l.counted === null) return '';
              const v = l.counted - l.system;
              const pct = l.system === 0 ? '' : ` (${((v / l.system) * 100).toFixed(1)}%)`;
              return `${v > 0 ? '+' : ''}${v}${pct}`;
            },
          },
        ]}
      />
      {setCounted.isError && <Notice>{setCounted.error.message}</Notice>}
    </>
  );
}
