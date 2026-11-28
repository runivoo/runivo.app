/**
 * Claude for Runivo Studio (server only). Every helper here suggests; an admin decides.
 * Needs ANTHROPIC_API_KEY in Vercel (ANTHROPIC_FAST_MODEL optional).
 */

export class AiError extends Error {}

export async function askClaude(opts: { system: string; user: string; maxTokens?: number }, fetchImpl: typeof fetch = fetch): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError('Add ANTHROPIC_API_KEY in Vercel to use AI in Studio.');
  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_FAST_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: opts.maxTokens ?? 800,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
    }),
    signal: AbortSignal.timeout(25_000),
  }).catch(() => null);
  if (!res) throw new AiError('Claude did not answer in time. Try again.');
  if (!res.ok) throw new AiError(`Claude answered ${res.status}. Try again in a minute.`);
  const body = await res.json() as { content?: { type: string; text?: string }[] };
  const text = body.content?.find(c => c.type === 'text')?.text?.trim();
  if (!text) throw new AiError('Claude sent an empty answer.');
  return text;
}

/** The first JSON object or array in Claude's answer. */
export function parseJson<T>(text: string): T {
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (start < 0 || end < start) throw new AiError('Claude did not answer in the expected format.');
  try { return JSON.parse(text.slice(start, end + 1)) as T; }
  catch { throw new AiError('Claude did not answer in the expected format.'); }
}

/** Cuts text to a length on a word boundary. */
export const clip = (s: unknown, max: number) => {
  const t = typeof s === 'string' ? s.trim() : '';
  return t.length <= max ? t : t.slice(0, max).replace(/\s+\S*$/, '').trim();
};
