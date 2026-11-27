import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side admin access. The service-role key never reaches the browser:
 * admin pages call /api/admin/* with the signed-in admin's access token, and
 * these route handlers check that token belongs to a profile with
 * subscription_tier = 'admin' before acting with the service role.
 *
 * Import this only from app/api route handlers (never from a client component).
 * Needs SUPABASE_SERVICE_ROLE_KEY (server env only, no NEXT_PUBLIC_ prefix).
 */

let _service: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  if (_service) return _service;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set on the server');
  _service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _service;
}

export class AdminError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Returns the admin's user id, or throws AdminError(401/403). */
export async function requireAdmin(req: Request): Promise<string> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new AdminError(401, 'Sign in required');
  const db = serviceClient();
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) throw new AdminError(401, 'Sign in required');
  const { data: profile } = await db.from('profiles').select('subscription_tier').eq('id', user.id).single();
  if (profile?.subscription_tier !== 'admin') throw new AdminError(403, 'Admins only');
  return user.id;
}

export function json(body: unknown, status = 200): Response {
  // no-store: admin data (emails, reports) is never kept by the browser, a proxy or a CDN.
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private' },
  });
}

// The signed-in admin for a request that passed adminRoute's check.
const ADMIN_OF = new WeakMap<Request, string>();

/**
 * Records an admin change in public.admin_actions (Studio → Activity).
 * Never throws: a failed log line must not undo or fail the change itself.
 */
export async function logAction(req: Request, entry: {
  action: string; kind: string; id?: string | null; label?: string | null; details?: Record<string, unknown>;
}): Promise<void> {
  const adminId = ADMIN_OF.get(req);
  if (!adminId) return;
  const { error } = await serviceClient().from('admin_actions').insert({
    admin_id: adminId,
    action: entry.action.slice(0, 40),
    item_kind: entry.kind.slice(0, 40),
    item_id: entry.id ?? null,
    item_label: entry.label ? entry.label.slice(0, 200) : null,
    details: entry.details ?? {},
  });
  if (error) console.error('[admin log]', error.message);
}

/** Wraps a handler: admin check, JSON errors, never leaks stack traces. */
export function adminRoute<A extends unknown[]>(
  fn: (req: Request, ...args: A) => Promise<Response>,
): (req: Request, ...args: A) => Promise<Response> {
  return async (req, ...args) => {
    try {
      ADMIN_OF.set(req, await requireAdmin(req));
      return await fn(req, ...args);
    } catch (e) {
      if (e instanceof AdminError) return json({ error: e.message }, e.status);
      console.error('[admin api]', e);
      return json({ error: e instanceof Error ? e.message : 'Server error' }, 500);
    }
  };
}

// ── Input helpers: only whitelisted, typed fields reach the database ──────────

export function str(v: unknown, max = 500): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

export function num(v: unknown): number | null {
  if (v === '' || v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function list(v: unknown, max = 50): string[] | null {
  const items = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  const out = items.map(x => String(x).trim()).filter(Boolean).slice(0, max);
  return out.length ? out : null;
}

/** An https URL (an uploaded image), or null. Anything else is dropped. */
export function httpsUrl(v: unknown): string | null {
  return typeof v === 'string' && /^https:\/\/[^\s"'<>]+$/.test(v.trim()) ? v.trim().slice(0, 500) : null;
}

export function isoDate(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}
