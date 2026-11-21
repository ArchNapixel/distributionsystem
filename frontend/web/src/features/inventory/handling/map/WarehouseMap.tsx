import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { useRefs } from '@/api/hooks';
import { LAND, pinPosition, ROAD_PATHS, truckRoute, VIEW_BOX } from './layout';
import { truckTrips } from './trucks';
import './map.css';

export type WarehouseMapProps = {
  warehouses: { id: string; name: string; sacks: number; pctFull: number; low: boolean }[];
  onSelect: (id: string) => void;
};

const hoursAgo = (at: string, now: number) =>
  Math.max(0, Math.round((now - Date.parse(at)) / 3_600_000));

export function WarehouseMap({ warehouses, onSelect }: WarehouseMapProps) {
  const { refs } = useRefs();
  const movements = useQuery({ queryKey: ['movements'], queryFn: api.listMovements });
  // Trips that finished driving; a trip plays once, new transfers appear as new trips.
  const [now] = useState(Date.now);
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());

  const positions = useMemo(
    () => new Map(warehouses.map((w, i) => [w.id, pinPosition(w.id, i)])),
    [warehouses],
  );
  const trips = useMemo(
    () =>
      truckTrips(movements.data ?? [], new Map(refs.bins.map((b) => [b.id, b.warehouseId])), now),
    [movements.data, refs.bins, now],
  );

  return (
    <svg
      viewBox={`0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`}
      className="h-auto w-full max-w-full rounded-lg border"
      role="group"
      aria-label="Map of Davao City warehouses"
    >
      <rect width={VIEW_BOX.width} height={VIEW_BOX.height} className="wmap-sea" />
      <path d={LAND} className="wmap-land" />
      {ROAD_PATHS.map((d) => (
        <path key={d} d={d} className="wmap-road" />
      ))}

      {trips.map((t) => {
        const from = positions.get(t.fromWarehouseId);
        const to = positions.get(t.toWarehouseId);
        if (!from || !to || done.has(t.id)) return null;
        const { path, reversed } = truckRoute(from, to, t.fromWarehouseId, t.toWarehouseId);
        return (
          <g key={t.id} data-testid="truck">
            <g
              className={`wmap-truck${reversed ? ' wmap-truck--rev' : ''}`}
              style={{ offsetPath: `path('${path}')` }}
              onAnimationEnd={() => setDone((d) => new Set(d).add(t.id))}
            >
              <text fontSize="14" textAnchor="middle" aria-hidden="true">
                🚚
              </text>
            </g>
            <text className="wmap-truck-label" x={(from.x + to.x) / 2} y={(from.y + to.y) / 2}>
              {`Transferred ${hoursAgo(t.at, now)}h ago`}
            </text>
          </g>
        );
      })}

      {warehouses.map((w) => {
        const { x, y } = positions.get(w.id)!;
        const pct = Math.round(w.pctFull);
        const label = `${w.name}, ${w.sacks} sacks, ${pct}% full${w.low ? ', low stock' : ''}`;
        return (
          <g
            key={w.id}
            className="wmap-pin"
            data-low={w.low}
            role="button"
            tabIndex={0}
            aria-label={label}
            onClick={() => onSelect(w.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(w.id);
              }
            }}
          >
            <circle cx={x} cy={y} r="8" className="wmap-pulse" />
            <circle cx={x} cy={y} r="6" className="wmap-dot" />
            <circle cx={x} cy={y} r="28" className="wmap-hit" />
            <text x={x} y={y + 22} textAnchor="middle" className="wmap-label">
              {w.name}
            </text>
            <text x={x} y={y + 33} textAnchor="middle" className="wmap-sub">
              {`${w.sacks} sacks · ${pct}% full`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
