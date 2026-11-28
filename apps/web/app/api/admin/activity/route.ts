import { adminRoute, serviceClient, json } from '@/lib/server/adminServer';

export const dynamic = 'force-dynamic';

/** GET /api/admin/activity: the newest 200 admin actions, with who did them. */
export const GET = adminRoute(async () => {
  const db = serviceClient();
  const { data, error } = await db.from('admin_actions')
    .select('id, admin_id, action, item_kind, item_id, item_label, details, created_at')
    .order('created_at', { ascending: false }).limit(200);
  if (error) return json({ error: error.message }, 400);
  const ids = [...new Set((data ?? []).map(r => r.admin_id as string))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: people } = await db.from('profiles').select('id, username, display_name').in('id', ids);
    for (const p of people ?? []) names.set(p.id as string, (p.display_name as string) || (p.username as string) || 'Admin');
  }
  return json({ actions: (data ?? []).map(r => ({ ...r, admin_name: names.get(r.admin_id as string) ?? 'Admin' })) });
});
