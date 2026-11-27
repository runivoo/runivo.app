import { serviceClient } from '@/lib/adminServer';
import { digestData } from '@/lib/adminStats';
import { aiNote, renderDigest, sendDigest } from '@/lib/adminDigest';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/admin-digest: the morning email to every admin (vercel.json runs it at
 * 02:30 UTC = 08:00 India time). Vercel sends "Authorization: Bearer <CRON_SECRET>";
 * anything else is refused, so nobody can trigger mail from outside.
 */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const db = serviceClient();
  const { data: admins } = await db.from('profiles').select('id').eq('subscription_tier', 'admin');
  const emails: string[] = [];
  for (const a of admins ?? []) {
    const { data } = await db.auth.admin.getUserById(a.id as string);
    if (data.user?.email) emails.push(data.user.email);
  }
  const d = await digestData();
  const sent = await sendDigest(emails, renderDigest(d, await aiNote(d)));
  return Response.json({ ok: true, admins: emails.length, sent }, { headers: { 'Cache-Control': 'no-store' } });
}
