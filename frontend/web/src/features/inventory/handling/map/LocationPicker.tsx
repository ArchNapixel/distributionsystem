import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DAVAO_CENTER, DAVAO_ZOOM, MAP_STYLE } from './layout';
import './setup';

export type Location = { lat: number; lng: number };

const round = (n: number) => Math.round(n * 1e5) / 1e5;

/** Small map for setting a warehouse location: click to place, the marker shows the current spot. */
export function LocationPicker({
  value,
  onChange,
}: {
  value: Location | undefined;
  onChange: (v: Location) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const first = useRef(value);
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  });

  useEffect(() => {
    const start = first.current;
    const m = new maplibregl.Map({
      container: box.current!,
      style: MAP_STYLE,
      center: start ? [start.lng, start.lat] : DAVAO_CENTER,
      zoom: start ? 14 : DAVAO_ZOOM,
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.on('click', (e: maplibregl.MapMouseEvent) =>
      change.current({ lat: round(e.lngLat.lat), lng: round(e.lngLat.lng) }),
    );
    setMap(m); // the map is an external system, handed to React through state
    return () => m.remove();
  }, []);

  const lat = value?.lat;
  const lng = value?.lng;
  useEffect(() => {
    if (!map || lat === undefined || lng === undefined) return;
    const marker = new maplibregl.Marker({ color: '#16a34a' }).setLngLat([lng, lat]).addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, lat, lng]);

  return (
    <div className="space-y-1">
      <div
        ref={box}
        className="h-56 w-full overflow-hidden rounded-md border border-neutral-300"
        role="region"
        aria-label="Warehouse location map: click to place the warehouse"
      />
      <p className="text-xs text-neutral-600">
        {value
          ? `Location: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
          : 'No location yet. Click the map to place this warehouse.'}
      </p>
    </div>
  );
}
