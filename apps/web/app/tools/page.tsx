import type { Metadata } from 'next';
import { PageShell } from '@/components/layout/PageShell';
import { LinkCard } from '@/components/ui/LinkCard';
import { EndCta } from '@/components/ui/EndCta';
import { TOOLS_NAV } from '@/lib/nav';
import { TOOL_PAGES } from '@/lib/tools';
import { pageMetadata } from '@/lib/seo';
import { staticPage } from '@/lib/pages';

export const metadata: Metadata = pageMetadata(staticPage('/tools'));

export default function ToolsPage() {
  return (
    <PageShell crumbs={[{ name: 'Tools', href: '/tools' }]}>
      <section className="page-head plain">
        <div className="container">
          <p className="eyebrow">Tools</p>
          <h1 className="h-page" style={{ maxWidth: 720 }}>Free tools for runners.</h1>
          <p className="lead" style={{ marginTop: 20, maxWidth: 540 }}>
            Three calculators for pace, race times and training paces. No sign-up, and every page explains how the numbers are worked out.
          </p>
        </div>
      </section>
      <section className="section-sm" style={{ paddingTop: 8 }}>
        <div className="container">
          <div className="link-cards">
            {TOOLS_NAV.map(t => {
              const page = TOOL_PAGES.find(p => p.slug === t.slug)!;
              return (
                <LinkCard
                  key={t.slug} href={`/tools/${t.slug}`} title={t.label} text={page.lead} more="Open the tool"
                />
              );
            })}
          </div>
        </div>
      </section>
      <EndCta />
    </PageShell>
  );
}
