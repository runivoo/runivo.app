/**
 * Website analytics for Studio → Website, read from PostHog on the server.
 *
 * Needs two server-only Vercel env vars (no NEXT_PUBLIC_ prefix):
 *   POSTHOG_PERSONAL_API_KEY  a personal API key with only the "Query: read" scope
 *   POSTHOG_PROJECT_ID        the number in the PostHog project URL (/project/12345)
 * Optional: POSTHOG_API_HOST (defaults to the app host that matches
 * NEXT_PUBLIC_POSTHOG_HOST, e.g. us.i.posthog.com → https://us.posthog.com).
 *
 * Every query is a fixed string: the only variable is the range in days, which
 * is whitelisted, so nothing from the request reaches HogQL. Studio pages
 * (/admin) and auth pages are left out, so admins don't count as visitors.
 */

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

export interface Named { name: string; count: number }
export interface Day { day: string; count: number }
export interface WebsiteStats {
  range: Range;
  visitors: number; visitorsPrev: number;
  pageviews: number;
  daily: Day[];
  pages: Named[];
  referrers: Named[];
  countries: Named[];
  devices: Named[];
}

export function asRange(v: string | null): Range {
  const n = Number(v);
  return (RANGES as readonly number[]).includes(n) ? (n as Range) : 30;
}

export function posthogConfig(env: Record<string, string | undefined> = process.env):
  { key: string; project: string; host: string } | null {
  const key = env.POSTHOG_PERSONAL_API_KEY?.trim();
  const project = env.POSTHOG_PROJECT_ID?.trim();
  if (!key || !project || !/^\d+$/.test(project)) return null;
  const host = (env.POSTHOG_API_HOST?.trim() || appHost(env.NEXT_PUBLIC_POSTHOG_HOST)).replace(/\/+$/, '');
  return { key, project, host };
}

/** The ingest host (us.i.posthog.com) takes events; queries go to the app host (us.posthog.com). */
export function appHost(ingest: string | undefined): string {
  const h = ingest?.trim() || 'https://us.i.posthog.com';
  return h.replace('.i.posthog.com', '.posthog.com');
}

const SITE = `event = '$pageview'
  and not startsWith(properties.$pathname, '/admin')
  and not startsWith(properties.$pathname, '/reset-password')
  and not startsWith(properties.$pathname, '/auth')`;

/** The HogQL for each panel. `days` is a whitelisted number, never request text. */
export function queries(days: Range): Record<string, string> {
  const inRange = `timestamp >= now() - interval ${days} day`;
  return {
    totals: `select count(distinct person_id), count() from events where ${SITE} and ${inRange}`,
    prev: `select count(distinct person_id) from events where ${SITE}
      and timestamp >= now() - interval ${days * 2} day and timestamp < now() - interval ${days} day`,
    daily: `select toDate(timestamp) as d, count(distinct person_id) from events
      where ${SITE} and ${inRange} group by d order by d`,
    pages: `select properties.$pathname as p, count() as c from events
      where ${SITE} and ${inRange} group by p order by c desc limit 8`,
    referrers: `select properties.$referring_domain as r, count(distinct person_id) as c from events
      where ${SITE} and ${inRange} group by r order by c desc limit 8`,
    countries: `select properties.$geoip_country_name as g, count(distinct person_id) as c from events
      where ${SITE} and ${inRange} group by g order by c desc limit 6`,
    devices: `select properties.$device_type as t, count(distinct person_id) as c from events
      where ${SITE} and ${inRange} group by t order by c desc limit 4`,
  };
}

type Rows = unknown[][];

async function hogql(cfg: { key: string; project: string; host: string }, query: string): Promise<Rows> {
  const res = await fetch(`${cfg.host}/api/projects/${cfg.project}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const why = res.status === 401 || res.status === 403
      ? 'PostHog refused the key. Check POSTHOG_PERSONAL_API_KEY has the "Query: read" scope for this project.'
      : `PostHog answered ${res.status}.`;
    throw new Error(why);
  }
  const body = (await res.json()) as { results?: Rows };
  return body.results ?? [];
}

const int = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);

/** Rows of [label, count] → Named, with friendly names for empty labels. */
export function named(rows: Rows, empty: string): Named[] {
  return rows.map(r => ({ name: typeof r[0] === 'string' && r[0] ? r[0] : empty, count: int(r[1]) }));
}

/** Fills in days with no visits so the chart has one bar per day. */
export function fillDays(rows: Rows, days: Range, today = new Date()): Day[] {
  const seen = new Map(rows.map(r => [String(r[0]).slice(0, 10), int(r[1])]));
  const out: Day[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, count: seen.get(key) ?? 0 });
  }
  return out;
}

export async function websiteStats(range: Range, cfg = posthogConfig()): Promise<WebsiteStats> {
  if (!cfg) throw new Error('not_configured');
  const q = queries(range);
  const [totals, prev, daily, pages, referrers, countries, devices] = await Promise.all(
    [q.totals, q.prev, q.daily, q.pages, q.referrers, q.countries, q.devices].map(s => hogql(cfg, s)),
  );
  return {
    range,
    visitors: int(totals[0]?.[0]),
    pageviews: int(totals[0]?.[1]),
    visitorsPrev: int(prev[0]?.[0]),
    daily: fillDays(daily, range),
    pages: named(pages, '(unknown page)'),
    referrers: named(referrers, '$direct').map(r => ({ ...r, name: r.name === '$direct' ? 'Direct (typed or no link info)' : r.name })),
    countries: named(countries, 'Unknown'),
    devices: named(devices, 'Unknown'),
  };
}
