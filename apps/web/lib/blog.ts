import type { FeatureSlug } from './nav';

/**
 * Guides. Each post is a module in content/blog (a small header plus the body in markdown) and is
 * listed in content/blog/index.ts. No file reading at run time, so it works the same in the
 * build, the dev server and the tests.
 */

export const CATEGORIES = ['Getting started', 'Training', 'Health and safety', 'Using Runivo'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface PostSource {
  slug: string;
  /** 50 characters or fewer. */
  title: string;
  /** 70 to 160 characters. */
  description: string;
  category: Category;
  /** ISO dates. */
  published: string;
  updated: string;
  /** The feature page this post explains or leads to. */
  feature?: FeatureSlug;
  /** Tool slugs worth linking at the end. */
  tools?: string[];
  /** Slugs of other posts to suggest next. */
  next?: string[];
  /** Markdown: ## and ### headings, paragraphs, - and 1. lists, > callouts, **bold**, *italic* and [links](/path). */
  body: string;
}

export interface Post extends PostSource { readMinutes: number }

export const categorySlug = (c: Category): string => c.toLowerCase().replace(/[^a-z]+/g, '-');

export function readMinutes(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function withReadTime(p: PostSource): Post {
  return { ...p, readMinutes: readMinutes(p.body) };
}
