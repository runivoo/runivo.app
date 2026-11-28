import { FEATURE_LIST } from '../../content/features';
import { TOOL_PAGES } from '../../content/tools';
import { CITIES } from '../../content/cities';
import { POSTS } from '../content/posts';

/**
 * Every page that search engines should index: its title, description and last-changed date.
 * The sitemap, the share images and the page metadata all read from here, and seo tests check it.
 */

export interface PageEntry {
  path: string;
  title: string;
  description: string;
  /** The small label on the share image. */
  kicker: string;
  /** ISO date. */
  updated: string;
  priority: number;
  changeFrequency: 'weekly' | 'monthly' | 'yearly';
  /** Titles on the home page are used as written; the rest get " — Runivo" added. */
  absolute?: boolean;
}

const SITE_UPDATED = '2026-11-28';

export const STATIC_PAGES: PageEntry[] = [
  {
    path: '/', title: 'Runivo: run smarter with an AI running coach', absolute: true, kicker: 'Runivo',
    description: 'A GPS running app with PaceX, an AI coach, and PACE rewards you can spend in the PACE Store. Join the waitlist.',
    updated: SITE_UPDATED, priority: 1, changeFrequency: 'weekly',
  },
  {
    path: '/features', title: 'Features: everything Runivo does', kicker: 'Features',
    description: 'GPS run tracking, the PaceX AI coach, training plans, PACE rewards, zones, clubs and privacy controls. See what Runivo does, feature by feature.',
    updated: SITE_UPDATED, priority: 0.9, changeFrequency: 'monthly',
  },
  {
    path: '/tools', title: 'Free running tools', kicker: 'Tools',
    description: 'Free running calculators: pace, race time prediction and training paces. No sign-up, nothing to install, and the sums are explained.',
    updated: SITE_UPDATED, priority: 0.8, changeFrequency: 'monthly',
  },
  {
    path: '/blog', title: 'Running guides', kicker: 'Guides',
    description: 'Practical guides for runners: starting out, training, staying safe in Indian conditions, and how Runivo works. Written by the Runivo team.',
    updated: SITE_UPDATED, priority: 0.8, changeFrequency: 'weekly',
  },
  {
    path: '/glossary', title: 'Running glossary', kicker: 'Glossary',
    description: 'Plain-language definitions of running terms: easy run, tempo, intervals, negative split, taper, cadence and more, plus Runivo’s own terms like PACE.',
    updated: SITE_UPDATED, priority: 0.6, changeFrequency: 'monthly',
  },
  {
    path: '/cities', title: 'Running in India’s cities', kicker: 'Cities',
    description: 'Runivo is opening city by city: Bengaluru, Mumbai, Delhi, Pune, Hyderabad, Chennai and Kolkata. Where to run, when, and how to join the waitlist.',
    updated: SITE_UPDATED, priority: 0.7, changeFrequency: 'monthly',
  },
  {
    path: '/partners', title: 'Partners', kicker: 'Partners',
    description: 'Be part of India’s running wave. Put your brand in the Runivo PACE Store, in front of runners in your city who have earned a reward.',
    updated: SITE_UPDATED, priority: 0.7, changeFrequency: 'monthly',
  },
  {
    path: '/support', title: 'Support', kicker: 'Support',
    description: 'Get help with Runivo: answers to common questions, troubleshooting and how to contact the team.',
    updated: SITE_UPDATED, priority: 0.6, changeFrequency: 'monthly',
  },
  {
    path: '/privacy', title: 'Privacy Policy', kicker: 'Legal',
    description: 'How Runivo collects, uses and protects your data, what is shared with service providers, and the choices you have.',
    updated: SITE_UPDATED, priority: 0.3, changeFrequency: 'yearly',
  },
  {
    path: '/terms', title: 'Terms of Service', kicker: 'Legal',
    description: 'The terms and conditions for using the Runivo app and website, including accounts, PACE and what we expect from the community.',
    updated: SITE_UPDATED, priority: 0.3, changeFrequency: 'yearly',
  },
];

export const staticPage = (path: string): PageEntry => {
  const p = STATIC_PAGES.find(x => x.path === path);
  if (!p) throw new Error(`No static page registered for ${path}`);
  return p;
};

export const PAGES: PageEntry[] = [
  ...STATIC_PAGES,
  ...FEATURE_LIST.map<PageEntry>(f => ({
    path: `/features/${f.slug}`, title: f.title, description: f.description, kicker: 'Feature',
    updated: f.updated, priority: 0.8, changeFrequency: 'monthly',
  })),
  ...TOOL_PAGES.map<PageEntry>(t => ({
    path: `/tools/${t.slug}`, title: t.title, description: t.description, kicker: 'Free tool',
    updated: t.updated, priority: 0.7, changeFrequency: 'monthly',
  })),
  ...POSTS.map<PageEntry>(p => ({
    path: `/blog/${p.slug}`, title: p.title, description: p.description, kicker: p.category,
    updated: p.updated, priority: 0.6, changeFrequency: 'monthly',
  })),
  ...CITIES.map<PageEntry>(c => ({
    path: `/cities/${c.slug}`, title: c.title, description: c.description, kicker: 'City guide',
    updated: c.updated, priority: 0.6, changeFrequency: 'monthly',
  })),
];

export const pageByPath = (path: string): PageEntry | undefined => PAGES.find(p => p.path === path);
