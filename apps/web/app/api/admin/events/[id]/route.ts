import { adminRoute, serviceClient, json, logAction } from '@/lib/server/adminServer';
import { getImpact } from '@/lib/admin/impact';
import { eventPayload, eventProblem } from '../fields';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Show or hide an event ({ is_active }: the remove dialog's safer choice), or save an edit (the event's fields). */
export const PATCH = adminRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = await req.json() as Record<string, unknown>;
  const db = serviceClient();

  if (Object.keys(body).length === 1 && 'is_active' in body) {
    if (typeof body.is_active !== 'boolean') return json({ error: 'is_active must be true or false' }, 400);
    const { data, error } = await db.from('events').update({ is_active: body.is_active }).eq('id', id).select('title').single();
    if (error) return json({ error: error.message }, 400);
    await logAction(req, { action: body.is_active ? 'show' : 'hide', kind: 'event', id, label: data?.title });
    return json({ ok: true });
  }

  const p = eventPayload(body);
  const problem = eventProblem(p);
  if (problem) return json({ error: problem }, 400);
  const { data, error } = await db.from('events').update(p).eq('id', id).select().single();
  if (error) return json({ error: error.message }, 400);
  await logAction(req, { action: 'edit', kind: 'event', id, label: data.title });
  return json({ event: data });
});

/** Deletes an event after the admin has seen who it affects. Linked races stay (migration 016). */
export const DELETE = adminRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const impact = await getImpact('event', id);
  if (!impact.exists) return json({ error: 'This event no longer exists' }, 404);
  const { error } = await serviceClient().from('events').delete().eq('id', id);
  if (error) return json({ error: error.message }, 400);
  await logAction(req, { action: 'delete', kind: 'event', id, label: impact.label, details: { effects: impact.effects.map(e => e.text), counts: impact.counts } });
  return json({ ok: true });
});
