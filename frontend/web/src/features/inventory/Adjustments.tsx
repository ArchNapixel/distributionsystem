import { zodResolver } from '@hookform/resolvers/zod';
import { AdjustmentInput } from '@drh/shared';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { api } from '@/api';
import { useWrite } from '@/api/hooks';
import { Button, Field, Input, Notice, PageHeader, Select, Textarea } from '@/components/ui';
import { BinSelect, ProductLotFields } from './StockFields';

const REASONS = [
  ['damaged', 'Damaged'],
  ['spoiled', 'Spoiled / moisture'],
  ['pest', 'Pest'],
  ['count_correction', 'Count correction'],
  ['other', 'Other'],
] as const;

export function Adjustments() {
  const write = useWrite(api.adjust);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const form = useForm<AdjustmentInput>({
    // Write-offs are entered as a positive quantity lost; the API takes it as negative.
    resolver: (v, ctx, opts) =>
      zodResolver(AdjustmentInput)(
        v.kind === 'writeoff' ? { ...v, sacks: -Math.abs(v.sacks) } : v,
        ctx,
        opts,
      ),
    defaultValues: { kind: 'adjustment', reason: 'count_correction' },
  });
  const { register, formState, control, setValue } = form;
  const e = formState.errors;
  const kind = useWatch({ control, name: 'kind' });
  const productId = useWatch({ control, name: 'productId' });
  const binId = useWatch({ control, name: 'binId' });

  const submit = form.handleSubmit((v) =>
    write.mutate([v], {
      onSuccess: () => {
        form.reset();
        setPreview(null);
      },
    }),
  );

  return (
    <>
      <PageHeader title="Adjustments & write-offs" />
      <form onSubmit={submit} noValidate className="max-w-xl space-y-4">
        <Field label="Type" htmlFor="kind">
          <Select id="kind" {...register('kind')}>
            <option value="adjustment">Adjustment (add or remove)</option>
            <option value="writeoff">Write-off (stock lost)</option>
          </Select>
        </Field>
        <BinSelect id="binId" label="Bin" reg={register('binId')} error={e.binId?.message} />
        <ProductLotFields
          product={register('productId')}
          lot={register('lotId')}
          productId={productId}
          binId={binId}
          errors={{ productId: e.productId?.message, lotId: e.lotId?.message }}
        />
        <Field
          label={kind === 'writeoff' ? 'Sacks lost' : 'Sacks (negative removes stock)'}
          htmlFor="sacks"
          error={e.sacks?.message}
        >
          <Input
            id="sacks"
            type="number"
            inputMode="numeric"
            {...register('sacks', { valueAsNumber: true })}
          />
        </Field>
        <Field label="Reason" htmlFor="reason" error={e.reason?.message}>
          <Select id="reason" {...register('reason')}>
            {REASONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note" htmlFor="note" error={e.note?.message}>
          <Textarea id="note" rows={2} {...register('note')} />
        </Field>
        {kind === 'writeoff' && (
          <Field label="Photo (required)" htmlFor="photo" error={e.photo?.message}>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                setValue('photo', f?.name, { shouldValidate: formState.isSubmitted });
                setPreview(f ? URL.createObjectURL(f) : null);
              }}
            />
            {preview && (
              <img
                src={preview}
                alt="Write-off preview"
                className="mt-2 h-32 rounded-md object-cover"
              />
            )}
          </Field>
        )}
        {write.isError && <Notice>{write.error.message}</Notice>}
        {write.isSuccess && <Notice tone="green">Posted.</Notice>}
        <Button type="submit" disabled={write.isPending}>
          {kind === 'writeoff' ? 'Write off stock' : 'Post adjustment'}
        </Button>
      </form>
    </>
  );
}
