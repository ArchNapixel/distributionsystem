import { zodResolver } from '@hookform/resolvers/zod';
import { PurchaseOrderInput, type PurchaseOrderStatus } from '@drh/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { api } from '@/api';
import { useRefs, useWrite } from '@/api/hooks';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Field,
  Input,
  Notice,
  PageHeader,
  Select,
} from '@/components/ui';
import { date } from '@/lib/format';

const TONE = {
  draft: 'neutral',
  ordered: 'amber',
  partially_received: 'amber',
  received: 'green',
  cancelled: 'red',
} as const;
const label = (s: PurchaseOrderStatus) => s.replace('_', ' ');

export function PurchaseOrders() {
  const { lookup } = useRefs();
  const { data: orders = [] } = useQuery({ queryKey: ['pos'], queryFn: api.listPurchaseOrders });
  const [creating, setCreating] = useState(false);
  const setStatus = useWrite(api.setPurchaseOrderStatus);
  return (
    <>
      <PageHeader title="Purchase orders">
        <Button onClick={() => setCreating(true)}>New purchase order</Button>
      </PageHeader>
      {creating && <PurchaseOrderForm onDone={() => setCreating(false)} />}
      {setStatus.isError && <Notice>{setStatus.error.message}</Notice>}
      <DataTable
        rows={orders}
        rowKey={(o) => o.id}
        columns={[
          { header: 'Number', cell: (o) => o.number },
          { header: 'Supplier', cell: (o) => lookup.supplierName(o.supplierId) },
          { header: 'Created', cell: (o) => date(o.createdOn) },
          {
            header: 'Lines',
            cell: (o) =>
              o.lines
                .map((l) => `${lookup.productName(l.productId)}: ${l.receivedSacks}/${l.sacks}`)
                .join(', '),
          },
          { header: 'Status', cell: (o) => <Badge tone={TONE[o.status]}>{label(o.status)}</Badge> },
          {
            header: '',
            cell: (o) => (
              <div className="flex gap-2">
                {o.status === 'draft' && (
                  <Button variant="outline" onClick={() => setStatus.mutate([o.id, 'ordered'])}>
                    Mark ordered
                  </Button>
                )}
                {['draft', 'ordered'].includes(o.status) && (
                  <Button variant="outline" onClick={() => setStatus.mutate([o.id, 'cancelled'])}>
                    Cancel
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
    </>
  );
}

function PurchaseOrderForm({ onDone }: { onDone: () => void }) {
  const { refs } = useRefs();
  const write = useWrite(api.createPurchaseOrder);
  const form = useForm<PurchaseOrderInput>({
    resolver: zodResolver(PurchaseOrderInput),
    defaultValues: { lines: [{ productId: '' }] },
  });
  const lines = useFieldArray({ control: form.control, name: 'lines' });
  const e = form.formState.errors;
  const submit = form.handleSubmit((v) => write.mutate([v], { onSuccess: onDone }));
  return (
    <Card className="mb-4 max-w-2xl">
      <form onSubmit={submit} noValidate className="space-y-3">
        <Field label="Supplier" htmlFor="po-supplier" error={e.supplierId?.message}>
          <Select id="po-supplier" {...form.register('supplierId')}>
            <option value="">Select a supplier</option>
            {refs.suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        {lines.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
            <Field
              label={`Product ${i + 1}`}
              htmlFor={`po-p-${i}`}
              error={e.lines?.[i]?.productId?.message}
            >
              <Select id={`po-p-${i}`} {...form.register(`lines.${i}.productId`)}>
                <option value="">Select a product</option>
                {refs.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sacks" htmlFor={`po-s-${i}`} error={e.lines?.[i]?.sacks?.message}>
              <Input
                id={`po-s-${i}`}
                type="number"
                {...form.register(`lines.${i}.sacks`, { valueAsNumber: true })}
              />
            </Field>
            <Button
              variant="outline"
              disabled={lines.fields.length === 1}
              onClick={() => lines.remove(i)}
            >
              Remove
            </Button>
          </div>
        ))}
        {(e.lines?.message ?? e.lines?.root?.message) && (
          <p role="alert" className="text-xs text-red-700">
            {e.lines?.message ?? e.lines?.root?.message}
          </p>
        )}
        <Button
          variant="outline"
          onClick={() => lines.append({ productId: '', sacks: undefined as never })}
        >
          Add line
        </Button>
        {write.isError && <Notice>{write.error.message}</Notice>}
        <div className="flex gap-2">
          <Button type="submit" disabled={write.isPending}>
            Create purchase order
          </Button>
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
