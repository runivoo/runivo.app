import { describe, it, expect } from 'vitest';
import {
  ENGINE, ringAreaM2, enclosedAreaM2, buildTerritoryShape, verifiedDistance, computeRunPace,
  updateStreak, rankFor, weeklyCapFor, decayedFreshness, tierForArea, metresPerDegree,
  findLoopStart, paceWeekStartMs, weeklyPaceNow, zoneScore, lineToWKT, ringToWKT, type EnginePoint, type LngLat,
  pathLengthM, splitAtBreaks, trailGeometry, cleanPoints, looksSimulated,
} from './runEngine';

// ── Trace helpers ─────────────────────────────────────────────────────────────

/** Walks a polyline of metre offsets from an origin, one fix every `stepM` at `speedMs`. */
function trace(lat0: number, lng0: number, waypointsM: [number, number][], stepM = 3, speedMs = 3): EnginePoint[] {
  const m = metresPerDegree(lat0);
  const pts: EnginePoint[] = [];
  let t = Date.UTC(2026, 10, 6, 7, 0, 0);
  for (let w = 1; w < waypointsM.length; w++) {
    const [x0, y0] = waypointsM[w - 1], [x1, y1] = waypointsM[w];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / stepM));
    for (let i = w === 1 ? 0 : 1; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
      pts.push({ lat: lat0 + y / m.lat, lng: lng0 + x / m.lng, timestamp: t, accuracy: 5 });
      t += (len / n / speedMs) * 1000;
    }
  }
  return pts;
}

const square = (s: number): [number, number][] => [[0, 0], [s, 0], [s, s], [0, s], [0, 0]];
const ringFromM = (lat0: number, lng0: number, pts: [number, number][]): LngLat[] => {
  const m = metresPerDegree(lat0);
  return pts.map(([x, y]) => [lng0 + x / m.lng, lat0 + y / m.lat]);
};

// ── Area ──────────────────────────────────────────────────────────────────────

describe('area', () => {
  for (const lat of [0, 19.07, 51.507, 60]) {
    it(`a 200 m square at lat ${lat} measures 40,000 m² within 0.5%`, () => {
      const a = ringAreaM2(ringFromM(lat, 72.87, square(200)));
      expect(Math.abs(a - 40_000) / 40_000).toBeLessThan(0.005);
    });
  }

  it('even-odd area matches the simple area for a plain square', () => {
    const r = ringFromM(51.5, -0.16, square(200));
    expect(Math.abs(enclosedAreaM2(r) - 40_000) / 40_000).toBeLessThan(0.02);
  });

  it('even-odd area counts both lobes of a figure-8', () => {
    // Two 100 m squares touching at a crossing point.
    const r = ringFromM(51.5, -0.16, [[0, 0], [100, 0], [100, 100], [200, 100], [200, 200], [100, 200], [100, 100], [0, 100], [0, 0]]);
    expect(Math.abs(enclosedAreaM2(r) - 20_000) / 20_000).toBeLessThan(0.05);
  });

  it('tiers follow the published thresholds', () => {
    expect(tierForArea(4_999)).toBe('patch');
    expect(tierForArea(5_000)).toBe('block');
    expect(tierForArea(50_000)).toBe('district');
    expect(tierForArea(200_000)).toBe('quarter');
    expect(tierForArea(500_000)).toBe('domain');
  });
});

// ── Territory shapes ──────────────────────────────────────────────────────────

