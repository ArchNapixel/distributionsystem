import type { BinSummary } from '@/api';
import { Button } from '@/components/ui';
import { sacks as sacksLabel } from '@/lib/format';
import { PAL, status } from './isometric';

export type PanelWarehouse = {
  id: string;
  name: string;
  address: string | undefined;
  sacks: number;
  pctFull: number;
  low: boolean;
};

/** A recent transfer touching the warehouse, seen from its side. */
export type PanelTransfer = {
  id: string;
  direction: 'out' | 'in';
  otherName: string;
  sacks: number;
};

const num = (n: number) => n.toLocaleString('en-US');

/**
 * Detail panel for the selected warehouse. `warehouse` is the last selected one, so the content
 * stays mounted while the panel slides out; `open` drives the slide and hides it from keyboard
 * and screen readers once it is off screen.
 */
export function WarehousePanel({
  warehouse,
  open,
  bins,
  transfers,
  onClose,
  onOpenFloor,
}: {
  warehouse: PanelWarehouse | null;
  open: boolean;
  bins: BinSummary[];
  transfers: PanelTransfer[];
  onClose: () => void;
  onOpenFloor: (binId?: string) => void;
}) {
  const pct = warehouse ? Math.round(warehouse.pctFull) : 0;
  const capacity = bins.reduce((n, b) => n + b.capacitySacks, 0);
  return (
    <aside
      className="wmap-panel"
      data-open={open}
      inert={!open}
      aria-label={warehouse ? `${warehouse.name} details` : 'Warehouse details'}
    >
      {warehouse && (
        <>
          <header className="wmap-panel-head">
            <div className="min-w-0">
              <h2 className="wmap-panel-title">{warehouse.name}</h2>
              {warehouse.address && <p className="wmap-panel-address">{warehouse.address}</p>}
              {warehouse.low && <p className="wmap-low">Low stock</p>}
            </div>
            <button
              type="button"
              className="wmap-close"
              aria-label="Close details"
              onClick={onClose}
            >
              ×
            </button>
          </header>
          <Button variant="outline" onClick={() => onOpenFloor()}>
            Open floor plan
          </Button>

          <section aria-label="Fill">
            <p className="wmap-fill-pct">
              {pct}%<span> full</span>
            </p>
            <div className="wmap-bar wmap-bar-lg" role="presentation">
              <div
                style={{
                  width: `${Math.min(100, pct)}%`,
                  background: PAL[status(warehouse.pctFull)].bar,
                }}
              />
            </div>
            <p className="wmap-fill-note">
              {num(warehouse.sacks)} of {num(capacity)} sacks
            </p>
          </section>

          <section aria-label="Bins">
            <h3 className="wmap-section">BINS</h3>
            <div className="wmap-bins">
              {bins.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="wmap-bin"
                  aria-label={`Open bin ${b.code}, ${sacksLabel(b.sacks)}`}
                  onClick={() => onOpenFloor(b.id)}
                >
                  <span
                    className="wmap-bin-fill"
                    style={{
                      height: `${Math.min(100, b.pctFull)}%`,
                      background: PAL[status(b.pctFull)].tint,
                    }}
                    aria-hidden="true"
                  />
                  <span className="wmap-bin-code">{b.code}</span>
                  <span className="wmap-bin-note">
                    {Math.round(b.pctFull)}% · {num(b.sacks)}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section aria-label="Recent transfers">
            <h3 className="wmap-section">RECENT TRANSFERS</h3>
            {transfers.length === 0 ? (
              <p className="wmap-fill-note">None in the last 24 hours.</p>
            ) : (
              <ul className="wmap-transfers">
                {transfers.map((t) => (
                  <li key={t.id}>
                    <span className="wmap-dot" aria-hidden="true" />
                    <span>
                      {t.direction === 'out' ? 'Out to' : 'In from'} {t.otherName}
                    </span>
                    <span className="wmap-transfer-sacks">{sacksLabel(t.sacks)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </aside>
  );
}
