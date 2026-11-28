import {
  Calculator, CalendarCheck, Coins, Gauge, Hexagon, PersonSimpleRun, ShieldCheck, Sparkle, Timer, UsersThree,
} from '@phosphor-icons/react/ssr';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

// Icons are Phosphor, the family the mobile app uses (phosphor-react-native), drawn light and in ink.

/**
 * Every link in the site's navigation, in one place. The header menu, the phone menu, the footer
 * and the sitemap all read from here, so a page added once shows up everywhere.
 */

export type FeatureSlug =
  | 'run-tracking' | 'ai-coach' | 'training-plans'
  | 'pace-rewards' | 'zones'
  | 'clubs-events' | 'privacy-safety';

/** The brand colours, used one per feature page (never as backgrounds, only for icons, numbers and links). */
export type Accent = 'green' | 'violet' | 'amber';
export const ACCENT_HEX: Record<Accent, string> = { green: '#4E7F1F', violet: '#5B4FC4', amber: '#B8690A' };

export interface FeatureNav {
  slug: FeatureSlug;
  label: string;
  /** One line shown under the label in the menu. */
  blurb: string;
  icon: PhosphorIcon;
  accent: Accent;
}

export interface FeatureGroup { label: string; items: FeatureNav[] }

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: 'Track and train',
    items: [
      { slug: 'run-tracking',   label: 'Run tracking',   blurb: 'GPS, seven sports, voice updates', icon: PersonSimpleRun, accent: 'green' },
      { slug: 'ai-coach',       label: 'PaceX AI coach', blurb: 'A debrief after every run',        icon: Sparkle, accent: 'violet' },
      { slug: 'training-plans', label: 'Training plans', blurb: '5K to marathon, built safely',     icon: CalendarCheck, accent: 'green' },
    ],
  },
  {
    label: 'Rewards and zones',
    items: [
      { slug: 'pace-rewards', label: 'PACE and the Store', blurb: 'Earn PACE, spend it on rewards', icon: Coins, accent: 'amber' },
      { slug: 'zones',        label: 'Zones',              blurb: 'Turn your routes into ground',   icon: Hexagon, accent: 'amber' },
    ],
  },
  {
    label: 'Community and privacy',
    items: [
      { slug: 'clubs-events',   label: 'Clubs and events', blurb: 'Run with others, nearby',        icon: UsersThree, accent: 'violet' },
      { slug: 'privacy-safety', label: 'Privacy and safety', blurb: 'You decide who sees what',     icon: ShieldCheck, accent: 'green' },
    ],
  },
];

export const FEATURE_NAV: FeatureNav[] = FEATURE_GROUPS.flatMap(g => g.items);

export interface ToolNav { slug: string; label: string; blurb: string; icon: PhosphorIcon }

export const TOOLS_NAV: ToolNav[] = [
  { slug: 'pace-calculator',     label: 'Pace calculator',      blurb: 'Pace, time and distance',            icon: Calculator },
  { slug: 'race-time-predictor', label: 'Race time predictor',  blurb: 'From one result to every distance',  icon: Timer },
  { slug: 'training-paces',      label: 'Training paces',       blurb: 'Easy, tempo and interval paces',     icon: Gauge },
];

/** The plain links beside the Features menu. Support lives in the footer: the bar is for helping a runner decide. */
export const TOP_LINKS: { href: string; label: string }[] = [
  { href: '/tools', label: 'Tools' },
  { href: '/blog', label: 'Guides' },
  { href: '/partners', label: 'Partners' },
];

/** Footer link columns (the Features column is built from FEATURE_NAV). */
export const FOOTER_LEARN: { href: string; label: string }[] = [
  { href: '/blog', label: 'Guides' },
  { href: '/tools', label: 'Free run tools' },
  { href: '/glossary', label: 'Running glossary' },
  { href: '/cities', label: 'Cities' },
];
