import { zodResolver } from '@hookform/resolvers/zod';
import { ProductInput, type Product } from '@drh/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/api';
import { useRefs, useWrite } from '@/api/hooks';
import { useRole } from '@/components/layout/role';
import { Badge, Button, Card, DataTable, Field, Input, Notice, PageHeader } from '@/components/ui';
import { canEditSetup } from '@/lib/roles';

export function Products() {
  const { refs } = useRefs();
  const { role } = useRole();
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const canEdit = canEditSetup(role);
  return (
    <>
      <PageHeader title="Products">
        {canEdit && <Button onClick={() => setEditing('new')}>New product</Button>}
      </PageHeader>
      {editing && (
        <ProductForm
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      )}
      <DataTable
        rows={refs.products}
        rowKey={(p) => p.id}
        columns={[
          { header: 'Name', cell: (p) => p.name },
          { header: 'Variety', cell: (p) => p.variety },
          { header: 'Brand', cell: (p) => p.brand },
          { header: 'Sack', cell: (p) => `${p.sackKg} kg`, className: 'text-right' },
          { header: 'Reorder point', cell: (p) => p.reorderPoint, className: 'text-right' },
          {
            header: 'Status',
            cell: (p) => (
              <Badge tone={p.active ? 'green' : 'neutral'}>
                {p.active ? 'Active' : 'Inactive'}
              </Badge>
            ),
          },
          {
            header: '',
            cell: (p) =>
              canEdit && (
                <Button variant="outline" onClick={() => setEditing(p)}>
                  Edit
                </Button>
              ),
          },
        ]}
      />
    </>
  );
}

function ProductForm({ product, onDone }: { product?: Product | undefined; onDone: () => void }) {
  const write = useWrite(api.saveProduct);
  const form = useForm<ProductInput>({
    resolver: zodResolver(ProductInput),
    defaultValues: product ?? { active: true },
  });
  const { register, formState } = form;
  const e = formState.errors;
  const submit = form.handleSubmit((v) => write.mutate([v, product?.id], { onSuccess: onDone }));
  return (
    <Card className="mb-4 max-w-2xl">
      <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="p-name" error={e.name?.message}>
          <Input id="p-name" {...register('name')} />
        </Field>
        <Field label="Variety" htmlFor="p-variety" error={e.variety?.message}>
          <Input id="p-variety" {...register('variety')} />
        </Field>
        <Field label="Brand" htmlFor="p-brand" error={e.brand?.message}>
          <Input id="p-brand" {...register('brand')} />
        </Field>
        <Field label="Sack size (kg)" htmlFor="p-kg" error={e.sackKg?.message}>
          <Input id="p-kg" type="number" {...register('sackKg', { valueAsNumber: true })} />
        </Field>
        <Field label="Reorder point (sacks)" htmlFor="p-reorder" error={e.reorderPoint?.message}>
          <Input
            id="p-reorder"
            type="number"
            {...register('reorderPoint', { valueAsNumber: true })}
          />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" {...register('active')} /> Active
        </label>
        <div className="space-y-2 sm:col-span-2">
          {write.isError && <Notice>{write.error.message}</Notice>}
          <div className="flex gap-2">
            <Button type="submit" disabled={write.isPending}>
              Save product
            </Button>
            <Button variant="outline" onClick={onDone}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
