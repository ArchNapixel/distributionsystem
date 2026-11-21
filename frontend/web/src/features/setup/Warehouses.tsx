import { zodResolver } from '@hookform/resolvers/zod';
import { BinInput, WarehouseInput, type Bin, type Warehouse } from '@drh/shared';
import { lazy, Suspense, useState } from 'react';
import type { z } from 'zod';
import { useForm, useWatch } from 'react-hook-form';
import { api } from '@/api';
import { useRefs, useWrite } from '@/api/hooks';
import { useRole } from '@/components/layout/role';
import { Button, Card, DataTable, Field, Input, Notice, PageHeader, Select } from '@/components/ui';
import { sacks } from '@/lib/format';
import { canEditSetup } from '@/lib/roles';

// MapLibre is large: load the picker only when a warehouse form opens.
const LocationPicker = lazy(() =>
  import('@/features/inventory/handling/map/LocationPicker').then((m) => ({
    default: m.LocationPicker,
  })),
);

type Editing = { kind: 'warehouse'; item?: Warehouse } | { kind: 'bin'; item?: Bin } | null;

export function Warehouses() {
  const { refs } = useRefs();
  const { role } = useRole();
  const [editing, setEditing] = useState<Editing>(null);
  const canEdit = canEditSetup(role);
  const done = () => setEditing(null);
  return (
    <>
      <PageHeader title="Warehouses & bins">
        {canEdit && (
          <>
            <Button onClick={() => setEditing({ kind: 'warehouse' })}>New warehouse</Button>
            <Button variant="outline" onClick={() => setEditing({ kind: 'bin' })}>
              New bin
            </Button>
          </>
        )}
      </PageHeader>
      {editing?.kind === 'warehouse' && (
        <WarehouseForm key={editing.item?.id ?? 'new'} item={editing.item} onDone={done} />
      )}
      {editing?.kind === 'bin' && (
        <BinForm key={editing.item?.id ?? 'new'} item={editing.item} onDone={done} />
      )}
      <div className="space-y-6">
        {refs.warehouses.map((w) => (
          <section key={w.id}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-medium">
                {w.name} <span className="text-sm font-normal text-neutral-500">{w.address}</span>
              </h2>
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={() => setEditing({ kind: 'warehouse', item: w })}
                >
                  Edit
                </Button>
              )}
            </div>
            <DataTable
              rows={refs.bins.filter((b) => b.warehouseId === w.id)}
              rowKey={(b) => b.id}
              empty="No bins yet."
              columns={[
                { header: 'Bin', cell: (b) => b.code },
                { header: 'Capacity', cell: (b) => sacks(b.capacitySacks) },
                {
                  header: '',
                  cell: (b) =>
                    canEdit && (
                      <Button
                        variant="outline"
                        onClick={() => setEditing({ kind: 'bin', item: b })}
                      >
                        Edit
                      </Button>
                    ),
                },
              ]}
            />
          </section>
        ))}
      </div>
    </>
  );
}

function WarehouseForm({ item, onDone }: { item?: Warehouse | undefined; onDone: () => void }) {
  const write = useWrite(api.saveWarehouse);
  const form = useForm<WarehouseInput>({
    resolver: zodResolver(WarehouseInput),
    defaultValues: item,
  });
  const e = form.formState.errors;
  const [lat, lng] = useWatch({ control: form.control, name: ['lat', 'lng'] });
  const submit = form.handleSubmit((v) => write.mutate([v, item?.id], { onSuccess: onDone }));
  return (
    <Card className="mb-4 max-w-xl">
      <form onSubmit={submit} noValidate className="space-y-3">
        <Field label="Warehouse name" htmlFor="w-name" error={e.name?.message}>
          <Input id="w-name" {...form.register('name')} />
        </Field>
        <Field label="Address" htmlFor="w-address" error={e.address?.message}>
          <Input id="w-address" {...form.register('address')} />
        </Field>
        <div className="space-y-1">
          <p className="text-sm font-medium">Location</p>
          <Suspense fallback={<div className="h-56 rounded-md border border-neutral-300" />}>
            <LocationPicker
              value={lat !== undefined && lng !== undefined ? { lat, lng } : undefined}
              onChange={(v) => {
                form.setValue('lat', v.lat, { shouldDirty: true });
                form.setValue('lng', v.lng, { shouldDirty: true });
              }}
            />
          </Suspense>
        </div>
        {write.isError && <Notice>{write.error.message}</Notice>}
        <div className="flex gap-2">
          <Button type="submit" disabled={write.isPending}>
            Save warehouse
          </Button>
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

function BinForm({ item, onDone }: { item?: Bin | undefined; onDone: () => void }) {
  const { refs } = useRefs();
  const write = useWrite(api.saveBin);
  const form = useForm<z.input<typeof BinInput>, unknown, BinInput>({
    resolver: zodResolver(BinInput),
    defaultValues: item ?? { capacitySacks: 500 },
  });
  const e = form.formState.errors;
  const submit = form.handleSubmit((v) => write.mutate([v, item?.id], { onSuccess: onDone }));
  return (
    <Card className="mb-4 max-w-xl">
      <form onSubmit={submit} noValidate className="space-y-3">
        <Field label="Warehouse" htmlFor="b-wh" error={e.warehouseId?.message}>
          <Select id="b-wh" {...form.register('warehouseId')}>
            <option value="">Select a warehouse</option>
            {refs.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Bin code" htmlFor="b-code" error={e.code?.message}>
          <Input id="b-code" {...form.register('code')} />
        </Field>
        <Field label="Capacity (sacks)" htmlFor="b-capacity" error={e.capacitySacks?.message}>
          <Input
            id="b-capacity"
            type="number"
            inputMode="numeric"
            {...form.register('capacitySacks', { valueAsNumber: true })}
          />
        </Field>
        {write.isError && <Notice>{write.error.message}</Notice>}
        <div className="flex gap-2">
          <Button type="submit" disabled={write.isPending}>
            Save bin
          </Button>
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
