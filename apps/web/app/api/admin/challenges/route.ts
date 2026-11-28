import { adminRoute, serviceClient, json, logAction } from '@/lib/server/adminServer';
import { challengePayload, challengeProblem } from './fields';

export const dynamic = 'force-dynamic';

/** GET: every challenge with how many runners joined and finished. POST: create one. */
export const GET = adminRoute(async () => {
  const db = serviceClient();
  const { data, error } = await db.from('sponsored_challenges').select('*').order('starts_at', { ascending: false });
  if (error) return json({ error: error.message }, 500);
  const ids = (data ?? []).map(c => c.id as string);
  const counts: Record<string, { joined: number; completed: number }> = {};
  if (ids.length) {
    const { data: entries } = await db.from('sponsored_challenge_entries').select('challenge_id, completed_at').in('challenge_id', ids);
    for (const e of entries ?? []) {
      const c = (counts[e.challenge_id as string] ??= { joined: 0, completed: 0 });
      c.joined++;
      if (e.completed_at) c.completed++;
    }
  }
  return json({ challenges: (data ?? []).map(c => ({ ...c, ...(counts[c.id as string] ?? { joined: 0, completed: 0 }) })) });
});

export const POST = adminRoute(async (req: Request) => {
  const p = challengePayload(await req.json());
  const problem = challengeProblem(p);
  if (problem) return json({ error: problem }, 400);
  const { data, error } = await serviceClient().from('sponsored_challenges').insert(p).select().single();
  if (error) return json({ error: error.message }, 400);
  await logAction(req, { action: 'create', kind: 'challenge', id: data?.id, label: data?.title });
  return json({ challenge: data }, 201);
});
