import { str, num, list, isoDate, oneOf, httpsUrl } from '@/lib/adminServer';

export const CHALLENGE_METRICS = ['distance_km', 'zones', 'active_days'] as const;
export const CHALLENGE_STATUSES = ['draft', 'live', 'ended'] as const;

/** Only whitelisted, typed fields reach public.sponsored_challenges. */
export function challengePayload(b: Record<string, unknown>) {
  const color = str(b.brand_color, 7);
  return {
    partner_id:  str(b.partner_id, 40),
    brand:       str(b.brand, 60),
    brand_color: color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : null,
    title:       str(b.title, 80),
    description: str(b.description, 400),
    image_url:   httpsUrl(b.image_url),
    metric:      oneOf(b.metric, CHALLENGE_METRICS, 'distance_km'),
    target:      num(b.target),
    starts_at:   isoDate(b.starts_at),
    ends_at:     isoDate(b.ends_at),
    reward_id:   str(b.reward_id, 40),
    countries:   list(b.countries)?.map(c => c.toUpperCase()) ?? null,
    status:      oneOf(b.status, CHALLENGE_STATUSES, 'draft'),
  };
}

export function challengeProblem(p: ReturnType<typeof challengePayload>): string | null {
  if (!p.brand) return 'Brand name is required';
  if (!p.title || p.title.length < 3) return 'Title needs at least 3 characters';
  if (!p.target || p.target <= 0) return 'Goal must be more than 0';
  if (!p.starts_at || !p.ends_at) return 'Start and end dates are required';
  if (new Date(p.ends_at) <= new Date(p.starts_at)) return 'The end must be after the start';
  if (!p.reward_id) return 'Pick the reward runners win';
  return null;
}
