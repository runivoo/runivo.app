import { describe, expect, it } from 'vitest';
import { formatDuration, formatPace, paceFrom, predictTime, speedKmh, timeFrom, distanceFrom, toSeconds, trainingPaces } from './runMath';

describe('run math', () => {
  it('formats durations', () => {
    expect(formatDuration(25 * 60)).toBe('25:00');
    expect(formatDuration(3 * 3600 + 5 * 60 + 9)).toBe('3:05:09');
    expect(formatDuration(59.6)).toBe('1:00');
    expect(formatPace(330)).toBe('5:30');
  });

  it('solves pace, time and distance consistently', () => {
    const t = toSeconds(0, 25, 0);
    const pace = paceFrom(t, 5);
    expect(pace).toBe(300);
    expect(timeFrom(pace, 5)).toBe(t);
    expect(distanceFrom(pace, t)).toBe(5);
    expect(speedKmh(360)).toBe(10);
  });

  it('predicts with Riegel', () => {
    // 5K in 25:00 gives about 52:07 for 10K.
    expect(formatDuration(predictTime(25 * 60, 5, 10))).toBe('52:07');
    expect(predictTime(1000, 10, 10)).toBe(1000);
    // Longer distance, slower pace.
    expect(paceFrom(predictTime(1500, 5, 21.0975), 21.0975)).toBeGreaterThan(paceFrom(1500, 5));
  });

  it('gives ordered training paces', () => {
    const p = trainingPaces(toSeconds(0, 50, 0), 10);
    expect(p.easy.low).toBe(300 + 60);
    expect(p.easy.high).toBe(300 + 90);
    expect(p.tempo.low).toBeLessThan(p.easy.low);
    expect(p.interval.low).toBeLessThan(p.tempo.low);
  });
});
