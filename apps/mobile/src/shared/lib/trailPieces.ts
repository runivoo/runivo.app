/**
 * Route drawings in pieces. A pause the runner resumed somewhere else is a break
 * in the line (runEngine splitAtBreaks), never a straight jump across the city.
 * Pure, so it is unit-tested.
 */
import { splitAtBreaks } from '@shared/engine/runEngine';

type Pt = { lat: number; lng: number; brk?: boolean };

/** Indices where a new piece of trail begins (never 0). */
export function pieceStarts(points: Pt[]): Set<number> {
  const starts = new Set<number>();
  let i = 0;
  for (const seg of splitAtBreaks(points)) {
    if (i > 0) starts.add(i);
    i += seg.length;
  }
  return starts;
}

/**
 * Thins a trace to about `max` points for a small drawing, always keeping the
 * first and last point and both ends of every break. Returns original indices.
 */
export function thinIndices(points: Pt[], max: number, starts = pieceStarts(points)): number[] {
  const step = Math.max(1, Math.floor(points.length / max));
  const out: number[] = [];
  for (let i = 0; i < points.length; i++) {
    if (i % step === 0 || i === points.length - 1 || starts.has(i) || starts.has(i + 1)) out.push(i);
  }
  return out;
}

/** An SVG path through screen points, lifting the pen at every break. */
export function svgPath(xy: [number, number][], idx: number[], starts: Set<number>): string {
  return xy.map(([x, y], k) => `${k === 0 || starts.has(idx[k]) ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}
