/**
 * Isometric warehouse SVG generators, lifted from the design prototype.
 * Pure functions returning SVG strings; in React, convert to components or render via
 * dangerouslySetInnerHTML inside the MapLibre marker element (WarehouseMap.tsx MapMarker).
 */
export type Status = 'empty' | 'ok' | 'full';
export const status = (pct: number): Status => (pct <= 0 ? 'empty' : pct >= 90 ? 'full' : 'ok');

/** t = top face, l = left (front, faces +y) face, r = right (faces +x) face, bar = 2D bars, tint = bin card fill */
export const PAL: Record<Status, { t: string; l: string; r: string; bar: string; tint: string }> = {
  empty: { t: '#f4f4f5', l: '#e4e4e7', r: '#d4d4d8', bar: '#d4d4d8', tint: 'transparent' },
  ok: { t: '#86efac', l: '#4ade80', r: '#22c55e', bar: '#22c55e', tint: '#bbf7d0' },
  full: { t: '#fde68a', l: '#fbbf24', r: '#f59e0b', bar: '#f59e0b', tint: '#fde68a' },
};

type V3 = [number, number, number];
const C = 0.866,
  S = 0.5;
/** World (x right-down, y left-down, z up) to screen. */
const P = (x: number, y: number, z: number): [number, number] => [(x - y) * C, (x + y) * S - z];
const poly = (pts: V3[], fill: string, ex = '') =>
  `<polygon points="${pts
    .map((p) =>
      P(...p)
        .map((n) => n.toFixed(1))
        .join(','),
    )
    .join(' ')}" fill="${fill}" stroke-linejoin="round" ${ex}/>`;

function box(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  z1: number,
  c: { t: string; l: string; r: string },
  ex = '',
) {
  return (
    poly(
      [
        [x1, y0, z0],
        [x1, y1, z0],
        [x1, y1, z1],
        [x1, y0, z1],
      ],
      c.r,
      ex,
    ) +
    poly(
      [
        [x0, y1, z0],
        [x1, y1, z0],
        [x1, y1, z1],
        [x0, y1, z1],
      ],
      c.l,
      ex,
    ) +
    poly(
      [
        [x0, y0, z1],
        [x1, y0, z1],
        [x1, y1, z1],
        [x0, y1, z1],
      ],
      c.t,
      ex,
    )
  );
}
const shadow = (cx: number, cy: number, rx: number, ry: number) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#18181b" opacity=".09" filter="url(#wmap-blur)"/>`;
const DEFS = `<defs><filter id="wmap-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter></defs>`;

