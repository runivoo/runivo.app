import { adminRoute, adminIdOf, serviceClient, json } from '@/lib/adminServer';
import { sendTest, ResendError, type Broadcast } from '@/lib/broadcast';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** POST: send a test copy to the admin who asked. */
export const POST = adminRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const db = serviceClient();
  const { data: b } = await db.from('broadcasts').select('*').eq('id', id).maybeSingle();
  if (!b) return json({ error: 'Broadcast not found' }, 404);
  const adminId = adminIdOf(req);
  const { data } = adminId ? await db.auth.admin.getUserById(adminId) : { data: { user: null } };
  if (!data.user?.email) return json({ error: 'Your account has no email address' }, 400);
  try { await sendTest(b as Broadcast, data.user.email); }
  catch (e) { return json({ error: e instanceof ResendError ? e.message : 'Could not send the test' }, 502); }
  return json({ ok: true, to: data.user.email });
});
