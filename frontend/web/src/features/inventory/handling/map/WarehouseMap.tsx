import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '@/api';
import { useRefs } from '@/api/hooks';
import { DAVAO_CENTER, DAVAO_ZOOM, MAP_STYLE, roofColours } from './layout';
import { pointAlong, routeBetween, SAVED_ROUTES, type LngLat } from './routes';
import { truckTrips } from './trucks';
import './map.css';

export type WarehouseMapProps = {
  warehouses: {
    id: string;
    name: string;
    sacks: number;
    pctFull: number;
    low: boolean;
    lat?: number | undefined;
    lng?: number | undefined;
  }[];
  onSelect: (id: string) => void;
};

const DRIVE_MS = 6000;

const hoursAgo = (at: string, now: number) =>
  Math.max(0, Math.round((now - Date.parse(at)) / 3_600_000));

const reducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fitAll(map: maplibregl.Map, points: LngLat[], animate: boolean) {
  if (points.length === 0) return;
  const bounds = new maplibregl.LngLatBounds();
  for (const p of points) bounds.extend(p);
  // Padding scales with the map; extra at the top because label cards sit above each point.
  const { clientWidth: w, clientHeight: h } = map.getContainer();
  const side = Math.min(110, w / 3); // label cards stick out ~95px either side of the point
  const padding = {
    top: Math.min(160, h / 3),
    bottom: Math.min(50, h / 8),
    left: side,
    right: side,
  };
  map.fitBounds(bounds, { padding, maxZoom: 13, duration: animate ? 800 : 0 });
}

/** Draws the saved warehouse-to-warehouse roads as asphalt with a dashed centre line. */
function addRoads(map: maplibregl.Map) {
  map.addSource('wh-roads', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: SAVED_ROUTES.map((coordinates) => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates },
      })),
    },
  });
  const line = { 'line-join': 'round', 'line-cap': 'round' } as const;
  map.addLayer({
    id: 'wh-roads-casing',
    type: 'line',
    source: 'wh-roads',
    layout: line,
    paint: {
      'line-color': '#d4d4d8',
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 5, 15, 16],
    },
  });
  map.addLayer({
    id: 'wh-roads',
    type: 'line',
    source: 'wh-roads',
    layout: line,
    paint: {
      'line-color': '#3f3f46',
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 3.5, 15, 12],
    },
  });
  map.addLayer({
    id: 'wh-roads-centre',
    type: 'line',
    source: 'wh-roads',
    paint: { 'line-color': '#fafafa', 'line-width': 1, 'line-dasharray': [3, 3] },
  });
}

/** Renders React children into a MapLibre marker element. */
function MapMarker({
  map,
  at,
  children,
}: {
  map: maplibregl.Map;
  at: LngLat;
  children: ReactNode;
}) {
  const [el] = useState(() => document.createElement('div'));
  const [lng, lat] = at;
  useEffect(() => {
    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lng, lat])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, el, lng, lat]);
  return createPortal(children, el);
}

/** 2.5D warehouse: gable front, right side wall, two roof slopes, roll-up door, loading apron. */
function Building({ id }: { id: string }) {
  const { roof, shade } = roofColours(id);
  return (
    <svg
      viewBox="-100 -95 200 120"
      width="96"
      height="58"
      aria-hidden="true"
      className="wmap-building"
    >
      <ellipse cx="15" cy="6" rx="95" ry="16" className="wmap-shadow" />
      <polygon points="-72,2 74,2 96,18 -50,18" className="wmap-apron" />
      <polygon points="55,0 85,-18 85,-68 55,-50" className="wmap-wall-side" />
      <polygon points="-55,0 -55,-50 0,-70 55,-50 55,0" className="wmap-wall" />
      <polygon points="0,-72 30,-90 88,-68 58,-50" fill={shade} />
      <polygon points="-58,-50 0,-72 30,-90 -28,-68" fill={roof} />
      <rect x="-22" y="-34" width="44" height="34" className="wmap-door" />
      <path d="M-22 -26 H22 M-22 -18 H22 M-22 -10 H22" className="wmap-door-lines" />
      <rect x="-48" y="-30" width="16" height="10" className="wmap-window" />
      <rect x="32" y="-30" width="16" height="10" className="wmap-window" />
    </svg>
  );
}

/** Warehouse marker: floating label card with a status pin, above the building. */
function WarehouseMarker({
  w,
  onSelect,
}: {
  w: WarehouseMapProps['warehouses'][number];
  onSelect: (id: string) => void;
}) {
  const pct = Math.round(w.pctFull);
  return (
    <button
      type="button"
      className="wmap-marker"
      data-low={w.low}
      aria-label={`${w.name}, ${w.sacks} sacks, ${pct}% full${w.low ? ', low stock' : ''}`}
      onClick={() => onSelect(w.id)}
    >
      <span className="wmap-card">
        <span className="wmap-pin" aria-hidden="true">
          <span className="wmap-pulse" />
          <svg viewBox="0 0 24 32" width="22" height="30">
            <path
              d="M12 31C6 23 1 18 1 11.5a11 11 0 0 1 22 0C23 18 18 23 12 31Z"
              className="wmap-pin-head"
            />
            <circle cx="12" cy="11.5" r="4" fill="#fff" />
          </svg>
        </span>
        <span className="wmap-card-text">
          <span className="wmap-label">{w.name}</span>
          <span className="wmap-sub">
            {w.sacks} sacks • {pct}% full
          </span>
          {w.low && <span className="wmap-low">Low stock</span>}
        </span>
      </span>
      <Building id={w.id} />
    </button>
  );
}

