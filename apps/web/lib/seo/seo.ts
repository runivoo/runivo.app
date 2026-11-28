import type { Metadata } from 'next';
import { INSTAGRAM_URL, SITE_NAME, SITE_URL, SUPPORT_EMAIL } from '../config/site';

/**
 * Search and sharing helpers: canonical addresses, page metadata and structured data (JSON-LD).
 * Everything here is plain data in, plain data out, so it is unit-tested (seo.test.ts).
 */

export const absoluteUrl = (path: string): string => (path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`);

/** The share image for a page is drawn by app/og/[...path]/route.tsx. The home page is "home". */
export const ogImagePath = (path: string): string => `/og${path === '/' ? '/home' : path}`;

export interface PageMeta {
  /** Page title without the site name (the layout adds " — Runivo"). Aim for 50 characters or fewer. */
  title: string;
  /** 70 to 160 characters. */
  description: string;
  path: string;
  /** Use the title as it is, without " — Runivo" added (the home page). */
  absolute?: boolean;
  /** For articles. ISO dates. */
  publishedTime?: string;
  modifiedTime?: string;
}

/** Metadata for one page: title, description, canonical address, Open Graph and Twitter card. */
export function pageMetadata({ title, description, path, absolute, publishedTime, modifiedTime }: PageMeta): Metadata {
  const url = absoluteUrl(path);
  const image = { url: ogImagePath(path), width: 1200, height: 630, alt: title };
  const fullTitle = absolute ? title : `${title} — ${SITE_NAME}`;
  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle, description, url, siteName: SITE_NAME, locale: 'en_IN',
      ...(publishedTime
        ? { type: 'article' as const, publishedTime, ...(modifiedTime ? { modifiedTime } : {}) }
        : { type: 'website' as const }),
      images: [image],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: [image.url] },
  };
}

/* ── Structured data ───────────────────────────────────────────────────────── */

type Json = Record<string, unknown>;
const CONTEXT = 'https://schema.org';

export function organizationLd(): Json {
  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon.png`,
    sameAs: INSTAGRAM_URL ? [INSTAGRAM_URL] : [],
    contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer support', email: SUPPORT_EMAIL }],
  };
}

export function websiteLd(): Json {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: 'en-IN',
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

/** Only emitted once the app is in the store (see components/PageShell.tsx); before that there is nothing to install. */
export function mobileAppLd(storeUrl: string): Json {
  return {
    '@context': CONTEXT,
    '@type': 'MobileApplication',
    name: SITE_NAME,
    operatingSystem: 'iOS',
    applicationCategory: 'HealthApplication',
    description: 'A GPS running app with an AI coach and PACE rewards.',
    downloadUrl: storeUrl,
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

export interface Crumb { name: string; href: string }

export function breadcrumbLd(crumbs: Crumb[]): Json {
  const all: Crumb[] = [{ name: 'Home', href: '/' }, ...crumbs];
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: all.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absoluteUrl(c.href) })),
  };
}

export function faqLd(items: readonly (readonly [string, string])[]): Json {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}

export function articleLd(a: { title: string; description: string; path: string; published: string; modified: string }): Json {
  return {
    '@context': CONTEXT,
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    mainEntityOfPage: absoluteUrl(a.path),
    datePublished: a.published,
    dateModified: a.modified,
    image: absoluteUrl(ogImagePath(a.path)),
    author: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-IN',
  };
}

export function definedTermSetLd(terms: readonly { term: string; id: string; definition: string }[]): Json {
  return {
    '@context': CONTEXT,
    '@type': 'DefinedTermSet',
    name: 'Running glossary',
    url: absoluteUrl('/glossary'),
    hasDefinedTerm: terms.map(t => ({
      '@type': 'DefinedTerm', name: t.term, description: t.definition, url: `${absoluteUrl('/glossary')}#${t.id}`,
    })),
  };
}

/** JSON for a <script type="application/ld+json"> tag. "<" is escaped so the data can never close the tag. */
export function jsonLdString(data: Json): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
