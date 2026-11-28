import { adminRoute, json } from '@/lib/server/adminServer';
import { askClaude, parseJson, clip, AiError } from '@/lib/admin/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Verdict = 'spam' | 'harmful' | 'probably_fine' | 'needs_human';
const VERDICTS: Verdict[] = ['spam', 'harmful', 'probably_fine', 'needs_human'];

/**
 * POST { items: [{ key, kind, preview, reasons, report_count }] } → { results: { [key]: { verdict, reason } } }
 * Claude sorts the open reports; nothing is removed or banned here. Only the reported
 * text and the report reasons are sent, never who reported it or the author's account.
 */
export const POST = adminRoute(async (req: Request) => {
  const body = await req.json().catch(() => ({})) as { items?: unknown[] };
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 40).map(raw => {
    const i = raw as Record<string, unknown>;
    return {
      key: clip(i.key, 120), kind: clip(i.kind, 30), text: clip(i.preview, 400),
      reasons: Array.isArray(i.reasons) ? i.reasons.slice(0, 5).map(r => clip(r, 60)) : [], reports: Number(i.report_count) || 1,
    };
  }).filter(i => i.key);
  if (!items.length) return json({ results: {} });
  try {
    const text = await askClaude({
      system: 'You help moderate Runivo, a running app in India. For each reported item decide: "spam" (ads, scams, link drops), '
        + '"harmful" (harassment, hate, threats, sexual content, personal data, self-harm), "probably_fine" (normal running talk; the report looks mistaken), '
        + 'or "needs_human" (unclear, context needed, or a profile/club with no text). Be cautious: if unsure, say needs_human. '
        + 'Answer only JSON: [{"key": "...", "verdict": "...", "reason": "max 15 words"}].',
      user: JSON.stringify(items),
      maxTokens: 1500,
    });
    const out = parseJson<{ key: string; verdict: string; reason: string }[]>(text);
    const keys = new Set(items.map(i => i.key));
    const results: Record<string, { verdict: Verdict; reason: string }> = {};
    for (const r of Array.isArray(out) ? out : []) {
      if (!keys.has(r.key)) continue;
      results[r.key] = { verdict: VERDICTS.includes(r.verdict as Verdict) ? r.verdict as Verdict : 'needs_human', reason: clip(r.reason, 140) };
    }
    return json({ results });
  } catch (e) {
    return json({ error: e instanceof AiError ? e.message : 'AI sorting failed' }, 502);
  }
});
