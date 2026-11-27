import { describe, it, expect } from 'vitest';
import { pieceStarts, thinIndices, svgPath } from './trailPieces';

const line = (lng: number, n: number, brkAt = -1) =>
  Array.from({ length: n }, (_, i) => ({ lat: 12.97 + i * 1e-5, lng, ...(i === brkAt && { brk: true }) }));

describe('trailPieces', () => {
  it('starts a piece only at a pause resumed far away', () => {
    expect(pieceStarts([...line(77.6, 10), ...line(77.6, 10, 0)]).size).toBe(0); // resumed on the spot
    expect([...pieceStarts([...line(77.6, 10), ...line(77.63, 10, 0)])]).toEqual([10]);
  });

  it('thinning keeps both ends of every break', () => {
    const pts = [...line(77.6, 500), ...line(77.63, 500, 0)];
    const idx = thinIndices(pts, 20);
    expect(idx).toContain(499);
    expect(idx).toContain(500);
    expect(idx[idx.length - 1]).toBe(999);
  });

  it('lifts the pen at a break', () => {
    expect(svgPath([[0, 0], [1, 1], [5, 5], [6, 6]], [0, 1, 2, 3], new Set([2]))).toBe('M0.0 0.0 L1.0 1.0 M5.0 5.0 L6.0 6.0');
  });
});
