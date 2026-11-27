import { describe, it, expect } from 'vitest';
import { appHost, asRange, fillDays, named, posthogConfig, queries } from './websiteStats';

describe('websiteStats', () => {
  it('only accepts 7, 30 or 90 days', () => {
    expect(asRange('7')).toBe(7);
    expect(asRange('90')).toBe(90);
    expect(asRange('1; drop table')).toBe(30);
    expect(asRange(null)).toBe(30);
  });

  it('needs both env vars and a numeric project id', () => {
    expect(posthogConfig({})).toBeNull();
    expect(posthogConfig({ POSTHOG_PERSONAL_API_KEY: 'k', POSTHOG_PROJECT_ID: 'abc' })).toBeNull();
    expect(posthogConfig({ POSTHOG_PERSONAL_API_KEY: 'k', POSTHOG_PROJECT_ID: '123' }))
      .toEqual({ key: 'k', project: '123', host: 'https://us.posthog.com' });
  });

  it('queries the app host, not the ingest host', () => {
    expect(appHost('https://eu.i.posthog.com')).toBe('https://eu.posthog.com');
    expect(appHost(undefined)).toBe('https://us.posthog.com');
  });

  it('leaves Studio and auth pages out of every query', () => {
    for (const q of Object.values(queries(30))) {
      expect(q).toContain("'/admin'");
      expect(q).toContain("'/reset-password'");
    }
  });

  it('fills days with no visits', () => {
    const days = fillDays([['2026-11-27', 4]], 7, new Date('2026-11-28T10:00:00Z'));
    expect(days).toHaveLength(7);
    expect(days.at(-1)).toEqual({ day: '2026-11-28', count: 0 });
    expect(days.at(-2)).toEqual({ day: '2026-11-27', count: 4 });
  });

  it('names empty labels', () => {
    expect(named([[null, 3], ['/', '5']], 'Unknown')).toEqual([{ name: 'Unknown', count: 3 }, { name: '/', count: 5 }]);
  });
});
