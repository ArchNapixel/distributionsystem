import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// MapLibre finds its worker next to its own script. A bundler moves that script, so the worker
// 404s and no tiles ever draw. Let Vite bundle the worker and tell MapLibre where it is.
maplibregl.setWorkerUrl(workerUrl);
