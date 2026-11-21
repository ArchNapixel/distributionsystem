import { Link } from '@tanstack/react-router';
import type { BinSummary } from '@/api';
import { useRefs } from '@/api/hooks';
import { Button, Card } from '@/components/ui';
import { kg, sacks } from '@/lib/format';
import { STATUS_LABEL, binStatus } from './WarehouseFloor';

const linkClass =
  'inline-flex min-h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-100';

/** Side panel on wide screens, bottom sheet below 768px. */
export function BinPanel({
  bin,
  canAct,
  onClose,
}: {
  bin: BinSummary;
  canAct: boolean;
  onClose: () => void;
}) {
  const { lookup } = useRefs();
  return (
    <Card
      role="region"
      aria-label={`Bin ${bin.code} details`}
      className="fixed inset-x-0 bottom-0 z-20 max-h-[70vh] space-y-3 overflow-y-auto rounded-b-none shadow-lg md:static md:max-h-none md:rounded-lg md:shadow-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-medium">Bin {bin.code}</h2>
          <p className="text-sm text-neutral-600">
            {sacks(bin.sacks)} of {bin.capacitySacks} · {kg(bin.kg)} ·{' '}
            {STATUS_LABEL[binStatus(bin)]}
          </p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      {bin.lots.length === 0 ? (
        <p className="text-sm text-neutral-600">This bin is empty.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 text-sm">
          {bin.lots.map((l) => (
            <li key={l.lotId} className="flex justify-between gap-2 py-2">
              <span>
                {lookup.productName(l.productId)}
                <span className="block text-xs text-neutral-500">{lookup.lotCode(l.lotId)}</span>
              </span>
              <span className="whitespace-nowrap">{sacks(l.sacks)}</span>
            </li>
          ))}
        </ul>
      )}
      {canAct && (
        <div className="flex flex-wrap gap-2">
          <Link to="/inventory/receiving" search={{ binId: bin.id }} className={linkClass}>
            Receive into bin
          </Link>
          <Link to="/inventory/transfers" search={{ fromBinId: bin.id }} className={linkClass}>
            Transfer from bin
          </Link>
        </div>
      )}
    </Card>
  );
}
