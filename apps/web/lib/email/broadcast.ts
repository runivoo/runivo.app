import { serviceClient } from '../server/adminServer';
import { SUPPORT_EMAIL } from '../config/site';
import { DEFAULT_FROM, emailButton, emailDocument, escapeHtml as esc } from './emailLayout';

const fromAddress = () => process.env.BROADCAST_FROM || process.env.WAITLIST_FROM || DEFAULT_FROM;

/**
 * Email broadcasts (Admin PRD, phase 5). Studio writes them; Resend's marketing feature
 * sends them to a segment, adds the unsubscribe link and skips anyone who unsubscribed.
 * Needs RESEND_ADMIN_KEY (full access: segments, contacts, broadcasts). Server only.
 */

export interface Broadcast {
  id: string; name: string; subject: string; preheader: string | null; heading: string; body: string;
  button_label: string | null; button_url: string | null; audience: Audience;
  status: 'draft' | 'syncing' | 'sent' | 'failed'; recipients: number | null; synced: number;
  resend_segment_id: string | null; resend_broadcast_id: string | null; created_at: string; sent_at: string | null;
}
export interface Audience { kind: 'waitlist'; city?: string | null; platform?: string | null }

// ── Email ─────────────────────────────────────────────────────────────────────
export const UNSUBSCRIBE = '{{{RESEND_UNSUBSCRIBE_URL}}}';

/** The broadcast in Runivo's light email design. `unsubscribeUrl` is Resend's placeholder when sending, '#' for tests. */
export function renderBroadcast(b: Pick<Broadcast, 'subject' | 'preheader' | 'heading' | 'body' | 'button_label' | 'button_url'>, unsubscribeUrl = UNSUBSCRIBE) {
  const paragraphs = b.body.trim().split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const button = b.button_label && b.button_url?.startsWith('https://')
    ? `<tr><td class="px" style="padding:8px 56px 0;">${emailButton(b.button_label, b.button_url)}</td></tr>`
    : '';
  const rows = `<tr><td class="px" style="padding:40px 56px 12px;">
  <h1 class="h1" style="margin:0 0 18px;font-size:44px;line-height:1.08;font-weight:300;letter-spacing:-1px;">${esc(b.heading)}</h1>
  ${paragraphs.map(p => `<p style="margin:0 0 16px;font-size:17px;line-height:1.6;color:#55585A;">${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n  ')}
</td></tr>
${button}
<tr><td class="px" style="padding:36px 56px 0;"><div style="border-top:1px solid #E8E8E4;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="px" style="padding:20px 56px 40px;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:#8A8C8E;">You’re getting this because you joined the Runivo waitlist. <a href="${unsubscribeUrl}" style="color:#8A8C8E;text-decoration:underline;">Unsubscribe</a>. Questions? Write to <a href="mailto:${SUPPORT_EMAIL}" style="color:#8A8C8E;text-decoration:underline;">${SUPPORT_EMAIL}</a>.</p>
</td></tr>`;
  const html = emailDocument({ title: b.subject, preheader: b.preheader, rows, topPadding: 44, mobileCss: '.h1{font-size:38px!important}' });
  const text = [b.heading, '', ...paragraphs.flatMap(p => [p, '']),
    ...(button ? [`${b.button_label}: ${b.button_url}`, ''] : []),
    `Unsubscribe: ${unsubscribeUrl}`].join('\n');
  return { html, text };
}

// ── Audience ──────────────────────────────────────────────────────────────────
function audienceQuery(a: Audience, select: string, head = false) {
  let q = serviceClient().from('waitlist').select(select, head ? { count: 'exact', head: true } : { count: 'exact' });
  if (a.city) q = q.ilike('city', a.city.replace(/[%_]/g, ''));
  if (a.platform) q = a.platform === 'unknown' ? q.is('platform', null) : q.eq('platform', a.platform);
  return q;
}

export async function audienceCount(a: Audience): Promise<number> {
  const { count, error } = await audienceQuery(a, 'id', true);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** One page of recipient emails, oldest sign-ups first (a stable order for chunked syncing). */
export async function audiencePage(a: Audience, offset: number, limit: number): Promise<string[]> {
  const { data, error } = await audienceQuery(a, 'email').order('created_at', { ascending: true }).order('id').range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as { email: string }[]).map(r => r.email);
}

// ── Resend ────────────────────────────────────────────────────────────────────
export class ResendError extends Error {}

async function resend<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
  const key = process.env.RESEND_ADMIN_KEY;
  if (!key) throw new ResendError('Add a full-access Resend key as RESEND_ADMIN_KEY in Vercel to send broadcasts.');
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const out = await res.json().catch(() => ({})) as T & { message?: string };
  if (res.status === 401 || res.status === 403) throw new ResendError('RESEND_ADMIN_KEY can only send. Create a key with Full access in Resend.');
  if (!res.ok) throw new ResendError(out.message ?? `Resend answered ${res.status}`);
  return out;
}

export const createSegment = (name: string) => resend<{ id: string }>('/segments', { name: name.slice(0, 100) });

/**
 * Puts an email in the segment. A new contact is created inside it; an existing one is
 * added to it. "unsubscribed" is never sent, so nobody who unsubscribed is opted back in.
 */
export async function addToSegment(email: string, segmentId: string): Promise<void> {
  try {
    await resend('/contacts', { email, segments: [{ id: segmentId }] });
  } catch (e) {
    if (e instanceof ResendError && /RESEND_ADMIN_KEY/.test(e.message)) throw e;
    await resend(`/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`, {});
  }
}

export function createAndSendBroadcast(b: Broadcast, segmentId: string) {
  const { html, text } = renderBroadcast(b);
  return resend<{ id: string }>('/broadcasts', {
    segment_id: segmentId,
    from: fromAddress(),
    subject: b.subject, html, text, name: `Studio: ${b.name}`.slice(0, 100), send: true,
  });
}

/** A test copy to one address, through the normal sending route (unsubscribe link shown, not live). */
export async function sendTest(b: Broadcast, to: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new ResendError('RESEND_API_KEY is not set in Vercel');
  const { html, text } = renderBroadcast(b, '#');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromAddress(),
      to: [to], subject: `[Test] ${b.subject}`, html, text,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new ResendError(`Resend answered ${res.status}`);
}
