import { createHash } from 'node:crypto';
import { SITE_NAME, SUPPORT_EMAIL } from './site';

/**
 * Welcome email for the pre-launch waitlist, sent through Resend's HTTP API
 * (no SDK). Server only.
 *
 * Env (Vercel → Project Settings → Environment Variables):
 *   RESEND_API_KEY   a Resend API key with "Sending access"
 *   WAITLIST_FROM    e.g. 'Mehtab from Runivo <mehtab@runivo.in>'; the domain must be verified in Resend
 *   WAITLIST_REPLY_TO  optional; replies go here (defaults to SUPPORT_EMAIL)
 *
 * Without the first two it does nothing, so the waitlist keeps working while
 * email is not set up. It never throws: a failed email must not fail a sign-up.
 */

export type WaitlistEmailResult = 'sent' | 'skipped' | 'failed';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Images are served by the website itself (apps/web/public/email), so they load
// once runivo.in is live. Email apps don't render SVG or web fonts reliably, so the
// layout is tables + inline styles, PNG images, and Outfit with system fallbacks.
const SITE_URL = 'https://runivo.in';
const FONT = "Outfit,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

// Mehtab's note in the email. Edit the words here; the tests don't depend on them.
export const FOUNDER_QUOTE =
  'For me, running is close to spiritual: just breath, rhythm and the road. Runivo keeps all of that and adds the fun. Every street you run becomes a little piece of your city.';

export function renderWaitlistEmail(city: string | null): { subject: string; html: string; text: string } {
  const where = city ? ` in ${city}` : '';
  const opensIn = city ? ` in ${city}` : ' in your city';
  const subject = `You're on the ${SITE_NAME} waitlist`;

  const text = [
    `You're in.`,
    ``,
    `Thanks for joining the ${SITE_NAME} waitlist${where}. We'll email you once more, the day ${SITE_NAME} opens${opensIn}. Nothing in between.`,
    ``,
    `"${FOUNDER_QUOTE}"`,
    ``,
    `Streets go to whoever runs them first. Bring your crew on day one: ${SITE_URL}`,
    ``,
    `If this wasn't you, ignore this email and you won't hear from us again. Questions? Just reply.`,
    ``,
    `Mehtab`,
    `${SITE_NAME}`,
  ].join('\n');

  const e = escapeHtml;
  const preheader = `We'll email you once more, the day ${SITE_NAME} opens${opensIn}.`;

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${e(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#E3E6DF;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#E3E6DF;">${e(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E3E6DF;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#F4F5F1;border-radius:16px;font-family:${FONT};color:#17181A;">

<tr><td style="padding:28px 28px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle;"><img src="${SITE_URL}/email/runivo-icon.png" width="36" height="36" alt="" style="display:block;border-radius:9px;"></td>
    <td style="vertical-align:middle;padding-left:10px;font-size:22px;font-weight:700;letter-spacing:-0.5px;">runivo</td>
  </tr></table>
</td></tr>

<tr><td style="padding:20px 12px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#17181A;border-radius:20px;">
    <tr><td style="padding:0;"><img src="${SITE_URL}/email/hex-banner.png" width="576" alt="" style="display:block;width:100%;max-width:576px;height:auto;border-radius:20px 20px 0 0;"></td></tr>
    <tr><td style="padding:8px 28px 32px;">
      <h1 style="margin:0 0 12px;font-size:40px;line-height:1.05;font-weight:700;letter-spacing:-1px;color:#FFFFFF;">You’re in.</h1>
      <p style="margin:0;font-size:17px;line-height:1.5;color:#C9CCC5;">Thanks for joining the ${e(SITE_NAME)} waitlist${e(where)}. We’ll email you once more, the day ${e(SITE_NAME)} opens${e(opensIn)}. Nothing in between.</p>
    </td></tr>
  </table>
</td></tr>

<tr><td style="padding:12px 12px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:20px;">
    <tr><td style="padding:28px 28px 26px;">
      <p style="margin:0 0 6px;font-size:56px;line-height:0.8;font-weight:700;color:#7DBA3C;">“</p>
      <p style="margin:0 0 20px;font-size:21px;line-height:1.4;font-weight:500;letter-spacing:-0.2px;">${e(FOUNDER_QUOTE)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:44px;height:44px;border-radius:22px;background:#4E7F1F;color:#FFFFFF;font-size:18px;font-weight:600;text-align:center;vertical-align:middle;">M</td>
        <td style="padding-left:12px;font-size:15px;line-height:1.4;font-weight:600;">Mehtab<br><span style="font-size:13px;font-weight:400;color:#5F635D;">Founder, ${e(SITE_NAME)}</span></td>
      </tr></table>
    </td></tr>
  </table>
</td></tr>

<tr><td style="padding:28px 28px 0;">
  <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#5F635D;">Streets go to whoever runs them first. Bring your crew on day one.</p>
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="background:#4E7F1F;border-radius:999px;"><a href="${SITE_URL}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;">Invite a running friend</a></td>
  </tr></table>
</td></tr>

<tr><td style="padding:32px 28px 28px;">
  <p style="margin:0;border-top:1px solid #E2E4DE;padding-top:18px;font-size:12px;line-height:1.6;color:#666A64;">You joined the waitlist at runivo.in. If this wasn’t you, ignore this email and you won’t hear from us again. Questions? Just reply.</p>
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
