import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageShell } from '@/components/PageShell';
import { JsonLd } from '@/components/JsonLd';
import { Faq } from '@/components/Faq';
import { LinkCard } from '@/components/LinkCard';
import { EndCta } from '@/components/EndCta';
import { PaceCalculator } from '@/components/tools/PaceCalculator';
import { RacePredictor } from '@/components/tools/RacePredictor';
import { TrainingPacesTool } from '@/components/tools/TrainingPacesTool';
import { TOOL_PAGES } from '@/lib/tools';
import { TOOLS_NAV } from '@/lib/nav';
import { getPost } from '@/lib/posts';
import { faqLd, pageMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOL_PAGES.map(t => ({ slug: t.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = TOOL_PAGES.find(p => p.slug === slug);
  if (!t) return {};
  return pageMetadata({ title: t.title, description: t.description, path: `/tools/${t.slug}` });
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const t = TOOL_PAGES.find(p => p.slug === slug);
  if (!t) notFound();
  const nav = TOOLS_NAV.find(n => n.slug === t.slug)!;
  const guides = t.guides.map(getPost).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const others = TOOLS_NAV.filter(n => n.slug !== t.slug);

  return (
    <PageShell crumbs={[{ name: 'Tools', href: '/tools' }, { name: nav.label, href: `/tools/${t.slug}` }]}>
      <JsonLd data={faqLd(t.faqs)} />
      <section className="page-head plain">
        <div className="container">
          <p className="eyebrow">Free tool</p>
          <h1 className="h-page" style={{ maxWidth: 720 }}>{t.h1}</h1>
          <p className="lead" style={{ marginTop: 20, maxWidth: 560 }}>{t.lead}</p>
        </div>
      </section>

      <section className="section-sm" style={{ paddingTop: 8 }}>
        <div className="container">
          {t.slug === 'pace-calculator' && <PaceCalculator />}
          {t.slug === 'race-time-predictor' && <RacePredictor />}
          {t.slug === 'training-paces' && <TrainingPacesTool />}
          <div className="method">
            <h2>{t.method.heading}</h2>
            {t.method.paragraphs.map(p => <p key={p}>{p}</p>)}
          </div>
        </div>
      </section>

      <section className="section" id="faq" style={{ paddingTop: 24 }}>
        <div className="container faq-wrap">
          <div>
            <p className="eyebrow">Questions</p>
            <h2 className="h-section">Good to know.</h2>
          </div>
          <Faq items={t.faqs} />
        </div>
      </section>

      <section className="section-sm">
        <div className="container">
          <h2 className="block-title">Keep going</h2>
          <div className="link-cards">
            {guides.map(p => <LinkCard key={p.slug} href={`/blog/${p.slug}`} title={p.title} text={p.description} meta={`Guide · ${p.readMinutes} min read`} more="Read the guide" />)}
            {others.map(o => <LinkCard key={o.slug} href={`/tools/${o.slug}`} title={o.label} text={o.blurb} meta="Free tool" more="Open the tool" />)}
          </div>
        </div>
      </section>

      <EndCta heading="Track it for real." lead="Runivo tracks your runs with GPS and builds plans around these paces. Join the waitlist and we’ll tell you the day it reaches your city." />
    </PageShell>
  );
}
