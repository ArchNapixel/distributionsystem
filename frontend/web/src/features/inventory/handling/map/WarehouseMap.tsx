import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api, type BinSummary } from '@/api';
import { useRefs } from '@/api/hooks';
import { gabled, interior, PAL, status } from './isometric';
import {
  dotProgress,
  FALLBACK_STYLE,
  isStyleFetchError,
  MAP_STYLE,
  MAP_VIEW,
  softenBasemap,
} from './layout';
import { pointAlong, routeBetween, type LngLat } from './routes';
import { truckTrips } from './trucks';
import { WarehousePanel, type PanelTransfer } from './WarehousePanel';
import './setup';
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
  bins: BinSummary[];
  /** The open warehouse: drives the camera, the marker, the dimming of the others and the panel. */
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  /** Open the floor plan of the selected warehouse, optionally with one bin selected. */
  onOpenFloor: (warehouseId: string, binId?: string) => void;
  ref?: Ref<WarehouseMapHandle>;
};

export type WarehouseMapHandle = { fit: () => void };

const reducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const NO_PADDING = { top: 0, right: 0, bottom: 0, left: 0 };

/** Camera that shows every warehouse, with room above each point for its label card. */
function fitAll(map: maplibregl.Map, points: LngLat[], animate: boolean) {
  if (points.length === 0) return;
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  // A plain array: cameraForBounds mishandles LngLatBounds.extend in some versions.
  const bounds: [LngLat, LngLat] = [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
  const { clientWidth: w, clientHeight: h } = map.getContainer();
  const sx = Math.min(150, w / 4);
  const cam = map.cameraForBounds(bounds, {
    padding: { top: Math.min(200, h / 2.6), bottom: Math.min(90, h / 6), left: sx, right: sx },
    maxZoom: 13,
    bearing: 0,
  });
  if (!cam) return;
  const to = {
    center: cam.center,
    zoom: (cam.zoom ?? MAP_VIEW.zoom) - 0.35,
    pitch: MAP_VIEW.pitch,
    bearing: MAP_VIEW.bearing,
  };
  if (animate) map.flyTo({ ...to, duration: 1800, essential: true });
  else map.jumpTo(to);
}

const EMPTY_COLLECTION = { type: 'FeatureCollection' as const, features: [] };

const flowLines = (routes: LngLat[][]) => ({
  type: 'FeatureCollection' as const,
  features: routes.map((coordinates) => ({
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates },
  })),
});

/** Two dots per route, looping; parked at the midpoint when motion is reduced. */
const flowDots = (routes: LngLat[][], nowMs: number, still: boolean) => ({
  type: 'FeatureCollection' as const,
  features: routes.flatMap((route, i) =>
    [0, 1].map((k) => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Point' as const,
        coordinates: pointAlong(route, dotProgress(nowMs, i, k, still)).at,
      },
    })),
  ),
});

const setData = (
  map: maplibregl.Map,
  id: string,
  data: typeof EMPTY_COLLECTION | ReturnType<typeof flowLines> | ReturnType<typeof flowDots>,
) => (map.getSource(id) as maplibregl.GeoJSONSource | undefined)?.setData(data);

/** Route lines and the dots that travel along them. Re-added after every style load. */
function addFlow(map: maplibregl.Map) {
  if (map.getSource('wh-flow')) return;
  map.addSource('wh-flow', { type: 'geojson', data: EMPTY_COLLECTION });
  map.addSource('wh-dots', { type: 'geojson', data: EMPTY_COLLECTION });
  const line = { 'line-join': 'round', 'line-cap': 'round' } as const;
  map.addLayer({
    id: 'wh-flow-casing',
    type: 'line',
    source: 'wh-flow',
    layout: line,
    paint: {
      'line-color': '#ffffff',
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 6, 15, 18],
    },
  });
  map.addLayer({
    id: 'wh-flow',
    type: 'line',
    source: 'wh-flow',
    layout: line,
    paint: {
      'line-color': '#bbf7d0',
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 15, 8],
    },
  });
  map.addLayer({
    id: 'wh-dots-glow',
    type: 'circle',
    source: 'wh-dots',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 9, 15, 18],
      'circle-color': '#22c55e',
      'circle-opacity': 0.18,
      'circle-blur': 0.6,
    },
  });
  map.addLayer({
    id: 'wh-dots',
    type: 'circle',
    source: 'wh-dots',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3.5, 15, 7],
      'circle-color': '#16a34a',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });
}

