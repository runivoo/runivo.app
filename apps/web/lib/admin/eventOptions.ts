/**
 * The choices for an event in Studio, shared by the form (components/admin/sections/EventsSection.tsx) and the
 * server check (app/api/admin/events/fields.ts). They mirror the CHECK constraints on public.events
 * (events_event_type_check, events_discipline_check).
 */
export const EVENT_TYPES = [
  { value: 'community-run',   label: 'Community run' },
  { value: 'race',            label: 'Race' },
  { value: 'challenge',       label: 'Challenge' },
  { value: 'brand-challenge', label: 'Brand challenge' },
  { value: 'king-of-hill',    label: 'King of the hill' },
  { value: 'survival',        label: 'Survival run' },
] as const;

// Real-world sport taxonomy, deliberately separate from EVENT_TYPES (which mixes categories with in-app modes).
export const DISCIPLINES = [
  { value: 'marathon',      label: 'Marathon' },
  { value: 'half_marathon', label: 'Half marathon' },
  { value: '10k',           label: '10K' },
  { value: '5k',            label: '5K' },
  { value: 'cyclothon',     label: 'Cyclothon' },
  { value: 'triathlon',     label: 'Triathlon' },
  { value: 'trail_run',     label: 'Trail run' },
  { value: 'community_run', label: 'Community run' },
  { value: 'other',         label: 'Other' },
] as const;

export const EVENT_TYPE_VALUES = EVENT_TYPES.map(t => t.value);
export const DISCIPLINE_VALUES = DISCIPLINES.map(d => d.value);
