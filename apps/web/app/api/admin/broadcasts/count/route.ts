import { adminRoute, json, str } from '@/lib/server/adminServer';
import { slug } from '@/lib/forms/attribution';
import { audienceCount } from '@/lib/email/broadcast';

export const dynamic = 'force-dynamic';

/** GET /api/admin/broadcasts/count?city=&platform=: how many people an audience reaches. */
export const GET = adminRoute(async (req: Request) => {
  const u = new URL(req.url);
  const count = await audienceCount({ kind: 'waitlist', city: str(u.searchParams.get('city'), 80), platform: slug(u.searchParams.get('platform'), 30) });
  return json({ count });
});
