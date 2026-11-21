import { zodResolver } from '@hookform/resolvers/zod';
import { TransferInput } from '@drh/shared';
import { useSearch } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { api } from '@/api';
import { useRefs, useWrite } from '@/api/hooks';
import { Button, Field, Input, Notice, PageHeader } from '@/components/ui';
import { sacks } from '@/lib/format';
import { BinSelect, ProductLotFields } from './StockFields';

export function Transfers() {
  const write = useWrite(api.transfer);
  const { ready } = useRefs();
  const { fromBinId: from } = useSearch({ strict: false }) as { fromBinId?: unknown };
  const prefillFrom = typeof from === 'string' ? from : '';
  const form = useForm<TransferInput>({
    resolver: zodResolver(TransferInput),
    defaultValues: { fromBinId: prefillFrom },
  });
  const { register, formState, control, setValue } = form;
  // The bin options load asynchronously, so apply the pre-fill once they exist.
  useEffect(() => {
    if (ready && prefillFrom) setValue('fromBinId', prefillFrom);
  }, [ready, prefillFrom, setValue]);
  const productId = useWatch({ control, name: 'productId' });
  const fromBinId = useWatch({ control, name: 'fromBinId' });
  const e = formState.errors;

  const submit = form.handleSubmit((v) => write.mutate([v], { onSuccess: () => form.reset() }));

  return (
    <>
      <PageHeader title="Transfers" />
      <form onSubmit={submit} noValidate className="max-w-xl space-y-4">
        <BinSelect
          id="fromBinId"
          label="From bin"
          reg={register('fromBinId')}
          error={e.fromBinId?.message}
        />
        <BinSelect
          id="toBinId"
          label="To bin"
          reg={register('toBinId')}
          error={e.toBinId?.message}
        />
        <ProductLotFields
          product={register('productId')}
          lot={register('lotId')}
          productId={productId}
          binId={fromBinId}
          errors={{ productId: e.productId?.message, lotId: e.lotId?.message }}
        />
        <Field label="Sacks" htmlFor="sacks" error={e.sacks?.message}>
          <Input
            id="sacks"
            type="number"
            inputMode="numeric"
            {...register('sacks', { valueAsNumber: true })}
          />
        </Field>
        {write.isError && <Notice>{write.error.message}</Notice>}
        {write.isSuccess && <Notice tone="green">Transferred {sacks(write.data.sacks)}.</Notice>}
        <Button type="submit" disabled={write.isPending}>
          Transfer stock
        </Button>
      </form>
    </>
  );
}