describe('buildTerritoryShape', () => {
  it('a closed 200 m square loop claims its interior plus the strip', () => {
    const shape = buildTerritoryShape(trace(51.507, -0.165, square(200)), 'run')!;
    expect(shape.kind).toBe('loop');
    // PostGIS measures this exact shape at 50,099 m² (supabase/tests/v1_integrity.test.sql).
    expect(Math.abs(shape.estimatedAreaM2 - 50_099) / 50_099).toBeLessThan(0.04);
    // 50,099 m² sits just over the 50k block/district line.
    expect(shape.tier).toBe('district');
  });

  it('an out-and-back run is not a loop', () => {
    const shape = buildTerritoryShape(trace(51.507, -0.165, [[0, 0], [600, 0], [0, 0]]), 'run')!;
    expect(shape.kind).toBe('corridor');
    // The return leg covers the same strip: PostGIS measures 14,859 m².
    expect(Math.abs(shape.estimatedAreaM2 - 14_859) / 14_859).toBeLessThan(0.05);
  });

  it('an open route claims only the strip', () => {
    const shape = buildTerritoryShape(trace(51.507, -0.165, [[0, 0], [500, 0], [500, 500]]), 'run')!;
    expect(shape.kind).toBe('corridor');
    expect(shape.ring).toBeNull();
  });

  it('a U-shape that ends far from its start is not a loop (no over-claim)', () => {
    const shape = buildTerritoryShape(trace(51.507, -0.165, [[0, 0], [0, 350], [200, 350], [200, 0]]), 'run')!;
    expect(shape.kind).toBe('corridor');
  });

  it('a lollipop claims the loop, not a hull around the stem', () => {
    const pts = trace(51.507, -0.165, [[0, 0], [0, 500], [-100, 500], [-100, 700], [100, 700], [100, 500], [0, 500], [0, 0]]);
    const shape = buildTerritoryShape(pts, 'run')!;
    expect(shape.kind).toBe('loop');
    // 200 × 200 lobe + strip around it + one 500 m stem strip ≈ 62k; a convex hull would be ~110k.
    expect(shape.estimatedAreaM2).toBeLessThan(68_000);
    expect(shape.estimatedAreaM2).toBeGreaterThan(56_000);
  });

  it('only running claims territory', () => {
    expect(buildTerritoryShape(trace(51.507, -0.165, square(200)), 'cycle')).toBeNull();
  });

  it('a run shorter than 200 m claims nothing', () => {
    expect(buildTerritoryShape(trace(51.507, -0.165, [[0, 0], [150, 0]], 2), 'run')).toBeNull();
  });

  it('a single GPS jump does not drop the rest of the run', () => {
    const pts = trace(51.507, -0.165, square(200));
    pts[100] = { ...pts[100], lat: pts[100].lat + 0.02 }; // 2 km teleport
    const shape = buildTerritoryShape(pts, 'run')!;
    expect(shape.kind).toBe('loop');
    expect(shape.estimatedAreaM2).toBeGreaterThan(47_000);
  });

  it('measures a repeated stretch of route once', () => {
    const once = buildTerritoryShape(trace(51.507, -0.165, [[0, 0], [400, 0], [400, 400]]), 'run')!;
    const twice = buildTerritoryShape(trace(51.507, -0.165, [[0, 0], [400, 0], [0, 0], [400, 0], [400, 400]]), 'run')!;
    expect(Math.abs(twice.estimatedAreaM2 - once.estimatedAreaM2) / once.estimatedAreaM2).toBeLessThan(0.05);
  });

  it('loop start is the earliest point the run ends near', () => {
    const pts = trace(51.507, -0.165, square(200), 10);
    expect(findLoopStart(pts)).toBe(0);
  });

  // Audit T4: the loop used to start at the earliest point near the end, so a
  // multi-lap run stacked every lap into one ring and the even-odd fill
  // emptied it on an even number of laps.
  for (const laps of [1, 2, 3, 4]) {
    it(`${laps} lap(s) of a block claim the block, not just the strip`, () => {
      const lap = square(250);
      const way: [number, number][] = [[0, 0]];
      for (let k = 0; k < laps; k++) way.push(...lap.slice(1));
      const shape = buildTerritoryShape(trace(51.507, -0.165, way), 'run')!;
      expect(shape.kind).toBe('loop');
      expect(shape.estimatedAreaM2).toBeGreaterThan(62_500 * 0.95);
    });
  }

  it('a long lap course stays cheap (edge function CPU budget)', () => {
    const way: [number, number][] = [[0, 0]];
    for (let k = 0; k < 10; k++) way.push(...square(550).slice(1));
    const pts = trace(51.507, -0.165, way, 3);
    const t0 = performance.now();
    expect(buildTerritoryShape(pts, 'run')?.kind).toBe('loop');
    expect(performance.now() - t0).toBeLessThan(800);
  });

  it('produces WKT the server can parse', () => {
    const shape = buildTerritoryShape(trace(51.507, -0.165, square(200)), 'run')!;
    expect(lineToWKT(shape.line)).toMatch(/^LINESTRING\(-?\d/);
    expect(ringToWKT(shape.ring!)).toMatch(/^POLYGON\(\(-?\d.*\)\)$/);
  });
});

// ── Verified distance (anti-cheat) ────────────────────────────────────────────

describe('verifiedDistance', () => {
  it('counts a normal run at full length', () => {
    const pts = trace(51.5, -0.16, [[0, 0], [5_000, 0]], 5, 3);
    const { distanceM } = verifiedDistance(pts, 5_000 / 3);
    expect(Math.abs(distanceM - 5_000) / 5_000).toBeLessThan(0.005);
  });

  it('a 100 km trace faked into 60 seconds pays almost nothing', () => {
    const pts = trace(51.5, -0.16, [[0, 0], [100_000, 0]], 500, 1_666);
    const { distanceM } = verifiedDistance(pts, 60);
    expect(distanceM).toBeLessThan(500);
  });

  it('cannot exceed what the duration allows', () => {
    const pts = trace(51.5, -0.16, [[0, 0], [5_000, 0]], 5, 3);
    const { distanceM } = verifiedDistance(pts, 100);
    expect(distanceM).toBeLessThanOrEqual(100 * ENGINE.MAX_SEGMENT_SPEED_MS);
  });

  it('ignores inaccurate fixes', () => {
    const pts = trace(51.5, -0.16, [[0, 0], [2_000, 0]], 5, 3).map((p, i) => (i % 2 ? { ...p, accuracy: 80 } : p));
    const { distanceM } = verifiedDistance(pts, 700);
    expect(Math.abs(distanceM - 2_000)).toBeLessThan(15);
  });
});

// ── PACE ──────────────────────────────────────────────────────────────────────

describe('computeRunPace', () => {
  const base = { newZones: 0, stolenZones: 0, streakAdvanced: false, streakDays: 0, weeklyEarned: 0, tier: 'free' };

  it.each([
    [40, 0], [400, 0], [990, 0], [1_000, 2], [5_240, 10], [8_100, 16], [42_195, 84],
  ])('%i m pays %i PACE for distance', (m, pace) => {
    expect(computeRunPace({ ...base, distanceM: m }).breakdown.distance).toBe(pace);
  });

  it('pays 5 per new zone and 10 per stolen zone', () => {
    const r = computeRunPace({ ...base, distanceM: 8_100, newZones: 1, stolenZones: 1 });
    expect(r.breakdown).toEqual({ distance: 16, newZones: 5, stolenZones: 10, streak: 0 });
    expect(r.total).toBe(31);
  });

  it('pays no zone PACE on a run shorter than 200 m', () => {
    expect(computeRunPace({ ...base, distanceM: 150, newZones: 1 }).total).toBe(0);
  });

  it('pays the streak bonus only on the run that advances the streak to a multiple of 7', () => {
    expect(computeRunPace({ ...base, distanceM: 3_000, streakAdvanced: true, streakDays: 7 }).breakdown.streak).toBe(3);
    expect(computeRunPace({ ...base, distanceM: 3_000, streakAdvanced: false, streakDays: 7 }).breakdown.streak).toBe(0);
    expect(computeRunPace({ ...base, distanceM: 3_000, streakAdvanced: true, streakDays: 8 }).breakdown.streak).toBe(0);
    expect(computeRunPace({ ...base, distanceM: 30, streakAdvanced: true, streakDays: 7 }).breakdown.streak).toBe(0);
  });

  it('respects the weekly cap by tier', () => {
    expect(computeRunPace({ ...base, distanceM: 50_000, weeklyEarned: 90 }).total).toBe(10);
    expect(computeRunPace({ ...base, distanceM: 50_000, weeklyEarned: 90, tier: 'premium' }).total).toBe(60);
    expect(computeRunPace({ ...base, distanceM: 50_000, weeklyEarned: 150, tier: 'premium' }).total).toBe(0);
    expect(weeklyCapFor('admin')).toBe(150);
    expect(weeklyCapFor(null)).toBe(100);
  });

  it('never goes negative', () => {
    expect(computeRunPace({ ...base, distanceM: 5_000, weeklyEarned: 500 }).total).toBe(0);
  });
});

describe('updateStreak', () => {
  it('advances once per day', () => {
    expect(updateStreak({ streakDays: 6, lastRunDay: '2026-11-05', today: '2026-11-06', meaningful: true }))
      .toEqual({ streakDays: 7, lastRunDay: '2026-11-06', advanced: true });
    expect(updateStreak({ streakDays: 7, lastRunDay: '2026-11-06', today: '2026-11-06', meaningful: true }))
      .toEqual({ streakDays: 7, lastRunDay: '2026-11-06', advanced: false });
  });
  it('restarts after a missed day', () => {
    expect(updateStreak({ streakDays: 12, lastRunDay: '2026-11-03', today: '2026-11-06', meaningful: true }).streakDays).toBe(1);
  });
  it('ignores runs that are too short', () => {
    expect(updateStreak({ streakDays: 6, lastRunDay: '2026-11-05', today: '2026-11-06', meaningful: false }).advanced).toBe(false);
  });
  it('handles month and year boundaries', () => {
    expect(updateStreak({ streakDays: 3, lastRunDay: '2026-12-31', today: '2027-01-01', meaningful: true }).streakDays).toBe(4);
  });
});

describe('ranks, freshness, score', () => {
  it('ranks by lifetime PACE', () => {
    expect([0, 199, 200, 599, 600, 1_499, 1_500, 3_999, 4_000].map(rankFor))
      .toEqual(['pacer', 'pacer', 'strider', 'strider', 'chaser', 'chaser', 'hunter', 'hunter', 'sovereign']);
  });
  it('decays 10 points a day, rounded down, never below 0', () => {
    const now = Date.UTC(2026, 10, 6);
    expect(decayedFreshness(100, now - 0.5 * ENGINE.MS_PER_DAY, now)).toBe(95);
    expect(decayedFreshness(100, now - 6.01 * ENGINE.MS_PER_DAY, now)).toBe(39);
    expect(decayedFreshness(100, now - 30 * ENGINE.MS_PER_DAY, now)).toBe(0);
  });
  it('scores a stale zone at half and a fresh one at full area', () => {
    expect(zoneScore(10_000, 0)).toBe(5_000);
    expect(zoneScore(10_000, 100)).toBe(10_000);
  });
  it('PACE weeks start Monday 00:00 UTC', () => {
    expect(new Date(paceWeekStartMs(Date.UTC(2026, 10, 8, 23))).toISOString()).toBe('2026-11-02T00:00:00.000Z');
    expect(new Date(paceWeekStartMs(Date.UTC(2026, 10, 9, 0, 1))).toISOString()).toBe('2026-11-09T00:00:00.000Z');
  });
});

describe('weeklyPaceNow', () => {
  const wed = Date.UTC(2026, 10, 18, 9); // Wed 18 Nov 2026
  it('keeps this week', () => expect(weeklyPaceNow(120, '2026-11-16T00:00:00Z', wed)).toBe(120));
  it('drops last week', () => expect(weeklyPaceNow(300, '2026-11-09T00:00:00Z', wed)).toBe(0));
  it('handles missing values', () => {
    expect(weeklyPaceNow(50, null, wed)).toBe(0);
    expect(weeklyPaceNow(undefined, '2026-11-16T00:00:00Z', wed)).toBe(0);
  });
  it('week starts Monday UTC', () => expect(new Date(paceWeekStartMs(wed)).toISOString()).toBe('2026-11-16T00:00:00.000Z'));
});

// ── Pauses ────────────────────────────────────────────────────────────────────

/** Two traces joined by a pause: the second starts `pauseMin` later, flagged brk. */
function withPause(a: EnginePoint[], b: EnginePoint[], pauseMin: number): EnginePoint[] {
  const shift = a[a.length - 1].timestamp + pauseMin * 60_000 - b[0].timestamp;
  return [...a, ...b.map((p, i) => ({ ...p, timestamp: p.timestamp + shift, ...(i === 0 && { brk: true }) }))];
}

describe('pause breaks', () => {
  const lat0 = 12.97, lng0 = 77.59;
  const m = metresPerDegree(lat0);
  const first = trace(lat0, lng0, [[0, 0], [600, 0]]);
  // Resumed 2 km east of where the pause began (a ride while paused).
  const farAway = trace(lat0, lng0 + 2600 / m.lng, [[0, 0], [600, 0]]);
  // Resumed on the spot (a traffic light).
  const sameSpot = trace(lat0, lng0 + 600 / m.lng, [[0, 0], [600, 0]]);

  it('never counts the stretch across a pause as distance', () => {
    const run = withPause(first, farAway, 10);
    const d = pathLengthM(run);
    expect(d).toBeGreaterThan(1150);
    expect(d).toBeLessThan(1250);
    const v = verifiedDistance(run, 20 * 60, 'run').distanceM;
    expect(v).toBeLessThan(1250);
  });

  it('keeps a pause on the spot as one trail, splits a pause resumed far away', () => {
    expect(splitAtBreaks(withPause(first, sameSpot, 1))).toHaveLength(1);
    expect(splitAtBreaks(withPause(first, farAway, 10))).toHaveLength(2);
  });

  it('draws a far pause as two lines and a pause on the spot as one', () => {
    expect(trailGeometry(withPause(first, farAway, 10)).type).toBe('MultiLineString');
    expect(trailGeometry(withPause(first, sameSpot, 1)).type).toBe('LineString');
  });

  it('cleaning never joins the pieces back together', () => {
    const run = withPause(first, farAway, 10);
    // The first point after the pause is inaccurate and gets dropped.
    const i = first.length;
    run[i] = { ...run[i], accuracy: 500 };
    const clean = cleanPoints(run);
    expect(splitAtBreaks(clean)).toHaveLength(2);
  });

  it('claims ground from the longest piece, never across the gap', () => {
    const loop = trace(lat0, lng0 + 2600 / m.lng, square(200));
    const run = withPause(first, loop, 10);
    const shape = buildTerritoryShape(run, 'run');
    expect(shape).not.toBeNull();
    const lngs = shape!.line.map(c => c[0]);
    // Every point of the claimed line is in the loop, east of the gap.
    expect(Math.min(...lngs)).toBeGreaterThan(lng0 + 2500 / m.lng);
  });
});

describe('looksSimulated', () => {
  const lat0 = 12.97, lng0 = 77.59;
  // A spoofing tool: same accuracy every fix, a machine-steady 3 m/s.
  const spoofed = trace(lat0, lng0, [[0, 0], [400, 0], [400, 400]], 3, 3);
  // Seeded wobble, so the test is repeatable.
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  it('flags a perfectly steady trace with constant accuracy', () => {
    expect(looksSimulated(spoofed)).toBe(true);
  });

  it('passes the same route when the accuracy wobbles like a real phone', () => {
    expect(looksSimulated(spoofed.map(p => ({ ...p, accuracy: 4 + rnd() * 8 })))).toBe(false);
  });

  it('passes a runner whose speed varies, even with a very steady GPS chip', () => {
    let t = spoofed[0].timestamp;
    const real = spoofed.map((p, i) => {
      if (i > 0) t += (3 / (2.6 + rnd() * 0.9)) * 1000;
      return { ...p, timestamp: t };
    });
    expect(looksSimulated(real)).toBe(false);
  });

  it('never judges a short trace', () => {
    expect(looksSimulated(spoofed.slice(0, 40))).toBe(false);
  });
});
