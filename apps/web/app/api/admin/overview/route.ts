import { adminRoute, serviceClient, json } from '@/lib/adminServer';
import { renderWaitlistEmail } from '@/lib/waitlistEmail';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/overview: the Studio's first page.
 *   - app and waitlist numbers: public.admin_overview() (migration 015)
 *   - welcome-email delivery: Resend's list of sent emails, counted by their latest event.
 *     Reading it needs a full-access Resend key (RESEND_ADMIN_KEY); a sending-only key
 *     can't, and the page says so instead of showing zeros.
 */

type EmailStats = {
  available: boolean;
  reason?: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  other: number;
  capped: boolean;
};

const PAGE = 100;
const MAX_PAGES = 20; // 2,000 most recent emails; enough before launch, and fast
const CACHE_MS = 5 * 60_000;
let emailCache: { at: number; stats: EmailStats } | null = null;

async function welcomeEmailStats(): Promise<EmailStats> {
  if (emailCache && Date.now() - emailCache.at < CACHE_MS) return emailCache.stats;
  const empty: EmailStats = { available: false, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0, other: 0, capped: false };

  const key = process.env.RESEND_ADMIN_KEY;
  if (!key) return { ...empty, reason: 'Add a full-access Resend key as RESEND_ADMIN_KEY in Vercel to see email delivery.' };

  const subject = renderWaitlistEmail(null).subject;
  const stats: EmailStats = { ...empty, available: true };
  let after: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `https://api.resend.com/emails?limit=${PAGE}${after ? `&after=${encodeURIComponent(after)}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
    if (res.status === 401 || res.status === 403) {
      return { ...empty, reason: 'RESEND_ADMIN_KEY can only send emails. Create a key with Full access in Resend and use that.' };
    }
    if (!res.ok) return { ...empty, reason: `Resend answered ${res.status}. Try again in a minute.` };
    const body = await res.json() as { data?: { id: string; subject?: string; last_event?: string }[]; has_more?: boolean };
    const rows = body.data ?? [];
    for (const e of rows) {
      if (e.subject !== subject) continue;
      stats.sent++;
      switch (e.last_event) {
        // Events move forward (sent → delivered → opened → clicked), so a later event implies the earlier ones.
        case 'clicked':    stats.clicked++; stats.opened++; stats.delivered++; break;
        case 'opened':     stats.opened++; stats.delivered++; break;
        case 'delivered':  stats.delivered++; break;
        case 'bounced':    stats.bounced++; break;
        case 'complained': stats.complained++; stats.delivered++; break;
        default:           stats.other++; // sent, queued, delayed, failed
      }
    }
    if (!body.has_more || rows.length === 0) break;
    after = rows[rows.length - 1].id;
    if (page === MAX_PAGES - 1) stats.capped = true;
  }
  emailCache = { at: Date.now(), stats };
  return stats;
}

const LOW_CODES = 10;

/** Live code-pool rewards with fewer than LOW_CODES unused codes: top them up before runners see "sold out". */
async function lowCodeRewards() {
  const db = serviceClient();
  const { data: rewards } = await db.from('pace_store_rewards').select('id, title, brand').eq('status', 'available').eq('code_mode', 'pool');
  if (!rewards?.length) return [];
  const { data: codes } = await db.from('reward_codes').select('reward_id').in('reward_id', rewards.map(r => r.id)).is('assigned_to', null);
  const left = new Map<string, number>();
  for (const c of codes ?? []) left.set(c.reward_id as string, (left.get(c.reward_id as string) ?? 0) + 1);
  return rewards
    .map(r => ({ id: r.id as string, title: r.title as string, brand: r.brand as string, left: left.get(r.id as string) ?? 0 }))
    .filter(r => r.left < LOW_CODES)
    .sort((a, b) => a.left - b.left);
}

export const GET = adminRoute(async () => {
  const [{ data, error }, email, lowCodes] = await Promise.all([
    serviceClient().rpc('admin_overview'),
    welcomeEmailStats().catch((): EmailStats => ({
      available: false, reason: 'Could not reach Resend.', sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0, other: 0, capped: false,
    })),
    lowCodeRewards().catch(() => []),
  ]);
  if (error) return json({ error: error.message }, 400);
  return json({ ...(data as Record<string, unknown>), email, lowCodes });
});
