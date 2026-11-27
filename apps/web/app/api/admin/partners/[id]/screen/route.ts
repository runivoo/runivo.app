import { adminRoute, serviceClient, json } from '@/lib/adminServer';
import { askClaude, parseJson, clip, AiError } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** POST → { summary, fit (1-5), why, questions[] }: Claude's read of a brand application. Advice only. */
export const POST = adminRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { data: p } = await serviceClient().from('partners')
    .select('name, category, website, offer, cities, countries, estimated_stock, billing_model, notes').eq('id', id).maybeSingle();
  if (!p) return json({ error: 'Partner not found' }, 404);
  try {
    const text = await askClaude({
      system: 'You screen brand partners for Runivo, a running and territory game launching in Indian cities (first Bengaluru). '
        + 'Runners earn PACE by running and spend it on brand rewards. Good partners: running shoes and gear, sports nutrition, cafes near running routes, physios, races, gyms. '
        + 'Judge only from the application; do not invent facts about the company. '
        + 'Answer only JSON: {"summary": "max 25 words", "fit": 1-5, "why": "max 25 words", "questions": ["up to 3 short questions to ask them"]}.',
      user: JSON.stringify(p),
      maxTokens: 500,
    });
    const r = parseJson<{ summary?: string; fit?: number; why?: string; questions?: string[] }>(text);
    return json({
      summary: clip(r.summary, 200),
      fit: Math.min(5, Math.max(1, Math.round(Number(r.fit) || 3))),
      why: clip(r.why, 200),
      questions: (Array.isArray(r.questions) ? r.questions : []).slice(0, 3).map(q => clip(q, 140)).filter(Boolean),
    });
  } catch (e) {
    return json({ error: e instanceof AiError ? e.message : 'AI screening failed' }, 502);
  }
});
