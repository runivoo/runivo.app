import { adminRoute, json } from '@/lib/server/adminServer';
import { askClaude, parseJson, clip, AiError } from '@/lib/admin/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const VOICE = 'Runivo is a running and territory game in India: every street you run becomes yours, runners earn PACE and claim zones. '
  + 'Voice: warm, short, plain, confident, a little playful; no hype words, no emoji, no exclamation marks, no made-up numbers, dates or offers beyond the goal.';

/**
 * POST { kind: 'push' | 'email', goal } → a draft to edit:
 *   push  → { title (≤60), body (≤180) }
 *   email → { subject (≤80), preheader (≤90), heading (≤60), body (2-3 short paragraphs) }
 */
export const POST = adminRoute(async (req: Request) => {
  const b = await req.json().catch(() => ({})) as { kind?: string; goal?: string };
  const goal = clip(b.goal, 400);
  if (!goal) return json({ error: 'Say in a line what it’s for' }, 400);
  const email = b.kind === 'email';
  try {
    const text = await askClaude({
      system: VOICE + (email
        ? ' Write an email to people on the waitlist. Answer only JSON: {"subject": "...", "preheader": "...", "heading": "...", "body": "2 or 3 short paragraphs separated by a blank line"}.'
        : ' Write a push notification. Answer only JSON: {"title": "max 60 characters", "body": "max 180 characters"}.'),
      user: `Goal: ${goal}`,
      maxTokens: email ? 700 : 250,
    });
    const r = parseJson<Record<string, string>>(text);
    return json(email
      ? { subject: clip(r.subject, 80), preheader: clip(r.preheader, 90), heading: clip(r.heading, 60), body: clip(r.body, 2000) }
      : { title: clip(r.title, 60), body: clip(r.body, 180) });
  } catch (e) {
    return json({ error: e instanceof AiError ? e.message : 'AI draft failed' }, 502);
  }
});
