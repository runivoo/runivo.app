import { str, httpsUrl } from '@/lib/adminServer';
import { slug } from '@/lib/attribution';
import type { Audience } from '@/lib/broadcast';

export function broadcastPayload(b: Record<string, unknown>) {
  const a = (b.audience && typeof b.audience === 'object' ? b.audience : {}) as Record<string, unknown>;
  const audience: Audience = { kind: 'waitlist', city: str(a.city, 80), platform: slug(a.platform, 30) };
  return {
    name: str(b.name, 100),
    subject: str(b.subject, 150),
    preheader: str(b.preheader, 150),
    heading: str(b.heading, 120),
    body: typeof b.body === 'string' ? b.body.trim().slice(0, 10000) || null : null,
    button_label: str(b.button_label, 40),
    button_url: httpsUrl(b.button_url),
    audience,
  };
}

export function broadcastProblem(p: ReturnType<typeof broadcastPayload>): string | null {
  if (!p.name) return 'Give it an internal name';
  if (!p.subject) return 'Subject is required';
  if (!p.heading) return 'Heading is required';
  if (!p.body) return 'Write the message';
  if (p.button_label && !p.button_url) return 'The button needs an https:// link';
  return null;
}
