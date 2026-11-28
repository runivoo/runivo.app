import { describe, expect, it } from 'vitest';
import { CHAPTERS, CHECK_AT, KEYS, TOTAL_STEPS, chapterOpacity, clamp01, seg, stepsAt, storyProgress } from './timeline';
import { CITY_COPY, CITY_ECONOMY } from '../../content/city';
import { ENGINE } from '../../../../packages/shared/src/engine/runEngine';

describe('story timeline', () => {
  it('has chapters in order, apart from each other, and the last one stays to the end', () => {
    for (let i = 1; i < CHAPTERS.length; i++) {
      expect(CHAPTERS[i].in, CHAPTERS[i].id).toBeGreaterThan(CHAPTERS[i - 1].out);
      expect(CHAPTERS[i].out).toBeGreaterThan(CHAPTERS[i].in);
    }
    const last = CHAPTERS[CHAPTERS.length - 1];
    expect(chapterOpacity(last, 1)).toBe(1);
    expect(chapterOpacity(CHAPTERS[0], 0)).toBe(1);
  });

  it('fades a chapter in and out, and shows it fully in the middle', () => {
    const c = CHAPTERS[1];
    expect(chapterOpacity(c, c.in - 0.01)).toBe(0);
    expect(chapterOpacity(c, (c.in + c.out) / 2)).toBe(1);
    expect(chapterOpacity(c, c.out + 0.01)).toBe(0);
  });

  it('never moves the runner backwards, and ends at the finish', () => {
    let prev = -1;
    for (let p = 0; p <= 1.0001; p += 0.005) { const s = stepsAt(p); expect(s).toBeGreaterThanOrEqual(prev - 1e-9); prev = s; }
    expect(stepsAt(0)).toBe(0);
    expect(stepsAt(1)).toBe(TOTAL_STEPS);
    expect(KEYS[KEYS.length - 1][1]).toBe(TOTAL_STEPS);
  });

  it('ticks the PaceX lines inside the PaceX chapter', () => {
    const pacex = CHAPTERS.find(c => c.id === 'pacex')!;
    for (const at of CHECK_AT) { expect(at).toBeGreaterThan(pacex.in); expect(at).toBeLessThan(pacex.out); }
  });

  it('measures progress through the section, clamped', () => {
    expect(storyProgress(0, 3000, 800)).toBe(0);
    expect(storyProgress(-1100, 3000, 800)).toBeCloseTo(0.5);
    expect(storyProgress(-5000, 3000, 800)).toBe(1);
    expect(storyProgress(300, 3000, 800)).toBe(0);
    expect(storyProgress(0, 500, 800)).toBe(0);
    expect(clamp01(seg(0.5, 0, 1))).toBeCloseTo(0.5);
  });
});

describe('story numbers match the app', () => {
  it('uses the real PACE rules', () => {
    expect(CITY_ECONOMY.perKm).toBe(ENGINE.PACE_PER_KM);
    expect(CITY_ECONOMY.newZone).toBe(ENGINE.PACE_PER_NEW_ZONE);
    expect(CITY_ECONOMY.stolenZone).toBe(ENGINE.PACE_PER_STOLEN_ZONE);
  });

  it('says the real loop length', () => {
    expect(CITY_COPY.claim.lead).toContain(`${ENGINE.LOOP_MIN_PERIMETER_M} m`);
  });

  it('prices the example rewards inside the partner guide levels (entry 50 to 100, mid 200 to 400)', () => {
    const [entry, mid] = CITY_COPY.store.rewards;
    expect(entry.cost).toBeGreaterThanOrEqual(50); expect(entry.cost).toBeLessThanOrEqual(100);
    expect(mid.cost).toBeGreaterThanOrEqual(200); expect(mid.cost).toBeLessThanOrEqual(400);
  });

  it('shows no live heart rate (the app has none)', () => {
    const all = JSON.stringify(CITY_COPY);
    expect(all).not.toMatch(/heart|bpm/i);
  });

  it('is a 5 km run at 5:44 per km in 28:41, as the scene counts it', () => {
    expect(CITY_ECONOMY.kmCoins).toBe(5);
    expect(Math.round(1721 / 5)).toBe(5 * 60 + 44);   // the scene's 1,721 seconds over 5 km
    expect(CITY_COPY.pacex.checks[1]).toContain('5:44');
    expect(CITY_COPY.tags.pace).toContain('5:44');
  });
});
