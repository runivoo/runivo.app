import { adminRoute, serviceClient, json, logAction, oneOf } from '@/lib/adminServer';
import { getImpact } from '@/lib/impact';
import { challengePayload, challengeProblem, CHALLENGE_STATUSES } from '../fields';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Edit a challenge, or change only its status ({ status }: go live, end early). */
export const PATCH = adminRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = await req.json() as Record<string, unknown>;
  const db = serviceClient();
  if (Object.keys(body).length === 1 && 'status' in body) {
    const status = oneOf(body.status, CHALLENGE_STATUSES, 'draft');
    const { data, error } = await db.from('sponsored_challenges').update({ status }).eq('id', id).select('title').single();
    if (error) return json({ error: error.message }, 400);
    await logAction(req, { action: status === 'ended' ? 'end' : 'status', kind: 'challenge', id, label: data?.title, details: { status } });
    return json({ ok: true });
  }
  const p = challengePayload(body);
  const problem = challengeProblem(p);
  if (problem) return json({ error: problem }, 400);
  const { data, error } = await db.from('sponsored_challenges').update(p).eq('id', id).select().single();
  if (error) return json({ error: error.message }, 400);
  await logAction(req, { action: 'update', kind: 'challenge', id, label: data?.title });
  return json({ challenge: data });
});

/** Only a challenge nobody joined can be deleted; otherwise it's ended early (codes already won stay valid). */
export const DELETE = adminRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const impact = await getImpact('challenge', id);
  if (!impact.exists) return json({ error: 'This challenge no longer exists' }, 404);
  if (!impact.canDelete) return json({ error: impact.blockers.join(' ') + ' End it early instead.' }, 409);
  const { error } = await serviceClient().from('sponsored_challenges').delete().eq('id', id);
  if (error) return json({ error: error.message }, 400);
  await logAction(req, { action: 'delete', kind: 'challenge', id, label: impact.label });
  return json({ ok: true });
});
