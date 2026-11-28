import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { JsonLd } from '@/components/JsonLd';
import { Faq } from '@/components/Faq';
import { LinkCard } from '@/components/LinkCard';
import { EndCta } from '@/components/EndCta';
import { GetAppLink } from '@/components/GetAppLink';
import { FEATURE_NAV, TOOLS_NAV, type FeatureSlug } from '@/lib/nav';
import { FEATURES } from '@/lib/features';
import { getPost } from '@/lib/posts';
import { faqLd, pageMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return FEATURE_NAV.map(f => ({ slug: f.slug }));
}

type Props = { params: Promise<{ slug: string }> };

function find(slug: string) {
  return slug in FEATURES ? FEATURES[slug as FeatureSlug] : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const f = find((await params).slug);
  if (!f) return {};
  return pageMetadata({ title: f.title, description: f.description, path: `/features/${f.slug}` });
}

export default async function FeaturePage({ params }: Props) {
  const f = find((await params).slug);
  if (!f) notFound();
  const nav = FEATURE_NAV.find(i => i.slug === f.slug)!;
  const guides = f.guides.map(getPost).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const tools = TOOLS_NAV.filter(t => f.tools.includes(t.slug));
  const related = f.related.map(s => FEATURE_NAV.find(i => i.slug === s)!);

  return (
    <PageShell crumbs={[{ name: 'Features', href: '/features' }, { name: nav.label, href: `/features/${f.slug}` }]}>
      <JsonLd data={faqLd(f.faqs)} />

      <div className={`toned tone-${nav.accent}`}>
      <section className="page-head">
        <div className="container">
          <p className="eyebrow">{nav.label}{f.status === 'pilot' ? ' · Pilot' : ''}</p>
          <h1 className="h-page" style={{ maxWidth: 820 }}>{f.h1}</h1>
          <p className="lead" style={{ marginTop: 22, maxWidth: 560 }}>{f.lead}</p>
          <div className="actions">
            <GetAppLink className="btn btn-dark" waitlistHref="#waitlist" live="Download for iPhone" />
          </div>
          <dl className="specs">
            {f.facts.map(([value, label]) => (
              <div key={label} className="spec">
                <dt className="spec-value">{value}</dt>
                <dd className="spec-label">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section-sm" style={{ paddingTop: 0 }}>
        <div className="container">
          {f.sections.map(s => (
            <div key={s.heading} className="sec">
              <h2 className="sec-title">{s.heading}</h2>
              <div className="sec-body">
                {s.intro && <p className="sec-intro">{s.intro}</p>}
                {s.items && (
                  <ul className="rows">
                    {s.items.map(([title, text]) => (
                      <li key={title}><h3>{title}</h3><p>{text}</p></li>
                    ))}
                  </ul>
                )}
                {s.lines && <ul className="rows plain">{s.lines.map(l => <li key={l}><p>{l}</p></li>)}</ul>}
                {s.link && <p className="also" style={{ marginTop: 20 }}><Link href={s.link[1]}>{s.link[0]}</Link></p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="faq" style={{ paddingTop: 24 }}>
        <div className="container faq-wrap">
          <h2 className="h-section">Good to know.</h2>
          <Faq items={f.faqs} />
        </div>
      </section>

      {(guides.length > 0 || tools.length > 0) && (
        <section className="section-sm">
          <div className="container">
            <div className="link-cards">
              {guides.map(p => (
                <LinkCard key={p.slug} href={`/blog/${p.slug}`} title={p.title} text={p.description} meta="Guide" />
              ))}
              {tools.map(t => (
                <LinkCard key={t.slug} href={`/tools/${t.slug}`} title={t.label} text={t.blurb} meta="Free tool" more="Open" />
              ))}
            </div>
            <p className="also">
              More features:{' '}
              {related.map((r, i) => (
                <span key={r.slug}>{i > 0 && ' · '}<Link href={`/features/${r.slug}`}>{r.label}</Link></span>
              ))}
            </p>
          </div>
        </section>
      )}

      <EndCta />
      </div>
    </PageShell>
  );
}
