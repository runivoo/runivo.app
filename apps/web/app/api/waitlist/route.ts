import { serviceClient, str, json } from '@/lib/adminServer';
import { after } from 'next/server';
import { makeLimiter, clientIp, EMAIL_RE } from '@/lib/rateLimit';
import { sendWaitlistWelcome } from '@/lib/waitlistEmail';
import { platformOf, referrerHost, slug, type Touch } from '@/lib/attribution';

export const dynamic = 'force-dynamic';

/**
 * Public waitlist sign-up (runivo.in). No sign-in: it adds one row through
 * join_waitlist, which validates again and never saves an address twice (the
 * email column is unique). A repeat address is answered with alreadyJoined: true
 * so the form can say "you're already on the waitlist". That does tell a visitor
 * whether a given address is on the list; the per-IP limit below and the hourly
 * cap in join_waitlist keep it from being used to scan for addresses. Errors are
 * never returned verbatim.
 *
 * A new address also gets a welcome email (lib/waitlistEmail.ts), sent after the
 * response so the form is not slowed down. A repeat address gets nothing, so the
 * form cannot be used to mail someone over and over.
 */

// Per-IP limit: 6 sign-ups per 10 minutes per server instance.
const rateLimited = makeLimiter(10 * 60 * 1000, 6);

const SOURCES = ['web', 'invite', 'club', 'run', 'partners'] as const;

export async function POST(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('bad body');
    body = raw as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'Please send the form again.' }, 400);
  }

  // Honeypot: real people never fill the hidden "company_url" field.
  if (typeof body.company_url === 'string' && body.company_url.trim() !== '') {
    return json({ ok: true });
  }

  if (rateLimited(clientIp(req))) {
    return json({ ok: false, error: 'Too many tries from here. Please wait a few minutes.' }, 429);
  }

  const email = str(body.email, 200)?.toLowerCase() ?? null;
  const city = str(body.city, 80);
  const source = typeof body.source === 'string' && (SOURCES as readonly string[]).includes(body.source) ? body.source : 'web';

  if (!email || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'Please enter a valid email.' }, 400);
  }

  try {
    // Where they came from (migration 019): the platform is worked out here, not taken from the browser.
    const t = (body.touch && typeof body.touch === 'object' ? body.touch : {}) as Touch;
    const { data: isNew, error } = await serviceClient().rpc('join_waitlist', {
      p_email: email, p_city: city, p_source: source,
      p_platform: platformOf(t), p_campaign: slug(t.campaign, 60), p_medium: slug(t.medium, 30), p_referrer: referrerHost(t.referrer),
    });
    if (error) {
      if (/rate_limited/.test(error.message)) {
        return json({ ok: false, error: 'We are getting a lot of sign-ups right now. Please try again in an hour.' }, 429);
      }
      if (/invalid/.test(error.message)) {
        return json({ ok: false, error: 'Please check your email and try again.' }, 400);
      }
      console.error('[waitlist]', error.message);
      return json({ ok: false, error: 'Something went wrong. Please try again.' }, 500);
    }
    if (isNew === false) return json({ ok: true, alreadyJoined: true });
    if (isNew === true) after(() => sendWaitlistWelcome(email, city));
  } catch (e) {
    console.error('[waitlist]', e);
    return json({ ok: false, error: 'Something went wrong. Please try again.' }, 500);
  }

  return json({ ok: true }, 201);
}
