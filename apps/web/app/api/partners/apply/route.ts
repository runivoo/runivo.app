import { serviceClient, str, json } from '@/lib/server/adminServer';
import { makeLimiter, EMAIL_RE } from '@/lib/server/rateLimit';
import { guardPublicForm } from '@/lib/server/publicForm';
import { SUPPORT_EMAIL } from '@/lib/config/site';

export const dynamic = 'force-dynamic';

/**
 * Public partner application (runivo.in/partners): company, contact name, work
 * email and website. No sign-in: it writes one partners row with status 'applied'
 * through submit_partner_application, which validates again and caps applications
 * per email per day. The team contacts the brand and fills in the rest in the admin.
 * Errors are never returned verbatim.
 */

// Per-IP limit: 5 applications per 10 minutes per server instance.
// The database cap (3 per email per day) is the real guard.
const rateLimited = makeLimiter(10 * 60 * 1000, 5);

export async function POST(req: Request): Promise<Response> {
  const guarded = await guardPublicForm(req, rateLimited, 'Too many applications from here. Try again in a few minutes.');
  if (guarded instanceof Response) return guarded;
  const body = guarded;

  const name = str(body.name, 120);
  const contactName = str(body.contact_name, 120);
  const email = str(body.contact_email, 200)?.toLowerCase() ?? null;
  const websiteRaw = str(body.website, 300);
  const website = websiteRaw && /^https?:\/\//i.test(websiteRaw) ? websiteRaw : websiteRaw ? `https://${websiteRaw}` : null;

  const missing: string[] = [];
  if (!name || name.length < 2) missing.push('your company name');
  if (!email || !EMAIL_RE.test(email)) missing.push('a valid email');
  if (missing.length) {
    return json({ ok: false, error: `Please add ${missing.join(' and ')}.` }, 400);
  }

  try {
    // The offer, category, stock and cities are worked out with the brand after we get in touch.
    const { error } = await serviceClient().rpc('submit_partner_application', {
      p_name: name,
      p_category: null,
      p_contact_name: contactName,
      p_contact_email: email,
      p_website: website,
      p_countries: null,
      p_cities: null,
      p_offer: null,
      p_estimated_stock: null,
    });
    if (error) {
      if (/rate_limited/.test(error.message)) {
        return json({ ok: false, error: 'We already have your applications from today. We’ll be in touch.' }, 429);
      }
      if (/invalid/.test(error.message)) {
        return json({ ok: false, error: 'Some details look wrong. Check the form and try again.' }, 400);
      }
      console.error('[partners/apply]', error.message);
      return json({ ok: false, error: `Something went wrong. Please try again, or email ${SUPPORT_EMAIL}.` }, 500);
    }
  } catch (e) {
    console.error('[partners/apply]', e);
    return json({ ok: false, error: `Something went wrong. Please try again, or email ${SUPPORT_EMAIL}.` }, 500);
  }

  return json({ ok: true }, 201);
}
