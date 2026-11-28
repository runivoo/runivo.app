import type { Metadata } from 'next';
import { PageShell } from '@/components/layout/PageShell';
import { LinkCard } from '@/components/ui/LinkCard';
import { EndCta } from '@/components/ui/EndCta';
import { CITIES } from '@/content/cities';
import { pageMetadata } from '@/lib/seo/seo';
import { staticPage } from '@/lib/seo/pages';

export const metadata: Metadata = pageMetadata(staticPage('/cities'));

export default function CitiesPage() {
  return (
    <PageShell crumbs={[{ name: 'Cities', href: '/cities' }]}>
      <section className="page-head plain">
        <div className="container">
          <p className="eyebrow">Cities</p>
          <h1 className="h-page" style={{ maxWidth: 760 }}>Runivo is opening city by city.</h1>
          <p className="lead" style={{ marginTop: 20, maxWidth: 580 }}>
            Seven cities first. For each one, a short guide to where runners go and when to run, and a waitlist for the day Runivo opens there.
          </p>
        </div>
      </section>
      <section className="section-sm" style={{ paddingTop: 8 }}>
        <div className="container">
          <div className="link-cards">
            {CITIES.map(c => <LinkCard key={c.slug} href={`/cities/${c.slug}`} title={c.name} text={c.intro.split('. ')[0] + '.'} meta={c.state} more={`Running in ${c.name}`} />)}
          </div>
        </div>
      </section>
      <EndCta heading="Not on the list?" lead="Tell us your city when you join the waitlist. Where people ask, we open next." />
    </PageShell>
  );
}
