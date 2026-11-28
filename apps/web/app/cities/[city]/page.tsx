import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { LinkCard } from '@/components/ui/LinkCard';
import { WaitlistForm } from '@/components/forms/WaitlistForm';
import { GetAppLink } from '@/components/ui/GetAppLink';
import { CITIES, getCity } from '@/content/cities';
import { getPost } from '@/lib/content/posts';
import { APP_LIVE } from '@/lib/config/site';
import { pageMetadata } from '@/lib/seo/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return CITIES.map(c => ({ city: c.slug }));
}

type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getCity((await params).city);
  if (!c) return {};
  return pageMetadata({ title: c.title, description: c.description, path: `/cities/${c.slug}` });
}

export default async function CityPage({ params }: Props) {
  const c = getCity((await params).city);
  if (!c) notFound();
  const guides = ['running-in-indian-heat-humidity-monsoon', 'running-safely-routes-sharing-private-places', 'easy-runs-slow-pace']
    .map(getPost).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <PageShell crumbs={[{ name: 'Cities', href: '/cities' }, { name: c.name, href: `/cities/${c.slug}` }]}>
      <section className="page-head">
        <div className="container head-grid">
          <div>
            <p className="eyebrow">{c.state}</p>
            <h1 className="h-page">Running in {c.name}.</h1>
            <p className="lead">{c.intro}</p>
          </div>
          <div className="card" id="waitlist">
            <h2 style={{ fontSize: 22, letterSpacing: '-0.03em', marginBottom: 8 }}>Runivo is coming to {c.name}.</h2>
            <p className="muted" style={{ fontSize: 15.5, marginBottom: 18 }}>
              {c.name} is one of our seven launch cities. Partner rewards in the PACE Store switch on city by city as partners join. Join the waitlist and we’ll tell you the day it opens here.
            </p>
            {APP_LIVE
              ? <GetAppLink className="btn btn-dark" live="Download for iPhone" />
              : <WaitlistForm source="web" defaultCity={c.name} />}
          </div>
        </div>
      </section>

      <section className="section-sm" style={{ paddingTop: 8 }}>
        <div className="container">
          <div className="sec">
            <div className="sec-head"><p className="eyebrow">When</p><h2>When to run in {c.name}</h2></div>
            <div className="sec-body"><p className="sec-note" style={{ fontSize: 17 }}>{c.season}</p></div>
          </div>
          <div className="sec">
            <div className="sec-head"><p className="eyebrow">Where</p><h2>Where runners go</h2>
              <p className="intro">Popular places. Check opening hours and any local rules before you go.</p></div>
            <div className="sec-body">
              {c.spots.map(s => <div key={s.name} className="spot"><h3>{s.name}</h3><p>{s.note}</p></div>)}
            </div>
          </div>
          <div className="sec">
            <div className="sec-head"><p className="eyebrow">Good to know</p><h2>Tips for running here</h2></div>
            <div className="sec-body">
              <ul className="ticks">{c.tips.map(t => <li key={t}>{t}</li>)}</ul>
              {c.race && <p className="sec-note">{c.race}</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">
          <h2 className="block-title">Guides for runners in {c.name}</h2>
          <div className="link-cards">
            {guides.map(p => <LinkCard key={p.slug} href={`/blog/${p.slug}`} title={p.title} text={p.description} meta={`${p.readMinutes} min read`} more="Read the guide" />)}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
