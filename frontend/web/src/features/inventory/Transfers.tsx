import { zodResolver } from '@hookform/resolvers/zod';
import { TransferInput } from '@drh/shared';
import { useForm, useWatch } from 'react-hook-form';
import { api } from '@/api';
import { useWrite } from '@/api/hooks';
import { Button, Field, Input, Notice, PageHeader } from '@/components/ui';
import { sacks } from '@/lib/format';
import { BinSelect, ProductLotFields } from './StockFields';

export function Transfers() {
  const write = useWrite(api.transfer);
  const form = useForm<TransferInput>({ resolver: zodResolver(TransferInput) });
  const { register, formState, control } = form;
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
