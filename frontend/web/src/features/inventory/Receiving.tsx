import { zodResolver } from '@hookform/resolvers/zod';
import { ReceiveInput } from '@drh/shared';
import { useQuery } from '@tanstack/react-query';
import { useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { api } from '@/api';
import { useRefs, useWrite } from '@/api/hooks';
import { Button, Field, Input, Notice, PageHeader, Select } from '@/components/ui';
import { sacks } from '@/lib/format';
import { BinSelect } from './StockFields';

type Mode = 'existing' | 'new';

/** Blank selects and the unused lot choice become undefined before validation. */
const normalize = (v: ReceiveInput, mode: Mode): ReceiveInput => ({
  ...v,
  purchaseOrderId: v.purchaseOrderId || undefined,
  lotId: mode === 'existing' ? v.lotId || undefined : undefined,
  newLot: mode === 'new' ? v.newLot : undefined,
});

export function Receiving() {
  const { refs, ready } = useRefs();
  const { binId } = useSearch({ strict: false }) as { binId?: unknown };
  const prefillBin = typeof binId === 'string' ? binId : '';
  const { data: orders = [] } = useQuery({ queryKey: ['pos'], queryFn: api.listPurchaseOrders });
  const write = useWrite(api.receive);
  const [mode, setMode] = useState<Mode>('existing');
  const form = useForm<ReceiveInput>({
    resolver: (values, ctx, opts) => zodResolver(ReceiveInput)(normalize(values, mode), ctx, opts),
    defaultValues: { binId: prefillBin, newLot: { code: '', grade: '', milledOn: '' } },
  });
  const { register, formState, control, setValue } = form;
  // The bin options load asynchronously, so apply the pre-fill once they exist.
  useEffect(() => {
    if (ready && prefillBin) setValue('binId', prefillBin);
  }, [ready, prefillBin, setValue]);
  const e = formState.errors;
  const supplierId = useWatch({ control, name: 'supplierId' });
  const productId = useWatch({ control, name: 'productId' });
  const openOrders = orders.filter(
    (o) => o.supplierId === supplierId && ['ordered', 'partially_received'].includes(o.status),
  );

  const submit = form.handleSubmit((v) =>
    write.mutate([v], {
      onSuccess: () => {
        form.reset();
        setMode('existing');
      },
    }),
  );

  return (
    <>
      <PageHeader title="Receiving" />
      <form onSubmit={submit} noValidate className="max-w-xl space-y-4">
        <Field label="Supplier" htmlFor="supplierId" error={e.supplierId?.message}>
          <Select id="supplierId" {...register('supplierId')}>
            <option value="">Select a supplier</option>
            {refs.suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Purchase order (optional)"
          htmlFor="purchaseOrderId"
          error={e.purchaseOrderId?.message}
        >
          <Select id="purchaseOrderId" {...register('purchaseOrderId')}>
            <option value="">No purchase order</option>
            {openOrders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.number}
              </option>
            ))}
          </Select>
        </Field>
        <BinSelect id="binId" label="Bin" reg={register('binId')} error={e.binId?.message} />
        <Field label="Product" htmlFor="productId" error={e.productId?.message}>
          <Select id="productId" {...register('productId')}>
            <option value="">Select a product</option>
            {refs.products
              .filter((p) => p.active)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        </Field>
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Lot</legend>
          <div className="flex gap-4 text-sm">
            {(['existing', 'new'] as const).map((m) => (
              <label key={m} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="lotMode"
                  checked={mode === m}
                  onChange={() => setMode(m)}
                />
                {m === 'existing' ? 'Existing lot' : 'New lot'}
              </label>
            ))}
          </div>
          {mode === 'existing' ? (
            <Field label="Existing lot" htmlFor="lotId" error={e.lotId?.message}>
              <Select id="lotId" {...register('lotId')}>
                <option value="">Select a lot</option>
                {refs.lots
                  .filter((l) => l.productId === productId)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code}
                    </option>
                  ))}
              </Select>
            </Field>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Lot code" htmlFor="lot-code" error={e.newLot?.code?.message}>
                <Input id="lot-code" {...register('newLot.code')} />
              </Field>
              <Field label="Grade" htmlFor="lot-grade" error={e.newLot?.grade?.message}>
                <Input id="lot-grade" {...register('newLot.grade')} />
              </Field>
              <Field label="Milling date" htmlFor="lot-milled" error={e.newLot?.milledOn?.message}>
                <Input id="lot-milled" type="date" {...register('newLot.milledOn')} />
              </Field>
              <Field
                label="Moisture %"
                htmlFor="lot-moisture"
                error={e.newLot?.moisturePct?.message}
              >
                <Input
                  id="lot-moisture"
                  type="number"
                  step="0.1"
                  {...register('newLot.moisturePct', { valueAsNumber: true })}
                />
              </Field>
            </div>
          )}
        </fieldset>
        <Field label="Sacks" htmlFor="sacks" error={e.sacks?.message}>
          <Input
            id="sacks"
            type="number"
            inputMode="numeric"
            {...register('sacks', { valueAsNumber: true })}
          />
        </Field>
        {write.isError && <Notice>{write.error.message}</Notice>}
        {write.isSuccess && <Notice tone="green">Received {sacks(write.data.sacks)}.</Notice>}
        <Button type="submit" disabled={write.isPending}>
          Receive stock
        </Button>
      </form>
    </>
  );
}