/** Renders React children into a MapLibre marker element. */
function MapMarker({
  map,
  at,
  raised = false,
  children,
}: {
  map: maplibregl.Map;
  at: LngLat;
  raised?: boolean;
  children: ReactNode;
}) {
  const [el] = useState(() => document.createElement('div'));
  const marker = useRef<maplibregl.Marker | null>(null);
  const [lng, lat] = at;
  useEffect(() => {
    const m = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lng, lat])
      .addTo(map);
    marker.current = m;
    return () => {
      m.remove();
    };
  }, [map, el, lng, lat]);
  useEffect(() => {
    const style = marker.current?.getElement().style;
    if (style) style.zIndex = raised ? '5' : '';
  }, [raised, lng, lat]);
  return createPortal(children, el);
}

type MarkerState = 'idle' | 'selected' | 'dimmed';

/**
 * Warehouse marker: a gabled building with a stock gauge under a label card. Selected, it
 * opens into a 3D view of its bins under a dark name pill; the others fade back.
 */
function WarehouseMarker({
  w,
  state,
  bins,
  onSelect,
}: {
  w: WarehouseMapProps['warehouses'][number];
  state: MarkerState;
  bins: BinSummary[];
  onSelect: (id: string) => void;
}) {
  const pct = Math.round(w.pctFull);
  return (
    <button
      type="button"
      className="wmap-marker"
      data-state={state}
      data-low={w.low}
      aria-label={`${w.name}, ${w.sacks} sacks, ${pct}% full${w.low ? ', low stock' : ''}`}
      onClick={() => onSelect(w.id)}
    >
      {state === 'selected' ? (
        <>
          <span className="wmap-pill">{w.name}</span>
          <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: interior(bins) }} />
        </>
      ) : (
        <>
          <span className="wmap-card">
            <span className="wmap-label">{w.name}</span>
            <span className="wmap-sub">
              <span className="wmap-bar" role="presentation">
                <span
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    background: PAL[status(w.pctFull)].bar,
                  }}
                />
              </span>
              {pct}% full
            </span>
            {w.low && <span className="wmap-low">Low stock</span>}
          </span>
          <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: gabled(w.pctFull) }} />
        </>
      )}
    </button>
  );
}