/** Side-view box truck facing east; mirrored when heading west so it never drives upside down. */
function TruckMarker({
  map,
  id,
  route,
  label,
  onDone,
}: {
  map: maplibregl.Map;
  id: string;
  route: LngLat[];
  label: string;
  onDone: (id: string) => void;
}) {
  const [el] = useState(() => document.createElement('div'));
  const [still] = useState(reducedMotion);
  useEffect(() => {
    const marker = new maplibregl.Marker({ element: el, rotationAlignment: 'map' })
      .setLngLat(route[0]!)
      .addTo(map);
    const place = (t: number) => {
      const { at, heading } = pointAlong(route, t);
      const west = Math.abs(heading) > 90;
      marker.getElement().dataset.west = String(west);
      marker.setLngLat(at).setRotation(west ? heading + 180 : heading);
    };
    if (still) {
      place(1);
      return () => {
        marker.remove();
      };
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DRIVE_MS);
      place(0.5 - 0.5 * Math.cos(Math.PI * p)); // ease in-out
      if (p < 1) raf = requestAnimationFrame(tick);
      else onDone(id);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      marker.remove();
    };
  }, [map, el, route, still, id, onDone]);

  return createPortal(
    <span className="wmap-truck" data-testid="truck">
      <svg viewBox="-22 -22 44 28" width="44" height="28" aria-hidden="true">
        <ellipse cx="0" cy="2" rx="20" ry="4" className="wmap-shadow" />
        <rect x="-18" y="-18" width="26" height="16" rx="2" className="wmap-truck-box" />
        <path d="M8 -14 H15 L20 -8 V-2 H8 Z" className="wmap-truck-cab" />
        <path d="M10 -12 H14 L17 -8 H10 Z" className="wmap-window" />
        <circle cx="-11" cy="-1" r="3.5" className="wmap-wheel" />
        <circle cx="13" cy="-1" r="3.5" className="wmap-wheel" />
      </svg>
      {still && <span className="wmap-truck-label">{label}</span>}
    </span>,
    el,
  );
}

export function WarehouseMap({ warehouses, onSelect }: WarehouseMapProps) {
  const { refs } = useRefs();
  const movements = useQuery({ queryKey: ['movements'], queryFn: api.listMovements });
  const box = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  // Trips that finished driving; a trip plays once, new transfers appear as new trips.
  const [now] = useState(Date.now);
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  const finish = useCallback((id: string) => setDone((d) => new Set(d).add(id)), []);

  const placed = useMemo(
    () =>
      warehouses.flatMap((w) =>
        w.lat !== undefined && w.lng !== undefined ? [{ ...w, at: [w.lng, w.lat] as LngLat }] : [],
      ),
    [warehouses],
  );
  const unplaced = warehouses.length - placed.length;
  const points = useMemo(() => placed.map((w) => w.at), [placed]);
  const firstPoints = useRef(points);

  // The map is an external system: create it once on mount, hand it to React through state.
  useEffect(() => {
    const m = new maplibregl.Map({
      container: box.current!,
      style: MAP_STYLE,
      center: DAVAO_CENTER,
      zoom: DAVAO_ZOOM,
      maxPitch: 70,
    });
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    m.on('load', () => addRoads(m));
    fitAll(m, firstPoints.current, false);
    setMap(m); // the map is an external system, handed to React through state
    return () => m.remove();
  }, []);

  const trips = useMemo(() => {
    const at = new Map(placed.map((w) => [w.id, w.at]));
    return truckTrips(
      movements.data ?? [],
      new Map(refs.bins.map((b) => [b.id, b.warehouseId])),
      now,
    ).flatMap((t) => {
      const from = at.get(t.fromWarehouseId);
      const to = at.get(t.toWarehouseId);
      if (!from || !to) return [];
      return [{ ...t, route: routeBetween(t.fromWarehouseId, t.toWarehouseId, from, to) }];
    });
  }, [movements.data, refs.bins, now, placed]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-white">
      <div
        ref={box}
        className="h-full w-full"
        role="region"
        aria-label="Map of Davao City warehouses"
      />
      <button
        type="button"
        className="wmap-fit"
        onClick={() => map && fitAll(map, points, true)}
        disabled={points.length === 0}
      >
        Fit all warehouses
      </button>
      {unplaced > 0 && (
        <p className="wmap-notice" role="status">
          {unplaced === 1 ? '1 warehouse has' : `${unplaced} warehouses have`} no location yet; set
          it in Warehouses &amp; bins.
        </p>
      )}
      {map &&
        placed.map((w) => (
          <MapMarker key={w.id} map={map} at={w.at}>
            <WarehouseMarker w={w} onSelect={onSelect} />
          </MapMarker>
        ))}
      {map &&
        trips
          .filter((t) => !done.has(t.id))
          .map((t) => (
            <TruckMarker
              key={t.id}
              map={map}
              id={t.id}
              route={t.route}
              label={`Transferred ${hoursAgo(t.at, now)}h ago`}
              onDone={finish}
            />
          ))}
    </div>
  );
}
