import { str, num, isoDate, httpsUrl, oneOf } from '@/lib/server/adminServer';
import { DISCIPLINE_VALUES, EVENT_TYPE_VALUES } from '@/lib/admin/eventOptions';

/** The editable fields of an event, typed and trimmed. Anything not listed here never reaches the database. */
export function eventPayload(b: Record<string, unknown>) {
  const distance = num(b.distance_m);
  const lat = num(b.lat);
  const lng = num(b.lng);
  const source = oneOf(b.source, ['hosted', 'curated'] as const, 'hosted');
  const discipline = DISCIPLINE_VALUES.find(d => d === b.discipline) ?? null;
  return {
    title:            str(b.title, 120),
    event_type:       oneOf(b.event_type, EVENT_TYPE_VALUES, 'community-run'),
    starts_at:        isoDate(b.starts_at),
    ends_at:          isoDate(b.ends_at),
    location_name:    str(b.location_name, 160),
    distance_m:       distance == null ? null : Math.max(0, Math.round(distance)),
    description:      str(b.description, 2000),
    organizer:        str(b.organizer, 120),
    source,
    registration_url: source === 'curated' ? httpsUrl(b.registration_url) : null,
    source_name:      source === 'curated' ? str(b.source_name, 120) : null,
    discipline,
    lat:              lat != null && lat >= -90 && lat <= 90 ? lat : null,
    lng:              lng != null && lng >= -180 && lng <= 180 ? lng : null,
    image_url:        httpsUrl(b.image_url),
  };
}

export function eventProblem(p: ReturnType<typeof eventPayload>): string | null {
  if (!p.title || p.title.length < 3) return 'A title of at least 3 characters is required';
  if (!p.starts_at) return 'A start time is required';
  if (!p.location_name || p.location_name.length < 2) return 'A location is required';
  if (p.source === 'curated' && !p.registration_url) return 'Curated listings need an https registration link: it is where runners actually sign up';
  if (p.ends_at && p.ends_at <= p.starts_at) return 'The end must be after the start';
  return null;
}
