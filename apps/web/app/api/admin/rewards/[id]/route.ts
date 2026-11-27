import { adminRoute, serviceClient, json, num, logAction } from '@/lib/adminServer';
import { getImpact } from '@/lib/impact';
import { rewardPayload, rewardProblem } from '../fields';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = ['available', 'coming_soon', 'sold_out', 'hidden'] as const;

export const PATCH = adminRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = await req.json() as Record<string, unknown>;
  const db = serviceClient();
  // Reorder only.
  if (Object.keys(body).length === 1 && 'sort_order' in body) {
    const { error } = await db.from('pace_store_rewards').update({ sort_order: Math.round(num(body.sort_order) ?? 0) }).eq('id', id);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  // Status only: hide from the store / show again (the remove dialog's safer choice).
  if (Object.keys(body).length === 1 && 'status' in body) {
    const status = STATUSES.find(s => s === body.status);
    if (!status) return json({ error: 'Unknown status' }, 400);
    const { data, error } = await db.from('pace_store_rewards').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select('title').single();
    if (error) return json({ error: error.message }, 400);
    await logAction(req, { action: status === 'hidden' ? 'hide' : 'status', kind: 'reward', id, label: data?.title, details: { status } });
    return json({ ok: true });
  }
  const p = rewardPayload(body);
  const problem = rewardProblem(p);
  if (problem) return json({ error: problem }, 400);
  const { data, error } = await db.from('pace_store_rewards').update(p).eq('id', id).select().single();
  if (error) return json({ error: error.message }, 400);
  await logAction(req, { action: 'update', kind: 'reward', id, label: data?.title });
  return json({ reward: data });
});

/** Deletes only what the remove dialog allows: never a reward someone claimed or a challenge uses. */
export const DELETE = adminRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const impact = await getImpact('reward', id);
  if (!impact.exists) return json({ error: 'This reward no longer exists' }, 404);
  if (!impact.canDelete) return json({ error: impact.blockers.join(' ') + ' Hide it instead.' }, 409);
  const { error } = await serviceClient().from('pace_store_rewards').delete().eq('id', id);
  if (error) return json({ error: error.message }, 400);
  await logAction(req, { action: 'delete', kind: 'reward', id, label: impact.label, details: { effects: impact.effects.map(e => e.text), counts: impact.counts } });
  return json({ ok: true });
});
