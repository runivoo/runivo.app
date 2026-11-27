import { adminRoute, serviceClient, json } from '@/lib/adminServer';
import { renderWaitlistEmail } from '@/lib/waitlistEmail';
import { lowCodeRewards } from '@/lib/adminStats';

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
