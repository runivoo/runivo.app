import { adminRoute, serviceClient, json, logAction } from '@/lib/adminServer';
import { broadcastPayload, broadcastProblem } from '../fields';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Edit a draft. Once sending has started, a broadcast can't change. */
export const PATCH = adminRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const p = broadcastPayload(await req.json());
  const problem = broadcastProblem(p);
  if (problem) return json({ error: problem }, 400);
  const { data, error } = await serviceClient().from('broadcasts')
    .update({ ...p, updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'draft').select().maybeSingle();
  if (error) return json({ error: error.message }, 400);
  if (!data) return json({ error: 'Only drafts can be edited' }, 409);
  await logAction(req, { action: 'update', kind: 'broadcast', id, label: data.name });
  return json({ broadcast: data });
});

/** Delete a draft (sent broadcasts stay as a record). */
export const DELETE = adminRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { data, error } = await serviceClient().from('broadcasts').delete().eq('id', id).eq('status', 'draft').select('name').maybeSingle();
  if (error) return json({ error: error.message }, 400);
  if (!data) return json({ error: 'Only drafts can be deleted' }, 409);
  await logAction(req, { action: 'delete', kind: 'broadcast', id, label: data.name });
  return json({ ok: true });
});
