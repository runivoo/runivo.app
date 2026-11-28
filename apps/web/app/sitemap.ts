import type { MetadataRoute } from 'next';
import { PAGES } from '@/lib/seo/pages';
import { absoluteUrl } from '@/lib/seo/seo';

// Built from the page registry (lib/seo/pages.ts), so a new page is listed as soon as it is registered.
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(p => ({
    url: absoluteUrl(p.path),
    lastModified: p.updated,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
