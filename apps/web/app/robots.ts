import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config/site';

// Public marketing pages are indexable. The admin, API and one-off link pages
// (invites, club and runner links, the live safety page) are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/invite', '/club/', '/r/', '/live', '/reset-password'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
