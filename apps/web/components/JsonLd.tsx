import { jsonLdString } from '@/lib/seo';

/** One structured-data block (JSON-LD) for search engines. Renders nothing visible. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}
