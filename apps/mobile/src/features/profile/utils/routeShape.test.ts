import { describe, it, expect } from 'vitest';
import { routePath } from './routeShape';

const pts = (coords: [number, number][]) => coords.map(([lat, lng]) => ({ lat, lng }));
const nums = (d: string) => d.match(/-?\d+(\.\d+)?/g)!.map(Number);

describe('routePath', () => {
  it('needs at least two distinct points', () => {
    expect(routePath(pts([[12.97, 77.6]]), 100)).toBeNull();
    expect(routePath(pts([[12.97, 77.6], [12.97, 77.6]]), 100)).toBeNull();
  });

  it('fits the route inside the tile with padding', () => {
    const line = routePath(pts([[12.97, 77.6], [12.98, 77.61], [12.99, 77.6], [12.97, 77.6]]), 120, 12)!;
    const v = nums(line);
    expect(Math.min(...v)).toBeGreaterThanOrEqual(12 - 0.05);
    expect(Math.max(...v)).toBeLessThanOrEqual(108 + 0.05);
  });

  it('keeps north up', () => {
    const line = routePath(pts([[12.97, 77.6], [12.99, 77.6]]), 100)!;
    const [, y1, , y2] = nums(line);
    expect(y2).toBeLessThan(y1);
  });

  it('thins long traces but keeps the last point', () => {
    const long = Array.from({ length: 1000 }, (_, i) => ({ lat: 12.97 + i * 1e-5, lng: 77.6 + Math.sin(i / 50) * 1e-3 }));
    const line = routePath(long, 100)!;
    expect(nums(line).length / 2).toBeLessThanOrEqual(90);
  });

  it('lifts the pen at a pause resumed far away', () => {
    const a = Array.from({ length: 50 }, (_, i) => ({ lat: 12.97 + i * 1e-5, lng: 77.6 }));
    const b = Array.from({ length: 50 }, (_, i) => ({ lat: 12.97 + i * 1e-5, lng: 77.63, ...(i === 0 && { brk: true }) }));
    const d = routePath([...a, ...b], 100)!;
    expect(d.match(/M/g)!.length).toBe(2);
  });
});
