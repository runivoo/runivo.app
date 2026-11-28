import { createHash } from 'node:crypto';
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from './site';
import { emailButton, emailDocument, escapeHtml, EMAIL_RULE } from './emailLayout';

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

// Mehtab's note in the email. Edit the words here; the tests don't depend on them.
export const FOUNDER_QUOTE =
  'For me, running is close to spiritual: just breath, rhythm and the road. Runivo keeps all of that and adds the fun. Every street you run becomes a little piece of your city.';

export function renderWaitlistEmail(city: string | null): { subject: string; html: string; text: string } {
  const where = city ? ` in ${city}` : '';
  const subject = `You're on the ${SITE_NAME} waitlist`;

  const text = [
    `You're in.`,
    ``,
    `Thanks for joining the ${SITE_NAME} waitlist${where}. We'll email you when ${SITE_NAME} opens, and now and then with big news. You can unsubscribe anytime.`,
    ``,
    `"${FOUNDER_QUOTE}"`,
    `Mehtab, Founder, ${SITE_NAME}`,
    ``,
    `Know someone who runs? Bring them along: ${SITE_URL}`,
    ``,
    `You joined the waitlist at runivo.in. If this wasn't you, ignore this email and you won't hear from us again. Questions? Just reply.`,
    ``,
    `Mehtab`,
    `${SITE_NAME}`,
  ].join('\n');

  const e = escapeHtml;
  const preheader = `We'll email you when ${SITE_NAME} opens.`;

  // Light design: white card on a soft grey, thin amber hex, Outfit Light. 56px side padding on desktop;
  // the shared media query brings it to 28px on phones.
  const rows = `<tr><td class="px" style="padding:48px 56px 36px;">
  <h1 class="h1" style="margin:0 0 20px;font-size:56px;line-height:1.05;font-weight:300;letter-spacing:-1.5px;color:#17181A;">You’re in.</h1>
  <p style="margin:0;font-size:17px;line-height:1.6;font-weight:400;color:#55585A;">Thanks for joining the ${e(SITE_NAME)} waitlist${e(where)}. We’ll email you when ${e(SITE_NAME)} opens, and now and then with big news.</p>
</td></tr>

${EMAIL_RULE}

<tr><td class="px" style="padding:36px 56px 36px;">
  <p class="quote" style="margin:0 0 20px;font-size:23px;line-height:1.45;font-weight:300;color:#17181A;">“${e(FOUNDER_QUOTE)}”</p>
  <p style="margin:0;font-size:15px;line-height:1.4;color:#17181A;font-weight:500;">Mehtab<span style="font-weight:400;color:#77797B;"> · Founder, ${e(SITE_NAME)}</span></p>
</td></tr>

${EMAIL_RULE}

<tr><td class="px" style="padding:32px 56px 0;">
  <p style="margin:0 0 20px;font-size:17px;line-height:1.5;color:#55585A;">Know someone who runs? Bring them along.</p>
  ${emailButton('Invite a running friend', SITE_URL)}
</td></tr>

<tr><td class="px" style="padding:40px 56px 44px;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:#8A8C8E;">You joined the waitlist at ${e(new URL(SITE_URL).host.replace(/^www\./, ''))}. If this wasn’t you, ignore this email and you won’t hear from us again. Questions? Just reply.</p>
</td></tr>`;

  const html = emailDocument({ title: subject, preheader, rows, mobileCss: '.h1{font-size:44px!important}.quote{font-size:20px!important}' });

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
