import { serviceClient } from './adminServer';

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
const FONT = "Outfit,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const UNSUBSCRIBE = '{{{RESEND_UNSUBSCRIBE_URL}}}';

/** The broadcast in Runivo's light email design. `unsubscribeUrl` is Resend's placeholder when sending, '#' for tests. */
export function renderBroadcast(b: Pick<Broadcast, 'subject' | 'preheader' | 'heading' | 'body' | 'button_label' | 'button_url'>, unsubscribeUrl = UNSUBSCRIBE) {
  const paragraphs = b.body.trim().split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const button = b.button_label && b.button_url?.startsWith('https://') ? `
<tr><td class="px" style="padding:8px 56px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#17181A;border-radius:999px;">
    <a href="${esc(b.button_url)}" style="display:inline-block;padding:15px 28px;font-size:16px;font-weight:500;color:#FFFFFF;text-decoration:none;">${esc(b.button_label)}</a>
  </td></tr></table>
</td></tr>` : '';
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(b.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500&display=swap" rel="stylesheet">
<style>@media (max-width:520px){.px{padding-left:28px!important;padding-right:28px!important}.h1{font-size:38px!important}}</style></head>
<body style="margin:0;padding:0;background:#EDEDE9;">
${b.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#EDEDE9;">${esc(b.preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDEDE9;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:20px;font-family:${FONT};color:#17181A;">
<tr><td class="px" style="padding:44px 56px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle;"><img src="https://runivo.in/email/runivo-hex.png" width="24" height="24" alt="" style="display:block;"></td>
    <td style="vertical-align:middle;padding-left:12px;font-size:20px;font-weight:300;letter-spacing:1px;">runivo</td>
  </tr></table>
</td></tr>
<tr><td class="px" style="padding:40px 56px 12px;">
  <h1 class="h1" style="margin:0 0 18px;font-size:44px;line-height:1.08;font-weight:300;letter-spacing:-1px;">${esc(b.heading)}</h1>
  ${paragraphs.map(p => `<p style="margin:0 0 16px;font-size:17px;line-height:1.6;color:#55585A;">${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n  ')}
</td></tr>
${button}
<tr><td class="px" style="padding:36px 56px 0;"><div style="border-top:1px solid #E8E8E4;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="px" style="padding:20px 56px 40px;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:#8A8C8E;">You’re getting this because you joined the Runivo waitlist at runivo.in. <a href="${unsubscribeUrl}" style="color:#8A8C8E;text-decoration:underline;">Unsubscribe</a>. Questions? Write to <a href="mailto:runivo.official@gmail.com" style="color:#8A8C8E;text-decoration:underline;">runivo.official@gmail.com</a>.</p>
</td></tr>
</table></td></tr></table></body></html>`;
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
    from: process.env.BROADCAST_FROM || process.env.WAITLIST_FROM || 'Runivo <hello@runivo.in>',
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
      from: process.env.BROADCAST_FROM || process.env.WAITLIST_FROM || 'Runivo <hello@runivo.in>',
      to: [to], subject: `[Test] ${b.subject}`, html, text,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new ResendError(`Resend answered ${res.status}`);
}
