import { json } from './adminServer';
import { clientIp } from './rateLimit';

/**
 * The steps every public form route (waitlist, partner application) starts with, in one place:
 * read a JSON object, drop bots that fill the hidden "company_url" field, and apply the per-IP limit.
 * Returns the body to carry on with, or the Response to send straight back.
 */
export async function guardPublicForm(
  req: Request,
  limited: (key: string) => boolean,
  tooManyMessage: string,
): Promise<Record<string, unknown> | Response> {
  let body: Record<string, unknown>;
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('bad body');
    body = raw as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'Please send the form again.' }, 400);
  }

  // Honeypot: real people never fill the hidden field. Answer as if it worked so bots learn nothing.
  if (typeof body.company_url === 'string' && body.company_url.trim() !== '') return json({ ok: true });

  if (limited(clientIp(req))) return json({ ok: false, error: tooManyMessage }, 429);
  return body;
}
