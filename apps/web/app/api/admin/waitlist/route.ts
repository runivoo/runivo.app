import { adminRoute, serviceClient, json } from '@/lib/adminServer';

export const dynamic = 'force-dynamic';

/** GET /api/admin/waitlist: the total and the newest 1000 sign-ups. */
export const GET = adminRoute(async () => {
  const db = serviceClient();
  const [{ count, error: countErr }, { data, error }] = await Promise.all([
    db.from('waitlist').select('id', { count: 'exact', head: true }),
    db.from('waitlist').select('id, email, city, source, platform, campaign, created_at').order('created_at', { ascending: false }).limit(1000),
  ]);
  if (countErr || error) return json({ error: (countErr ?? error)!.message }, 400);
  return json({ total: count ?? 0, rows: data ?? [] });
});
