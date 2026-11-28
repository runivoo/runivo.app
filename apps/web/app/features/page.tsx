import type { Metadata } from 'next';
import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/ssr';
import { PageShell } from '@/components/PageShell';
import { EndCta } from '@/components/EndCta';
import { ACCENT_HEX, FEATURE_NAV } from '@/lib/nav';
import { FEATURES } from '@/lib/features';
import { pageMetadata } from '@/lib/seo';
import { staticPage } from '@/lib/pages';

export const metadata: Metadata = pageMetadata(staticPage('/features'));

export default function FeaturesPage() {
  return (
    <PageShell crumbs={[{ name: 'Features', href: '/features' }]}>
      <section className="page-head plain">
        <div className="container">
          <p className="eyebrow">Features</p>
          <h1 className="h-page" style={{ maxWidth: 760 }}>Everything Runivo does.</h1>
          <p className="lead" style={{ marginTop: 22, maxWidth: 520 }}>Tracking, coaching and rewards for people who run.</p>
        </div>
      </section>

      <section className="section-sm" style={{ paddingTop: 0 }}>
        <div className="container">
          <ul className="feature-list">
            {FEATURE_NAV.map(({ slug, label, icon: Icon, accent }) => (
              <li key={slug}>
                <Link href={`/features/${slug}`}>
                  <Icon size={32} weight="light" color={ACCENT_HEX[accent]} aria-hidden />
                  <span className="fl-text">
                    <span className="fl-title">{label}{FEATURES[slug].status === 'pilot' ? <em>Pilot</em> : null}</span>
                    <span className="fl-line">{FEATURES[slug].lead}</span>
                  </span>
                  <CaretRight size={18} weight="bold" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <p className="also" style={{ marginTop: 40 }}>
            Not here yet: an Android app, and connections to Garmin, COROS and Polar watches.
          </p>
        </div>
      </section>

      <EndCta />
    </PageShell>
  );
}
