import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api, type Refs } from '.';

const EMPTY: Refs = { products: [], warehouses: [], bins: [], suppliers: [], lots: [] };

/** Reference data plus id lookups (name helpers) for table cells. */
export function useRefs() {
  const q = useQuery({ queryKey: ['refs'], queryFn: api.getRefs });
  const refs = q.data ?? EMPTY;
  const lookup = useMemo(() => {
    const product = new Map(refs.products.map((p) => [p.id, p]));
    const bin = new Map(refs.bins.map((b) => [b.id, b]));
    const warehouse = new Map(refs.warehouses.map((w) => [w.id, w]));
    const supplier = new Map(refs.suppliers.map((s) => [s.id, s]));
    const lot = new Map(refs.lots.map((l) => [l.id, l]));
    return {
      product,
      bin,
      warehouse,
      supplier,
      lot,
      productName: (id: string) => product.get(id)?.name ?? id,
      lotCode: (id: string) => lot.get(id)?.code ?? id,
      supplierName: (id: string) => supplier.get(id)?.name ?? id,
      warehouseName: (id: string) => warehouse.get(id)?.name ?? id,
      /** Bin id, or a virtual location name, as "Warehouse / Bin". */
      location: (id: string) => {
        if (id === 'supplier') return 'Supplier';
        if (id === 'loss') return 'Loss';
        const b = bin.get(id);
        return b ? `${warehouse.get(b.warehouseId)?.name ?? ''} / ${b.code}` : id;
      },
    };
  }, [refs]);
  return { refs, lookup, ready: q.isSuccess };
}

/** Runs a write and refreshes every query (the mock has no partial invalidation needs). */
export function useWrite<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: A) => fn(...args),
    onSuccess: () => qc.invalidateQueries(),
  });
}

/** Per-warehouse and per-bin stock levels for the handling screen. */
export function useWarehouseOverview() {
  return useQuery({ queryKey: ['warehouse-overview'], queryFn: api.getWarehouseOverview });
}
