import {
  BarChart3, BellRing, Calendar, Flag, Handshake, LayoutDashboard, ListChecks, ShoppingBag, Trophy,
  type LucideIcon,
} from 'lucide-react';

/** The admin's sections. The order here is the order in the sidebar. */
export type AdminTab =
  | 'overview'
  | 'moderation' | 'races'
  | 'partners' | 'store' | 'reports' | 'campaigns'
  | 'events' | 'waitlist';

export interface NavItem { id: AdminTab; label: string; Icon: LucideIcon }
export interface NavGroup { label: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Studio',
    items: [
      { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
    ],
  },
  {
    label: 'Review',
    items: [
      { id: 'moderation', label: 'Moderation', Icon: Flag },
      { id: 'races',      label: 'Races',      Icon: Trophy },
    ],
  },
  {
    label: 'Store',
    items: [
      { id: 'partners',  label: 'Partners',   Icon: Handshake },
      { id: 'store',     label: 'PACE Store', Icon: ShoppingBag },
      { id: 'reports',   label: 'Reports',    Icon: BarChart3 },
      { id: 'campaigns', label: 'Campaigns',  Icon: BellRing },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'events',     label: 'Events',     Icon: Calendar },
      { id: 'waitlist',   label: 'Waitlist',   Icon: ListChecks },
    ],
  },
];

export const DEFAULT_TAB: AdminTab = 'overview';

const IDS = NAV_GROUPS.flatMap(g => g.items.map(i => i.id));
export function asTab(value: string | null | undefined): AdminTab | null {
  return IDS.find(id => id === value) ?? null;
}
