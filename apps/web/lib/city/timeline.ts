/**
 * The pure maths of the landing-page scroll story (components/city): how far the runner has
 * travelled at each scroll position, and when each chapter of text is on screen. No Three.js and
 * no DOM here, so it can be unit-tested (timeline.test.ts).
 *
 * Scroll progress P runs from 0 (top of the story) to 1 (the waitlist at the end).
 */

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
/** Smoothstep: 0 below a, 1 above b, eased in between. */
export const ss = (x: number): number => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const seg = (p: number, a: number, b: number): number => ss((p - a) / (b - a));
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

/** The route, as street-grid corners [i, j]. 1 grid unit = 50 m. */
export const NODES: [number, number][] = [[-3, 0], [0, 0], [0, 2], [2, 2], [2, 0], [0, 0], [0, -2], [2, -2], [4, -2], [4, -1], [4, 0], [5, 0], [5, -1], [4, -1]];

/** Route length in "steps" (the scene's own unit; 22 steps is the whole run). */
export const TOTAL_STEPS = 22;
/** Step at which the loop closes and the zone is claimed, where a rival takes ground, where a friend joins. */
export const CLAIM_AT = 11;
export const RIVAL_AT = 22;
export const AANYA_FROM = 17.2;

/** [scroll progress, steps travelled]: the runner holds still, runs, pauses at each chapter, runs on. */
export const KEYS: [number, number][] = [[0, 0], [0.12, 0], [0.248, 3], [0.268, 3], [0.378, 11], [0.448, 11], [0.538, 15], [0.565, 15], [0.685, 18], [0.705, 18], [0.80, 19], [0.82, 19], [0.898, 22], [1, 22]];

export function stepsAt(P: number): number {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [a, sa] = KEYS[i], [b, sb] = KEYS[i + 1];
    if (P <= b) return sa + (sb - sa) * ss((P - a) / Math.max(1e-6, b - a));
  }
  return TOTAL_STEPS;
}

/** Each chapter of text: visible from `in` to `out` of the story's scroll progress. */
export interface Chapter { id: string; in: number; out: number }
export const CHAPTERS: Chapter[] = [
  { id: 'thought', in: -1, out: 0.118 },
  { id: 'track', in: 0.128, out: 0.258 },
  { id: 'claim', in: 0.272, out: 0.438 },
  { id: 'pacex', in: 0.452, out: 0.548 },
  { id: 'store', in: 0.562, out: 0.692 },
  { id: 'friends', in: 0.705, out: 0.812 },
  { id: 'rivals', in: 0.824, out: 0.912 },
  { id: 'final', in: 0.935, out: 9 },
];

/** How visible a chapter is at progress P (0 to 1): it fades in over 1.8% of the scroll and out the same. */
export const chapterOpacity = (c: Chapter, P: number): number => Math.min(seg(P, c.in, c.in + 0.018), 1 - seg(P, c.out - 0.018, c.out));

/** When each line of the PaceX debrief is ticked. */
export const CHECK_AT = [0.468, 0.494, 0.52];

/** The runner's progress through the story section: 0 when its top reaches the top of the screen, 1 when its bottom reaches the bottom. */
export function storyProgress(sectionTop: number, sectionHeight: number, viewportHeight: number): number {
  const max = sectionHeight - viewportHeight;
  return max > 0 ? clamp01(-sectionTop / max) : 0;
}