export function WarehouseMap({
  warehouses,
  bins,
  selectedId,
  onSelect,
  onBack,
  onOpenFloor,
  ref,
}: WarehouseMapProps) {
  const { refs } = useRefs();
  const movements = useQuery({ queryKey: ['movements'], queryFn: api.listMovements });
  const box = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  // Bumped on every style load: a new style drops our sources, so they are added again.
  const [styleLoads, setStyleLoads] = useState(0);
  const [now] = useState(Date.now);
  const [still] = useState(reducedMotion);
  // The panel keeps the last selected warehouse while it slides out.
  const [lastId, setLastId] = useState(selectedId);
  if (selectedId && selectedId !== lastId) setLastId(selectedId);

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
  const binsOf = useMemo(() => {
    const byWarehouse = new Map<string, BinSummary[]>();
    for (const b of bins)
      byWarehouse.set(b.warehouseId, [...(byWarehouse.get(b.warehouseId) ?? []), b]);
    return byWarehouse;
  }, [bins]);

  // The map is an external system: create it once on mount, hand it to React through state.
  useEffect(() => {
    const container = box.current!;
    const m = new maplibregl.Map({
      container,
      style: MAP_STYLE,
      ...MAP_VIEW,
      maxPitch: 70,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    // The softening runs on every style load, so it also applies after a fallback setStyle.
    let fitted = false;
    m.on('style.load', () => {
      softenBasemap(m);
      addFlow(m);
      m.resize();
      if (!fitted) {
        // The first fit ran before the canvas had its real size; redo it now that it does.
        fitted = true;
        fitAll(m, firstPoints.current, false);
      }
      setStyleLoads((n) => n + 1);
    });
    let fellBack = false;
    m.on('error', (e) => {
      if (fellBack || !isStyleFetchError(e)) return;
      fellBack = true;
      m.setStyle(FALLBACK_STYLE);
    });
    const resize = new ResizeObserver(() => m.resize());
    resize.observe(container);
    fitAll(m, firstPoints.current, false);
    setMap(m);
    return () => {
      resize.disconnect();
      m.remove();
    };
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

  // One route per direction, however many transfers used it.
  const routes = useMemo(
    () => [
      ...new Map(trips.map((t) => [`${t.fromWarehouseId}>${t.toWarehouseId}`, t.route])).values(),
    ],
    [trips],
  );

  useEffect(() => {
    if (map) setData(map, 'wh-flow', flowLines(routes));
  }, [map, styleLoads, routes]);

  useEffect(() => {
    if (!map) return;
    if (still) {
      setData(map, 'wh-dots', flowDots(routes, 0, true));
      return;
    }
    let raf = 0;
    const tick = (t: number) => {
      setData(map, 'wh-dots', flowDots(routes, t, false));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [map, styleLoads, routes, still]);

  // Camera: fly in on select, back out to all warehouses on deselect (not on first mount).
  const selectedAt = placed.find((w) => w.id === selectedId)?.at;
  const [selLng, selLat] = selectedAt ?? [];
  const wasSelected = useRef(false);
  useEffect(() => {
    if (!map) return;
    if (selLng !== undefined && selLat !== undefined) {
      wasSelected.current = true;
      const right = map.getContainer().clientWidth >= 720 ? 360 : 0; // keep the building clear of the panel
      map.flyTo({
        center: [selLng, selLat],
        zoom: 15.6,
        pitch: 58,
        bearing: -24,
        duration: 2200,
        curve: 1.5,
        padding: { right, top: 80, left: 0, bottom: 0 },
        essential: true,
      });
    } else if (wasSelected.current) {
      wasSelected.current = false;
      map.stop();
      map.setPadding(NO_PADDING);
      fitAll(map, points, true);
    }
  }, [map, selLng, selLat, points]);

  useImperativeHandle(
    ref,
    () => ({
      fit: () => {
        if (selectedId)
          onBack(); // deselecting flies back out to all warehouses
        else if (map) fitAll(map, points, true);
      },
    }),
    [map, points, selectedId, onBack],
  );

  const panelWarehouse = warehouses.find((w) => w.id === lastId);
  const nameOf = (id: string) => warehouses.find((w) => w.id === id)?.name ?? 'another warehouse';
  const transfers = trips.flatMap((t): PanelTransfer[] =>
    t.fromWarehouseId === lastId
      ? [{ id: t.id, direction: 'out', otherName: nameOf(t.toWarehouseId), sacks: t.sacks }]
      : t.toWarehouseId === lastId
        ? [{ id: t.id, direction: 'in', otherName: nameOf(t.fromWarehouseId), sacks: t.sacks }]
        : [],
  );

  return (
    <div className="wmap">
      <div
        ref={box}
        className="h-full w-full"
        role="region"
        aria-label="Map of Davao City warehouses"
      />
      {unplaced > 0 && (
        <p className="wmap-notice" role="status">
          {unplaced === 1 ? '1 warehouse has' : `${unplaced} warehouses have`} no location yet; set
          it in Warehouses &amp; bins.
        </p>
      )}
      <div className="wmap-legend">
        <span>
          <i className="wmap-swatch" style={{ background: PAL.empty.bar }} />
          Empty
        </span>
        <span>
          <i className="wmap-swatch" style={{ background: PAL.ok.bar }} />
          In use
        </span>
        <span>
          <i className="wmap-swatch" style={{ background: PAL.full.bar }} />
          Near full
        </span>
        <span>
          <i className="wmap-dotted" />
          Recent transfer
        </span>
      </div>
      {map &&
        placed.map((w) => (
          <MapMarker key={w.id} map={map} at={w.at} raised={w.id === selectedId}>
            <WarehouseMarker
              w={w}
              state={w.id === selectedId ? 'selected' : selectedId ? 'dimmed' : 'idle'}
              bins={binsOf.get(w.id) ?? []}
              onSelect={onSelect}
            />
          </MapMarker>
        ))}
      <WarehousePanel
        warehouse={
          panelWarehouse
            ? {
                ...panelWarehouse,
                address: refs.warehouses.find((w) => w.id === panelWarehouse.id)?.address,
              }
            : null
        }
        open={selectedId !== null}
        bins={binsOf.get(lastId ?? '') ?? []}
        transfers={transfers}
        onClose={onBack}
        onOpenFloor={(binId) => lastId && onOpenFloor(lastId, binId)}
      />
    </div>
  );
}
