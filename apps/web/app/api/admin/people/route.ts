import { adminRoute, serviceClient, json, logAction } from '@/lib/adminServer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/people?q=&page=&export=1
 * Every account with its email (public.admin_people, migration 017). Admins only; the
 * response is never cached. An export (up to 5,000 rows) is recorded in the activity log.
 */
export const GET = adminRoute(async (req: Request) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100) || null;
  const exporting = url.searchParams.get('export') === '1';
  const page = Math.max(0, Math.floor(Number(url.searchParams.get('page') ?? 0)) || 0);
  const limit = exporting ? 5000 : 50;
  const { data, error } = await serviceClient().rpc('admin_people', { p_query: q, p_limit: limit, p_offset: exporting ? 0 : page * limit });
  if (error) return json({ error: error.message }, 400);
  const result = data as { total: number; people: unknown[] };
  if (exporting) {
    await logAction(req, { action: 'export', kind: 'people', label: q ? `search "${q}"` : 'everyone', details: { rows: result.people.length } });
  }
  return json({ ...result, page, pageSize: limit });
});
