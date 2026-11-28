import { POSTS } from '@/lib/posts';
import { absoluteUrl } from '@/lib/seo';
import { SITE_NAME } from '@/lib/site';

export const dynamic = 'force-static';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** GET /blog/rss.xml: the guides as an RSS feed. */
export function GET(): Response {
  const items = POSTS.map(p => `    <item>
      <title>${esc(p.title)}</title>
      <link>${absoluteUrl(`/blog/${p.slug}`)}</link>
      <guid isPermaLink="true">${absoluteUrl(`/blog/${p.slug}`)}</guid>
      <pubDate>${new Date(p.published).toUTCString()}</pubDate>
      <description>${esc(p.description)}</description>
    </item>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(SITE_NAME)} guides</title>
    <link>${absoluteUrl('/blog')}</link>
    <description>Practical guides for runners from the Runivo team.</description>
    <language>en-in</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
