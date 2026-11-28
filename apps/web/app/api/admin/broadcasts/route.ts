import { adminRoute, adminIdOf, serviceClient, json, logAction } from '@/lib/server/adminServer';
import { broadcastPayload, broadcastProblem } from './fields';

export const dynamic = 'force-dynamic';

/** GET: broadcasts (newest first) and the cities/platforms an audience can be narrowed to. POST: a new draft. */
export const GET = adminRoute(async () => {
  const db = serviceClient();
  const [{ data, error }, { data: wl }] = await Promise.all([
    db.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(100),
    db.from('waitlist').select('city, platform').limit(20000),
  ]);
  if (error) return json({ error: error.message }, 500);
  const tally = (key: 'city' | 'platform') => {
    const m = new Map<string, number>();
    for (const r of wl ?? []) {
      const v = (r[key] as string | null)?.trim();
      const k = key === 'city' ? (v ? v.replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null) : (v ?? 'unknown');
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 30);
  };
  return json({ broadcasts: data ?? [], cities: tally('city'), platforms: tally('platform') });
});

export const POST = adminRoute(async (req: Request) => {
  const p = broadcastPayload(await req.json());
  const problem = broadcastProblem(p);
  if (problem) return json({ error: problem }, 400);
  const { data, error } = await serviceClient().from('broadcasts').insert({ ...p, created_by: adminIdOf(req) ?? null }).select().single();
  if (error) return json({ error: error.message }, 400);
  await logAction(req, { action: 'create', kind: 'broadcast', id: data.id, label: data.name });
  return json({ broadcast: data }, 201);
});
