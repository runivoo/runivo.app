import { adminRoute, serviceClient, json } from '@/lib/server/adminServer';
import { asRange, posthogConfig, websiteStats } from '@/lib/admin/websiteStats';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/website?days=7|30|90: website visitors from PostHog, plus
 * waitlist sign-ups in the same days (from the database) for the conversion rate.
 * The PostHog key stays on the server; the browser only gets the numbers.
 */
export const GET = adminRoute(async (req) => {
  const range = asRange(new URL(req.url).searchParams.get('days'));
  const cfg = posthogConfig();
  if (!cfg) return json({ configured: false });

  const since = new Date(Date.now() - range * 86_400_000).toISOString();
  const [stats, signups] = await Promise.all([
    websiteStats(range, cfg),
    serviceClient().from('waitlist').select('id', { count: 'exact', head: true }).gte('created_at', since),
  ]);
  return json({ configured: true, ...stats, signups: signups.count ?? 0 });
});
