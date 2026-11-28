import { adminRoute, json } from '@/lib/server/adminServer';
import { getImpact, IMPACT_KINDS, type ImpactKind } from '@/lib/admin/impact';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/admin/impact?kind=reward&id=<uuid>: what removing it would touch (Studio's remove dialog). */
export const GET = adminRoute(async (req: Request) => {
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') as ImpactKind;
  const id = url.searchParams.get('id') ?? '';
  if (!IMPACT_KINDS.includes(kind) || !UUID.test(id)) return json({ error: 'Unknown item' }, 400);
  const impact = await getImpact(kind, id);
  if (!impact.exists) return json({ error: 'This item no longer exists' }, 404);
  return json(impact);
});
