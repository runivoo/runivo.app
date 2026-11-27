import { serviceClient } from './adminServer';

/** Live code-pool rewards with fewer than `below` unused codes: top them up before runners see "sold out". */
export async function lowCodeRewards(below = 10) {
  const db = serviceClient();
  const { data: rewards } = await db.from('pace_store_rewards').select('id, title, brand').eq('status', 'available').eq('code_mode', 'pool');
  if (!rewards?.length) return [];
  const { data: codes } = await db.from('reward_codes').select('reward_id').in('reward_id', rewards.map(r => r.id)).is('assigned_to', null);
  const left = new Map<string, number>();
  for (const c of codes ?? []) left.set(c.reward_id as string, (left.get(c.reward_id as string) ?? 0) + 1);
  return rewards
    .map(r => ({ id: r.id as string, title: r.title as string, brand: r.brand as string, left: left.get(r.id as string) ?? 0 }))
    .filter(r => r.left < below)
    .sort((a, b) => a.left - b.left);
}

const IST_MS = 5.5 * 3600 * 1000;

/** Yesterday in India time, as [start, end) instants and a label like "Fri 27 Nov". */
export function istYesterday(now = new Date()) {
  const ist = new Date(now.getTime() + IST_MS);
  const startIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() - 1);
  const start = new Date(startIst - IST_MS), end = new Date(startIst + 86_400_000 - IST_MS);
  const label = new Date(startIst).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  return { start, end, label };
}

export interface DigestData {
  day: string;
  signups: number;
  signupsByPlatform: { name: string; count: number }[];
  waitlistTotal: number;
  newRunners: number;
  runnersTotal: number;
  runs: number;
  km: number;
  flaggedRuns: number;
  openReports: number;
  brandsWaiting: number;
  lowCodes: { title: string; brand: string; left: number }[];
}

/** Yesterday's numbers for the admin digest. */
export async function digestData(now = new Date()): Promise<DigestData> {
  const db = serviceClient();
  const { start, end, label } = istYesterday(now);
  const s = start.toISOString(), e = end.toISOString();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const [signupRows, waitlistTotal, newRunners, runnersTotal, runRows, flaggedRuns, brandsWaiting, lowCodes, ...reports] = await Promise.all([
    db.from('waitlist').select('platform').gte('created_at', s).lt('created_at', e).then(r => r.data ?? []),
    count(db.from('waitlist').select('id', { count: 'exact', head: true })),
    count(db.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', s).lt('created_at', e)),
    count(db.from('profiles').select('id', { count: 'exact', head: true })),
    db.from('runs').select('distance_m').gte('started_at', s).lt('started_at', e).eq('excluded', false).eq('integrity_status', 'ok').then(r => r.data ?? []),
    count(db.from('runs').select('id', { count: 'exact', head: true }).gte('started_at', s).lt('started_at', e).or('excluded.eq.true,integrity_status.neq.ok')),
    count(db.from('partners').select('id', { count: 'exact', head: true }).eq('status', 'applied')),
    lowCodeRewards(),
    ...['content_reports', 'post_reports', 'user_reports', 'club_message_reports'].map(t =>
      count(db.from(t).select('*', { count: 'exact', head: true }).eq('status', 'open'))),
  ]);

  const byPlatform = new Map<string, number>();
  for (const r of signupRows as { platform: string | null }[]) byPlatform.set(r.platform ?? 'unknown', (byPlatform.get(r.platform ?? 'unknown') ?? 0) + 1);

  return {
    day: label,
    signups: signupRows.length,
    signupsByPlatform: [...byPlatform].map(([name, c]) => ({ name, count: c })).sort((a, b) => b.count - a.count),
    waitlistTotal, newRunners, runnersTotal,
    runs: runRows.length,
    km: Math.round((runRows as { distance_m: number }[]).reduce((t, r) => t + Number(r.distance_m || 0), 0) / 100) / 10,
    flaggedRuns, brandsWaiting,
    openReports: (reports as number[]).reduce((t, n) => t + n, 0),
    lowCodes: lowCodes.map(({ title, brand, left }) => ({ title, brand, left })),
  };
}
