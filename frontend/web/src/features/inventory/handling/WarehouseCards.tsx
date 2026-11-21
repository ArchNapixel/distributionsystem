import type { WarehouseSummary } from '@/api';
import { Badge, Card } from '@/components/ui';
import { sacks } from '@/lib/format';

/** Temporary overview (plan 005); plan 006 replaces it with the animated map. */
export function WarehouseCards({
  warehouses,
  onSelect,
}: {
  warehouses: WarehouseSummary[];
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {warehouses.map((w) => (
        <li key={w.id}>
          <Card className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-medium">{w.name}</h2>
              {w.low && <Badge tone="red">Low stock</Badge>}
            </div>
            <p className="text-sm text-neutral-600">
              {sacks(w.sacks)} · {Math.round(w.pctFull)}% full
            </p>
            <button
              type="button"
              aria-label={`Open floor plan for ${w.name}`}
              onClick={() => onSelect(w.id)}
              className="min-h-9 rounded-md border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-100"
            >
              Open floor plan
            </button>
          </Card>
        </li>
      ))}
    </ul>
  );
}
