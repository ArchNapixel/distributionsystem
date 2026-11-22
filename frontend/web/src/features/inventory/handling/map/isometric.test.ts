import { describe, expect, it } from 'vitest';
import { gabled, interior, status } from './isometric';

describe('status', () => {
  it('is empty at 0, near full from 90, otherwise in use', () => {
    expect([0, 1, 89, 90, 100].map(status)).toEqual(['empty', 'ok', 'ok', 'full', 'full']);
  });
});

describe('gabled', () => {
  it('draws the building at 0% and 100%', () => {
    expect(gabled(0)).toMatch(/^<svg /);
    expect(gabled(100)).toMatch(/<\/svg>$/);
    // The gauge fill uses the status colour, so an empty and a full warehouse differ.
    expect(gabled(100)).not.toEqual(gabled(0));
  });
});

describe('interior', () => {
  const bin = (code: string, sacks: number) => ({ code, sacks, capacitySacks: 500 });

  it('draws only a dashed outline for an empty bin and a block for a stocked one', () => {
    const empty = interior([bin('A1', 0)]);
    const stocked = interior([bin('A1', 250)]);
    expect(empty).toContain('stroke-dasharray');
    expect(stocked.split('<polygon').length).toBeGreaterThan(empty.split('<polygon').length);
  });

  it('survives a bin with no capacity', () => {
    expect(interior([{ code: 'A1', sacks: 0, capacitySacks: 0 }])).not.toContain('NaN');
  });

  it('escapes bin codes, which users type', () => {
    const svg = interior([bin('<img onerror=x>', 10)]);
    expect(svg).not.toContain('<img');
    expect(svg).toContain('&#60;img');
  });

  it('adds a row of depth for every three bins', () => {
    const rows = (n: number) => interior(Array.from({ length: n }, (_, i) => bin(`B${i}`, 1)));
    expect(rows(4)).not.toEqual(rows(3));
    expect(rows(3)).toContain('B2');
  });
});
