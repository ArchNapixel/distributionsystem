import { zodResolver } from '@hookform/resolvers/zod';
import { SupplierInput, type Supplier } from '@drh/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/api';
import { useRefs, useWrite } from '@/api/hooks';
import { Button, Card, DataTable, Field, Input, Notice, PageHeader } from '@/components/ui';

export function Suppliers() {
  const { refs } = useRefs();
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null);
  return (
    <>
      <PageHeader title="Suppliers">
        <Button onClick={() => setEditing('new')}>New supplier</Button>
      </PageHeader>
      {editing && (
        <SupplierForm
          key={editing === 'new' ? 'new' : editing.id}
          item={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      )}
      <DataTable
        rows={refs.suppliers}
        rowKey={(s) => s.id}
        columns={[
          { header: 'Name', cell: (s) => s.name },
          { header: 'Contact', cell: (s) => s.contact },
          {
            header: '',
            cell: (s) => (
              <Button variant="outline" onClick={() => setEditing(s)}>
                Edit
              </Button>
            ),
          },
        ]}
      />
    </>
  );
}

function SupplierForm({ item, onDone }: { item?: Supplier | undefined; onDone: () => void }) {
  const write = useWrite(api.saveSupplier);
  const form = useForm<SupplierInput>({
    resolver: zodResolver(SupplierInput),
    defaultValues: item,
  });
  const e = form.formState.errors;
  const submit = form.handleSubmit((v) => write.mutate([v, item?.id], { onSuccess: onDone }));
  return (
    <Card className="mb-4 max-w-xl">
      <form onSubmit={submit} noValidate className="space-y-3">
        <Field label="Supplier name" htmlFor="s-name" error={e.name?.message}>
          <Input id="s-name" {...form.register('name')} />
        </Field>
        <Field label="Contact" htmlFor="s-contact" error={e.contact?.message}>
          <Input id="s-contact" {...form.register('contact')} />
        </Field>
        {write.isError && <Notice>{write.error.message}</Notice>}
        <div className="flex gap-2">
          <Button type="submit" disabled={write.isPending}>
            Save supplier
          </Button>
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
