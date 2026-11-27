/** Route shapes for the You → Gallery tiles. Pure, so it's unit-tested. */
import { pieceStarts, thinIndices, svgPath } from '@mobile/shared/lib/trailPieces';

const MAX_PTS = 80;

/**
 * The route squeezed into a size × size box, keeping its proportions, as an SVG
 * path. The pen lifts at a pause the runner resumed somewhere else.
 */
export function routePath(points: { lat: number; lng: number; brk?: boolean }[], size: number, pad = 12): string | null {
  if (points.length < 2) return null;
  const starts = pieceStarts(points);
  const idx = thinIndices(points, MAX_PTS, starts);
  const pts = idx.map(i => points[i]);
  const midLat = pts.reduce((n, p) => n + p.lat, 0) / pts.length;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const xs = pts.map(p => p.lng * kx);
  const ys = pts.map(p => -p.lat);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY);
  if (!(span > 0)) return null;
  const scale = (size - pad * 2) / span;
  const offX = (size - (maxX - minX) * scale) / 2;
  const offY = (size - (maxY - minY) * scale) / 2;
  return svgPath(xs.map((x, i) => [offX + (x - minX) * scale, offY + (ys[i] - minY) * scale]), idx, starts);
}
