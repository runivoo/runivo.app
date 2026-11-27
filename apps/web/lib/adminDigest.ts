import type { DigestData } from './adminStats';

/**
 * The admin's morning email (Admin PRD, phase 5). Claude writes the opening note from
 * the numbers; without ANTHROPIC_API_KEY, or if Claude is slow, a plain note is used.
 * Server only.
 */

const FONT = "Outfit,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v: number) => v.toLocaleString('en-IN');
const PLATFORM: Record<string, string> = {
  instagram: 'Instagram', x: 'X', linkedin: 'LinkedIn', facebook: 'Facebook', whatsapp: 'WhatsApp', youtube: 'YouTube',
  threads: 'Threads', reddit: 'Reddit', strava: 'Strava', email: 'Email', search: 'Search', direct: 'Direct',
  'other-site': 'Other sites', unknown: 'Unknown',
};

/** The things that need someone today, most urgent first. */
export function attentionItems(d: DigestData): string[] {
  const out: string[] = [];
  if (d.openReports) out.push(`${n(d.openReports)} open report${d.openReports === 1 ? '' : 's'} in Moderation`);
  if (d.brandsWaiting) out.push(`${n(d.brandsWaiting)} brand application${d.brandsWaiting === 1 ? '' : 's'} waiting in Partners`);
  for (const r of d.lowCodes) out.push(`${r.brand} · ${r.title}: ${r.left === 0 ? 'no codes left' : `${r.left} codes left`}`);
  if (d.flaggedRuns) out.push(`${n(d.flaggedRuns)} run${d.flaggedRuns === 1 ? '' : 's'} flagged by the cheating checks yesterday`);
  return out;
}

function plainNote(d: DigestData): string {
  const top = d.signupsByPlatform[0];
  const signups = d.signups
    ? `${n(d.signups)} people joined the waitlist yesterday${top && top.name !== 'unknown' ? `, most from ${PLATFORM[top.name] ?? top.name}` : ''}.`
    : 'Nobody joined the waitlist yesterday.';
  const todo = attentionItems(d).length ? ' A few things need you today, listed below.' : ' Nothing needs you today.';
  return signups + todo;
}

/** Two to four plain sentences from Claude about yesterday; null if unavailable. */
export async function aiNote(d: DigestData, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_FAST_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: 'You write the morning note for the founder of Runivo, a running and territory game in India that has not launched yet. '
          + 'From the JSON of yesterday\'s numbers, write 2 to 4 short plain sentences: what changed, and what needs attention today. '
          + 'Use only numbers in the JSON; never invent or estimate. No greeting, no sign-off, no emoji, no markdown, no lists.',
        messages: [{ role: 'user', content: JSON.stringify(d) }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const body = await res.json() as { content?: { type: string; text?: string }[] };
    const text = body.content?.find(c => c.type === 'text')?.text?.trim();
    return text && text.length < 1200 ? text : null;
  } catch { return null; }
}

export function renderDigest(d: DigestData, note: string | null): { subject: string; html: string; text: string } {
  const lead = note ?? plainNote(d);
  const todo = attentionItems(d);
  const subject = `Runivo · ${d.day}: ${n(d.signups)} sign-up${d.signups === 1 ? '' : 's'}${todo.length ? `, ${todo.length} to do` : ''}`;
  const platforms = d.signupsByPlatform.slice(0, 4).map(p => `${PLATFORM[p.name] ?? p.name} ${n(p.count)}`).join(' · ');
  const rows: [string, string, string][] = [
    ['Waitlist sign-ups', n(d.signups), `${n(d.waitlistTotal)} in all${platforms ? ` · ${platforms}` : ''}`],
    ['New runners', n(d.newRunners), `${n(d.runnersTotal)} in all`],
    ['Runs', n(d.runs), `${d.km.toLocaleString('en-IN')} km`],
  ];
  const row = ([label, value, sub]: [string, string, string]) => `
  <tr><td style="padding:12px 0;border-top:1px solid #E8E8E4;">
    <span style="font-size:14px;color:#55585A;">${e(label)}</span><br><span style="font-size:12px;color:#8A8C8E;">${e(sub)}</span>
  </td><td align="right" style="padding:12px 0;border-top:1px solid #E8E8E4;font-size:24px;font-weight:300;color:#17181A;">${e(value)}</td></tr>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${e(subject)}</title>
<style>@media (max-width:520px){.px{padding-left:24px!important;padding-right:24px!important}}</style></head>
<body style="margin:0;padding:0;background:#EDEDE9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDEDE9;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:20px;font-family:${FONT};color:#17181A;">
<tr><td class="px" style="padding:36px 48px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle;"><img src="https://runivo.in/email/runivo-hex.png" width="22" height="22" alt="" style="display:block;"></td>
    <td style="vertical-align:middle;padding-left:10px;font-size:18px;font-weight:300;letter-spacing:1px;">runivo <span style="color:#8A8C8E;">studio</span></td>
  </tr></table>
</td></tr>
<tr><td class="px" style="padding:28px 48px 8px;">
  <p style="margin:0 0 6px;font-size:13px;color:#8A8C8E;">${e(d.day)}</p>
  <h1 style="margin:0 0 14px;font-size:34px;line-height:1.1;font-weight:300;letter-spacing:-0.5px;">Good morning.</h1>
  <p style="margin:0;font-size:16px;line-height:1.6;color:#55585A;">${e(lead)}</p>
</td></tr>
<tr><td class="px" style="padding:20px 48px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.map(row).join('')}</table></td></tr>
${todo.length ? `<tr><td class="px" style="padding:24px 48px 0;">
  <p style="margin:0 0 8px;font-size:14px;font-weight:500;color:#17181A;">Needs you today</p>
  ${todo.map(t => `<p style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#55585A;">· ${e(t)}</p>`).join('')}
</td></tr>` : ''}
<tr><td class="px" style="padding:24px 48px 36px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#17181A;border-radius:999px;">
    <a href="https://runivo.in/admin" style="display:inline-block;padding:13px 24px;font-size:15px;font-weight:500;color:#FFFFFF;text-decoration:none;">Open Studio</a>
  </td></tr></table>
  <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#8A8C8E;">Sent every morning to Runivo admins.${note ? ' The note above is written by AI from these numbers.' : ''}</p>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [`Runivo Studio · ${d.day}`, '', lead, '',
    ...rows.map(([l, v, s]) => `${l}: ${v} (${s})`), '',
    ...(todo.length ? ['Needs you today:', ...todo.map(t => `- ${t}`), ''] : []),
    'Open Studio: https://runivo.in/admin'].join('\n');
  return { subject, html, text };
}

/** Sends the digest through Resend. Returns how many it went to. */
export async function sendDigest(to: string[], msg: { subject: string; html: string; text: string }, fetchImpl: typeof fetch = fetch): Promise<number> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.DIGEST_FROM || 'Runivo Studio <hello@runivo.in>';
  if (!key || to.length === 0) return 0;
  let sent = 0;
  for (const addr of to) {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [addr], subject: msg.subject, html: msg.html, text: msg.text }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => null);
    if (res?.ok) sent++;
  }
  return sent;
}
