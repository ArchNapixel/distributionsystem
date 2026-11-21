import { OTHER_ROW, type BinSummary } from '@/api';
import { sacks } from '@/lib/format';

export type BinStatus = 'ok' | 'low' | 'full';
export const binStatus = (b: BinSummary): BinStatus =>
  b.low ? 'low' : b.pctFull >= 90 ? 'full' : 'ok';
export const STATUS_LABEL: Record<BinStatus, string> = {
  ok: 'OK',
  low: 'Low stock',
  full: 'Near full',
};

/** Top-down floor plan: one row per code letter(s), one column per number, "Other" last. */
export function WarehouseFloor({
  bins,
  selectedId,
  onSelect,
}: {
  bins: BinSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (bins.length === 0) {
    return <p className="text-sm text-neutral-600">This warehouse has no bins yet.</p>;
  }
  const rows = [...new Set(bins.map((b) => b.row))].sort((a, b) =>
    a === OTHER_ROW ? 1 : b === OTHER_ROW ? -1 : a.localeCompare(b),
  );
  const columns = Math.max(...bins.map((b) => b.col), 1);
  return (
    <div className="handling-zoom overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(4.5rem, 1fr))` }}
      >
        {bins.map((b) => {
          const status = binStatus(b);
          return (
            <button
              key={b.id}
              type="button"
              className="bin-block relative flex h-24 min-w-0 flex-col justify-between overflow-hidden rounded-md border-2 p-2 text-left"
              style={{ gridRow: rows.indexOf(b.row) + 1, gridColumn: b.col }}
              data-status={status}
              aria-pressed={selectedId === b.id}
              aria-label={`Bin ${b.code}, ${sacks(b.sacks)} of ${b.capacitySacks}, ${STATUS_LABEL[status]}`}
              onClick={() => onSelect(b.id)}
            >
              <span
                className="bin-fill absolute inset-x-0 bottom-0"
                style={{ height: `${Math.min(100, b.pctFull)}%` }}
                aria-hidden="true"
              />
              <span className="relative text-sm font-semibold">{b.code}</span>
              <span className="relative text-xs">
                {Math.round(b.pctFull)}% · {STATUS_LABEL[status]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