/** Gabled warehouse; the right wall carries a stock gauge that rises with % full. 118×100. */
export function gabled(pct: number) {
  const W = 64,
    D = 40,
    H = 24,
    R = 38,
    c = PAL[status(pct)],
    g = Math.max(0, Math.min(1, pct / 100)),
    gz = 1 + (H - 4) * g;
  return (
    `<svg viewBox="-52 -36 118 100" width="118" height="100" style="display:block;overflow:visible">${DEFS}${shadow(10, 34, 62, 20)}` +
    poly(
      [
        [-4, D, 0],
        [W + 4, D, 0],
        [W + 4, D + 16, 0],
        [-4, D + 16, 0],
      ],
      '#ececee',
    ) + // loading apron
    poly(
      [
        [W, 0, 0],
        [W, D, 0],
        [W, D, H],
        [W, 0, H],
      ],
      '#e4e4e7',
    ) + // right wall
    poly(
      [
        [W, 4, 2],
        [W, D - 4, 2],
        [W, D - 4, H - 3],
        [W, 4, H - 3],
      ],
      '#d4d4d8',
    ) + // gauge track
    (g > 0
      ? poly(
          [
            [W, 4, 2],
            [W, D - 4, 2],
            [W, D - 4, gz],
            [W, 4, gz],
          ],
          c.r,
        )
      : '') + // gauge fill
    poly(
      [
        [0, D, 0],
        [W, D, 0],
        [W, D, H],
        [0, D, H],
      ],
      '#fafafa',
      'stroke="#e4e4e7" stroke-width=".6"',
    ) + // front wall
    poly(
      [
        [W * 0.32, D, 0],
        [W * 0.68, D, 0],
        [W * 0.68, D, H * 0.62],
        [W * 0.32, D, H * 0.62],
      ],
      '#d4d4d8',
    ) + // roll-up door
    [4, 8, 12]
      .map((z) =>
        poly(
          [
            [W * 0.32, D, z],
            [W * 0.68, D, z],
          ],
          'none',
          'stroke="#a1a1aa" stroke-width=".6"',
        ),
      )
      .join('') +
    poly(
      [
        [W, 0, H],
        [W, D, H],
        [W, D / 2, R],
      ],
      '#ececee',
    ) + // gable
    poly(
      [
        [0, 0, H],
        [W, 0, H],
        [W, D / 2, R],
        [0, D / 2, R],
      ],
      '#d4d4d8',
    ) + // back roof slope
    poly(
      [
        [0, D / 2, R],
        [W, D / 2, R],
        [W, D, H],
        [0, D, H],
      ],
      '#f4f4f5',
      'stroke="#e4e4e7" stroke-width=".6"',
    ) + // front roof slope
    `</svg>`
  );
}

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const PER_ROW = 3;

/** Selected state: open floor slab with one block per bin, height ∝ sacks / capacity. 300×250 for up to 3 bins; the slab gets deeper for each further row of 3. */
export function interior(bins: { code: string; sacks: number; capacitySacks: number }[]) {
  const W = 120,
    D = 70 + 40 * (Math.max(1, Math.ceil(bins.length / PER_ROW)) - 1);
  let s =
    `<svg viewBox="-70 -60 180 150" width="300" height="250" style="display:block;overflow:visible">${DEFS}${shadow(22, 58, 110, 34)}` +
    box(
      0,
      0,
      W,
      D,
      -4,
      0,
      { t: '#fafafa', l: '#e4e4e7', r: '#d4d4d8' },
      'stroke="#e4e4e7" stroke-width=".6"',
    ) +
    poly(
      [
        [2, 2, 0],
        [W - 2, 2, 0],
        [W - 2, 2, 10],
        [2, 2, 10],
      ],
      '#f4f4f5',
      'stroke="#e4e4e7" stroke-width=".6"',
    ) +
    poly(
      [
        [2, 2, 0],
        [2, D - 2, 0],
        [2, D - 2, 10],
        [2, 2, 10],
      ],
      '#ececee',
      'stroke="#e4e4e7" stroke-width=".6"',
    ) +
    poly(
      [
        [50, D, 0],
        [78, D, 0],
        [78, D + 18, 0],
        [50, D + 18, 0],
      ],
      '#ececee',
    );
  bins.forEach((b, i) => {
    const f = b.capacitySacks > 0 ? b.sacks / b.capacitySacks : 0,
      p = f * 100,
      x = 10 + (i % PER_ROW) * 37,
      y = 18 + Math.floor(i / PER_ROW) * 40,
      bw = 28,
      bd = 34,
      h = b.sacks ? 4 + 44 * f : 0;
    s += poly(
      [
        [x, y, 0],
        [x + bw, y, 0],
        [x + bw, y + bd, 0],
        [x, y + bd, 0],
      ],
      'none',
      'stroke="#a1a1aa" stroke-width=".8" stroke-dasharray="2 2"',
    );
    if (h) s += box(x, y, x + bw, y + bd, 0, h, PAL[status(p)]);
    const [tx, ty] = P(x + bw / 2, y + bd / 2, h + 6);
    s += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="9" font-weight="600" fill="#27272a" font-family="system-ui,sans-serif" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(b.code)}</text>`;
  });
  return s + `</svg>`;
}
