import { createHash } from 'node:crypto';
import { SITE_NAME, SUPPORT_EMAIL } from './site';

/**
 * Welcome email for the pre-launch waitlist, sent through Resend's HTTP API
 * (no SDK). Server only.
 *
 * Env (Vercel → Project Settings → Environment Variables):
 *   RESEND_API_KEY   a Resend API key with "Sending access"
 *   WAITLIST_FROM    e.g. 'Runivo <hello@runivo.in>'; the domain must be verified in Resend
 *   WAITLIST_REPLY_TO  optional; replies go here (defaults to SUPPORT_EMAIL)
 *
 * Without the first two it does nothing, so the waitlist keeps working while
 * email is not set up. It never throws: a failed email must not fail a sign-up.
 */

export type WaitlistEmailResult = 'sent' | 'skipped' | 'failed';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function renderWaitlistEmail(city: string | null): { subject: string; html: string; text: string } {
  const where = city ? ` in ${city}` : '';
  const subject = `You're on the ${SITE_NAME} waitlist`;

  const text = [
    `You're on the list.`,
    ``,
    `Thanks for joining the ${SITE_NAME} waitlist${where}. We'll email you once more, the day ${SITE_NAME} opens${city ? ` in ${city}` : ' in your city'}. Nothing in between.`,
    ``,
    `If this wasn't you, ignore this email and you won't hear from us again. Questions? Just reply.`,
    ``,
    `${SITE_NAME}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#f6f5f1;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f1;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1b1d1a;">
      <tr><td>
        <p style="margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#5f635d;">${escapeHtml(SITE_NAME)}</p>
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;">You're on the list.</h1>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.55;">Thanks for joining the ${escapeHtml(SITE_NAME)} waitlist${escapeHtml(where)}. We'll email you once more, the day ${escapeHtml(SITE_NAME)} opens${city ? ` in ${escapeHtml(city)}` : ' in your city'}. Nothing in between.</p>
        <p style="margin:0;font-size:13px;line-height:1.5;color:#5f635d;">If this wasn't you, ignore this email and you won't hear from us again. Questions? Just reply.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  return { subject, html, text };
}

export async function sendWaitlistWelcome(
  email: string,
  city: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<WaitlistEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.WAITLIST_FROM;
  if (!apiKey || !from) return 'skipped';

  const { subject, html, text } = renderWaitlistEmail(city);
  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Resend de-duplicates the same key for 24 h, so a retry never sends it twice.
        'Idempotency-Key': `waitlist-welcome-${createHash('sha256').update(email).digest('hex').slice(0, 32)}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        reply_to: process.env.WAITLIST_REPLY_TO || SUPPORT_EMAIL,
        subject,
        html,
        text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      // Status only: the response can echo the address.
      console.error('[waitlist-email] Resend answered', res.status);
      return 'failed';
    }
    return 'sent';
  } catch (e) {
    console.error('[waitlist-email] could not reach Resend', e instanceof Error ? e.name : 'error');
    return 'failed';
  }
}
