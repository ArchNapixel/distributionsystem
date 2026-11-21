import { useQuery } from '@tanstack/react-query';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { api } from '@/api';
import { useRefs } from '@/api/hooks';
import { Field, Select } from '@/components/ui';

export function BinSelect({
  id,
  label,
  reg,
  error,
}: {
  id: string;
  label: string;
  reg: UseFormRegisterReturn;
  error?: string | undefined;
}) {
  const { refs, lookup } = useRefs();
  return (
    <Field label={label} htmlFor={id} error={error}>
      <Select id={id} {...reg}>
        <option value="">Select a bin</option>
        {refs.bins.map((b) => (
          <option key={b.id} value={b.id}>
            {lookup.location(b.id)}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** Product select, plus a lot select limited to that product's lots (with sacks in the chosen bin). */
export function ProductLotFields({
  product,
  lot,
  productId,
  binId,
  errors,
}: {
  product: UseFormRegisterReturn;
  lot: UseFormRegisterReturn;
  productId: string | undefined;
  binId: string | undefined;
  errors: { productId?: string | undefined; lotId?: string | undefined };
}) {
  const { refs } = useRefs();
  const { data: stock = [] } = useQuery({ queryKey: ['stock'], queryFn: api.listStock });
  const lots = refs.lots.filter((l) => l.productId === productId);
  const here = (lotId: string) =>
    stock.find((b) => b.locationId === binId && b.lotId === lotId)?.sacks ?? 0;
  return (
    <>
      <Field label="Product" htmlFor={product.name} error={errors.productId}>
        <Select id={product.name} {...product}>
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
      <Field label="Lot" htmlFor={lot.name} error={errors.lotId}>
        <Select id={lot.name} {...lot}>
          <option value="">Select a lot</option>
          {lots.map((l) => (
            <option key={l.id} value={l.id}>
              {binId ? `${l.code} (${here(l.id)} in this bin)` : l.code}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}
