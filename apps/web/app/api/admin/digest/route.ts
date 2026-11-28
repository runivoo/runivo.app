import { adminRoute, adminIdOf, serviceClient, json, logAction } from '@/lib/server/adminServer';
import { digestData } from '@/lib/admin/adminStats';
import { aiNote, renderDigest, sendDigest } from '@/lib/admin/adminDigest';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** POST /api/admin/digest: send today's digest now, to the admin who asked only (to try it out). */
export const POST = adminRoute(async (req: Request) => {
  const id = adminIdOf(req);
  const { data } = id ? await serviceClient().auth.admin.getUserById(id) : { data: { user: null } };
  const email = data.user?.email;
  if (!email) return json({ error: 'Your account has no email address' }, 400);
  if (!process.env.RESEND_API_KEY) return json({ error: 'RESEND_API_KEY is not set in Vercel' }, 400);
  const d = await digestData();
  const note = await aiNote(d);
  const sent = await sendDigest([email], renderDigest(d, note));
  if (!sent) return json({ error: 'Resend did not accept the email. Check Resend → Emails.' }, 502);
  await logAction(req, { action: 'send', kind: 'digest', label: 'test digest to self' });
  return json({ ok: true, to: email, ai: Boolean(note) });
});
