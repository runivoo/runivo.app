import { describe, it, expect, vi, afterEach } from 'vitest';
import { attentionItems, aiNote, renderDigest } from './adminDigest';
import type { DigestData } from './adminStats';

const base: DigestData = {
  day: 'Fri 27 Nov', signups: 23, signupsByPlatform: [{ name: 'instagram', count: 15 }, { name: 'direct', count: 8 }],
  waitlistTotal: 412, newRunners: 3, runnersTotal: 37, runs: 41, km: 212.5, flaggedRuns: 1,
  openReports: 4, brandsWaiting: 1, lowCodes: [{ title: 'Trail socks', brand: 'Decathlon', left: 3 }],
};
const ENV = { ...process.env };
afterEach(() => { process.env = { ...ENV }; });

describe('admin digest', () => {
  it('lists what needs attention, most urgent first', () => {
    expect(attentionItems(base)).toEqual([
      '4 open reports in Moderation',
      '1 brand application waiting in Partners',
      'Decathlon · Trail socks: 3 codes left',
      '1 run flagged by the cheating checks yesterday',
    ]);
  });
  it('says so when nothing needs attention', () => {
    const quiet = { ...base, openReports: 0, brandsWaiting: 0, lowCodes: [], flaggedRuns: 0 };
    expect(renderDigest(quiet, null).text).toContain('Nothing needs you today.');
  });
  it('puts the numbers in the subject and the email', () => {
    const m = renderDigest(base, null);
    expect(m.subject).toBe('Runivo · Fri 27 Nov: 23 sign-ups, 4 to do');
    expect(m.html).toContain('Instagram 15');
    expect(m.text).toContain('most from Instagram');
  });
  it('escapes everything it prints', () => {
    const m = renderDigest({ ...base, lowCodes: [{ title: '<b>x</b>', brand: 'A&B', left: 0 }] }, '<script>1</script>');
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('A&amp;B · &lt;b&gt;x&lt;/b&gt;');
  });
  it('uses no AI without a key, and falls back when Claude fails', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(await aiNote(base)).toBeNull();
    process.env.ANTHROPIC_API_KEY = 'k';
    const failing = vi.fn().mockResolvedValue(new Response('{}', { status: 500 })) as unknown as typeof fetch;
    expect(await aiNote(base, failing)).toBeNull();
    const ok = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: 'text', text: '23 joined, mostly from Instagram.' }] }), { status: 200 })) as unknown as typeof fetch;
    expect(await aiNote(base, ok)).toBe('23 joined, mostly from Instagram.');
  });
});
