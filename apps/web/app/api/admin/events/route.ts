import { adminRoute, serviceClient, json, logAction } from '@/lib/server/adminServer';
import { eventPayload, eventProblem } from './fields';

export const dynamic = 'force-dynamic';

/** All events, newest first. */
export const GET = adminRoute(async () => {
  const { data, error } = await serviceClient().from('events').select('*').order('starts_at', { ascending: false }).limit(500);
  if (error) return json({ error: error.message }, 500);
  return json({ events: data ?? [] });
});

/** Create an event. It starts live with nobody signed up. */
export const POST = adminRoute(async (req) => {
  const p = eventPayload(await req.json());
  const problem = eventProblem(p);
  if (problem) return json({ error: problem }, 400);
  const { data, error } = await serviceClient().from('events').insert({ ...p, is_active: true, participant_count: 0 }).select().single();
  if (error) return json({ error: error.message }, 400);
  await logAction(req, { action: 'create', kind: 'event', id: data.id, label: data.title });
  return json({ event: data }, 201);
});
