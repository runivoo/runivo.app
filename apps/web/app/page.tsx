import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/ssr';
import { Nav } from '@/components/layout/Nav';
import { CityStory } from '@/components/city/CityStory';
import { HomeStatic } from '@/components/home/HomeStatic';
import { Footer } from '@/components/layout/Footer';
import { HexagonMark } from '@/components/layout/Logo';
import { Faq } from '@/components/ui/Faq';
import { LinkCard } from '@/components/ui/LinkCard';
import { pageMetadata } from '@/lib/seo/seo';
import { staticPage } from '@/lib/seo/pages';
import { POSTS } from '@/lib/content/posts';
import '../styles/home.css';
import '../styles/pages.css';

export const metadata: Metadata = pageMetadata(staticPage('/'));

const KIT = [
  { label: 'Track with GPS', note: 'Seven sports', items: ['Run', 'Trail run', 'Walk', 'Hike', 'Ride', 'Wheelchair', 'Stroller run'], extra: 'Treadmill, logged by hand' },
  { label: 'Workouts in your plan', note: 'Six session types', items: ['Easy run', 'Long run', 'Tempo', 'Intervals', 'Recovery run', 'Race'] },
  { label: 'Plans for', note: 'Four race goals', items: ['5K', '10K', 'Half marathon', 'Marathon'] },
  { label: 'While you run', note: 'Built in', items: ['GPS route', 'Pace and splits', 'Elevation', 'Auto-pause', 'Voice updates', 'Lock-screen live stats'] },
] as const;

const TRUST = [
  'PaceX is off until you read what it sends and say yes.',
  'Hide your home and the start of every run on the map.',
  'No ads and no ad trackers.',
  'Delete your account and your data any time, in the app.',
] as const;

const FAQS = [
  ['Is it free?', 'Yes. Runivo is free to download, and tracking, PaceX, training plans, clubs and the PACE Store are free at launch.'],
  ['Which sports can I track?', 'Run, trail run, walk, hike, ride, wheelchair and stroller run, all with GPS. You can also log a treadmill run by hand. Zones and PACE come from the sports that are on foot or wheelchair; rides are tracked but do not claim zones.'],
  ['What is PACE?', 'PACE is Runivo’s reward points. You earn it by running and finishing daily missions, and spend it in the PACE Store on partner rewards in selected cities. It is free to earn, cannot be bought and cannot be cashed out.'],
  ['When and where does it launch?', 'We are opening city by city, on iPhone first. Add your city when you join the waitlist and we will email you once, the day it opens there.'],
  ['What does PaceX see?', 'Only what you agree to: your recent runs, your goal, any health data you connect and anything you type to it. It goes to Anthropic, the AI provider, only after you say yes, and you can switch it off at any time. It never gets your GPS routes, your name or your email.'],
  ['Is PaceX medical advice?', 'No. PaceX gives general running guidance. If something hurts, see a professional.'],
  ['Is it on Android?', 'iPhone first. Android is on the roadmap.'],
] as const;

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        <CityStory fallback={<HomeStatic />} />

        {/* Sports and workouts */}
        <section className="section-sm" id="sports">
          <div className="container">
            <p className="eyebrow">What you can do</p>
            <h2 className="h-section" style={{ maxWidth: 620, marginBottom: 32 }}>
              Built for every kind of run.
            </h2>
            <div className="kit2">
              {KIT.map(g => (
                <div key={g.label} className="kit2-group">
                  <h3>{g.label} · {g.note}</h3>
                  <ul className="kit2-items" aria-label={g.label}>
                    {g.items.map(x => <li key={x}>{x}</li>)}
                  </ul>
                  {'extra' in g && <p className="kit2-note">Plus: {g.extra.toLowerCase()}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Guides and tools */}
        <section className="section-sm">
          <div className="container">
            <p className="eyebrow">Guides and tools</p>
            <h2 className="h-section" style={{ maxWidth: 620, marginBottom: 32 }}>Run better, with less guesswork.</h2>
            <div className="link-cards">
              {POSTS.slice(0, 3).map(p => (
                <LinkCard key={p.slug} href={`/blog/${p.slug}`} title={p.title} text={p.description} meta={`${p.readMinutes} min read`} more="Read the guide" />
              ))}
            </div>
            <p style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
              <Link href="/blog" className="feature-more">All guides <ArrowRight size={15} weight="bold" aria-hidden /></Link>
              <Link href="/tools" className="feature-more">Free pace and race tools <ArrowRight size={15} weight="bold" aria-hidden /></Link>
            </p>
          </div>
        </section>

        {/* Trust */}
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
