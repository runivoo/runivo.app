import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CaretRight } from '@phosphor-icons/react/ssr';
import { Nav } from '@/components/layout/Nav';
import { CityStory } from '@/components/city/CityStory';
import { HomeStatic } from '@/components/home/HomeStatic';
import { Footer } from '@/components/layout/Footer';
import { HexagonMark } from '@/components/layout/Logo';
import { Faq } from '@/components/ui/Faq';
import { JsonLd } from '@/components/ui/JsonLd';
import { pageMetadata, faqLd } from '@/lib/seo/seo';
import { staticPage } from '@/lib/seo/pages';
import { POSTS } from '@/lib/content/posts';
import '../styles/home.css';
import '../styles/pages.css';

export const metadata: Metadata = pageMetadata(staticPage('/'));

// Everything on this page describes what the app does today (docs/WEBSITE_CLAIMS.md): the sport list is
// SPORTS in apps/mobile/src/features/run/constants/activities.ts, the sessions and goals are in engine/training.ts.
// Garmin, COROS and Polar are left out until those connections exist.

const WHAT_YOU_CAN_DO = [
  { label: 'Sports', items: ['Run', 'Trail run', 'Walk', 'Hike', 'Ride', 'Wheelchair', 'Stroller run'], note: 'Tracked with GPS. Treadmill runs you log by hand.' },
  { label: 'On every run', items: ['GPS route', 'Pace and splits', 'Elevation', 'Auto-pause', 'Voice updates', 'Lock-screen stats'] },
  { label: 'Plans for', items: ['5K', '10K', 'Half marathon', 'Marathon'], note: 'Built from six kinds of session: easy, long, tempo, intervals, recovery and race.' },
] as const;

const TRUST = [
  'PaceX is off until you read what it sends and say yes.',
  'Hide your home and the start of every run on the map.',
  'No ads and no ad trackers.',
  'Delete your account and your data any time, in the app.',
] as const;

const FAQS = [
  ['Is it free?', 'Yes. Runivo is free to download, and tracking, PaceX, training plans, clubs and the PACE Store are free at launch.'],
  ['When and where does it launch?', 'City by city, iPhone first. Add your city when you join the waitlist and we’ll email you the day it opens there.'],
  ['Which sports can I track?', 'Run, trail run, walk, hike, ride, wheelchair and stroller run with GPS, plus treadmill runs you log by hand. Zones and PACE come from the on-foot sports; rides are tracked but don’t claim zones.'],
  ['What is PACE?', 'Runivo’s reward points. You earn them by running and finishing daily missions, and spend them on partner rewards in selected cities. PACE is free to earn and can’t be bought or cashed out.'],
  ['What does PaceX see?', 'Only what you agree to: your recent runs, your goal, any health data you connect and what you type. It goes to Anthropic, the AI provider, after you say yes, and never includes your GPS routes, name or email. You can switch it off any time.'],
  ['Is PaceX medical advice?', 'No. PaceX gives general running guidance. If something hurts, see a professional.'],
  ['Is it on Android?', 'iPhone first. Android is on the roadmap.'],
] as const;

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        <JsonLd data={faqLd(FAQS)} />
        <CityStory fallback={<HomeStatic />} />

        {/* What you can do */}
        <section className="section-sm" id="sports">
          <div className="container">
            <p className="eyebrow">What you can do</p>
            <h2 className="h-section" style={{ maxWidth: 620, marginBottom: 32 }}>Built for every kind of run.</h2>
            <div className="facts-table">
              {WHAT_YOU_CAN_DO.map(row => (
                <div key={row.label} className="facts-row">
                  <h3>{row.label}</h3>
                  <div>
                    <ul className="facts-items" aria-label={row.label}>
                      {row.items.map(x => <li key={x}>{x}</li>)}
                    </ul>
                    {'note' in row && <p className="facts-note">{row.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="section-sm">
          <div className="container">
            <div className="band">
              <HexagonMark size={380} color="#fff" />
              <div style={{ position: 'relative', maxWidth: 620 }}>
                <p className="eyebrow">Your data, your call</p>
                <h2 className="h-section" style={{ marginBottom: 24 }}>Smart, without the catch.</h2>
                <ul className="checks">
                  {TRUST.map(t => <li key={t}>{t}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Guides and tools */}
        <section className="section-sm">
          <div className="container">
            <p className="eyebrow">Guides and tools</p>
            <h2 className="h-section" style={{ maxWidth: 620, marginBottom: 32 }}>Run better, with less guesswork.</h2>
            <ul className="feature-list">
              {POSTS.slice(0, 3).map(p => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`}>
                    <span className="fl-text">
                      <span className="fl-title">{p.title}</span>
                      <span className="fl-line">{p.category} · {p.readMinutes} min read</span>
                    </span>
                    <CaretRight size={18} weight="bold" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <p style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
              <Link href="/blog" className="feature-more">All guides <ArrowRight size={15} weight="bold" aria-hidden /></Link>
              <Link href="/tools" className="feature-more">Free pace and race tools <ArrowRight size={15} weight="bold" aria-hidden /></Link>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="section" id="faq" style={{ paddingTop: 24 }}>
          <div className="container faq-wrap">
            <div>
              <p className="eyebrow">Questions</p>
              <h2 className="h-section">Good to know.</h2>
            </div>
            <Faq items={FAQS} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
