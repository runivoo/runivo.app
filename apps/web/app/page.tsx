import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Coins, Hexagon, PersonSimpleRun, Sparkle } from '@phosphor-icons/react/ssr';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { HexagonMark } from '@/components/layout/Logo';
import { Faq } from '@/components/ui/Faq';
import { WaitlistForm } from '@/components/forms/WaitlistForm';
import { GetAppLink } from '@/components/ui/GetAppLink';
import { LinkCard } from '@/components/ui/LinkCard';
import { APP_LIVE } from '@/lib/site';
import { pageMetadata } from '@/lib/seo';
import { staticPage } from '@/lib/pages';
import { POSTS } from '@/lib/posts';
import './home.css';
import './pages.css';

export const metadata: Metadata = pageMetadata(staticPage('/'));

// Every line here describes something the app does today (docs/ONBOARDING.md, the store
// listing, the privacy policy and the sport list in apps/mobile/src/features/run/constants/activities.ts).
// Nothing is a projection or a placeholder. If the sport list changes, update SPORTS and the FAQ.

const FEATURES = [
  {
    icon: PersonSimpleRun, color: '#4E7F1F', title: 'Track every run', href: '/features/run-tracking',
    body: 'GPS route, distance, pace, splits and elevation, with the screen locked and live stats on your lock screen. Optional auto-pause and voice updates.',
  },
  {
    icon: Sparkle, color: '#5B4FC4', title: 'PaceX, your AI coach', href: '/features/ai-coach',
    body: 'A debrief after every run, a weekly review, and answers on pace, recovery and race prep. Plans for 5K, 10K, half marathon and marathon.',
  },
  {
    icon: Coins, color: '#B8690A', title: 'PACE and the PACE Store', href: '/features/pace-rewards',
    body: 'Earn PACE for kilometres, daily missions and new ground. Spend it in the PACE Store on partner rewards in selected cities.',
  },
  {
    icon: Hexagon, color: '#B8690A', title: 'Zones and clubs', href: '/features/zones',
    body: 'Run a street to claim a zone, or close a loop to own what is inside. Join a club, chat with clubmates and climb the weekly leaderboards.',
  },
] as const;

// Four labelled groups, each item real: the sport picker (SPORTS in run/constants/activities.ts),
// the plan session kinds (SessionKind in engine/training.ts), the plan goals and the run tools
// from the store listing. Garmin/COROS/Polar are left out until WATCH_OAUTH is on.
const KIT = [
  { label: 'Track with GPS', note: 'Seven sports', items: ['Run', 'Trail run', 'Walk', 'Hike', 'Ride', 'Wheelchair', 'Stroller run'], extra: 'Treadmill, logged by hand' },
  { label: 'Workouts in your plan', note: 'Six session types', items: ['Easy run', 'Long run', 'Tempo', 'Intervals', 'Recovery run', 'Race'] },
  { label: 'Plans for', note: 'Four race goals', items: ['5K', '10K', 'Half marathon', 'Marathon'] },
  { label: 'While you run', note: 'Built in', items: ['GPS route', 'Pace and splits', 'Elevation', 'Auto-pause', 'Voice updates', 'Lock-screen live stats'] },
] as const;

const STEPS = [
  ['Tell PaceX your goal', 'Get fit, train for a race or just run more. PaceX builds a plan around the days you can run.'],
  ['Run', 'Connect Apple Health if you want PaceX to start from your last 90 days. Each run you record ticks off its session.'],
  ['PaceX reads every run', 'You get a debrief on what went well and what to work on.'],
  ['Your week adjusts', 'Every Monday PaceX checks last week and offers to ease your plan if you missed sessions. Nothing changes without your OK.'],
] as const;

const PACE = [
  ['Earn it', 'Kilometres, daily missions and new ground all earn PACE. A weekly cap keeps it fair.'],
  ['Spend it', 'Redeem PACE in the PACE Store for rewards from partner brands, in selected cities.'],
  ['Never bought', 'PACE is free to earn, cannot be bought and cannot be cashed out.'],
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
        {/* Hero */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <p className="eyebrow rise">GPS running app with an AI coach</p>
              <h1 className="h-display rise rise-2">
                Run <span className="accent">smarter.</span>
              </h1>
              <p className="lead rise rise-3" style={{ marginTop: 22, maxWidth: 480 }}>
                Track every run, train with PaceX and earn PACE you can spend in the PACE Store.
              </p>
              {APP_LIVE ? (
                <div className="actions rise rise-3">
                  <GetAppLink className="btn btn-dark" live="Download for iPhone" />
                  <Link href="/#how" className="btn btn-surface">See how it works</Link>
                </div>
              ) : (
                <div className="rise rise-3" style={{ marginTop: 32 }}>
                  <WaitlistForm source="web" />
                </div>
              )}
            </div>

            <div className="hero-art rise rise-2">
              <Image
                src="/images/welcome-runner.jpg"
                alt="A runner mid-stride inside the Runivo hexagon"
                width={680}
                height={820}
                priority
                sizes="(max-width: 920px) 460px, 520px"
              />
              <span className="chip"><i />Every run earns PACE</span>
            </div>
          </div>
        </section>

        {/* Four things */}
        <section className="section" id="features">
          <div className="container">
            <p className="eyebrow">Everything in one app</p>
            <h2 className="h-section" style={{ maxWidth: 560, marginBottom: 40 }}>
              Tracking, coaching and rewards, together.
            </h2>
            <div className="home-features">
              {FEATURES.map(({ icon: Icon, color, title, body, href }) => (
                <Link key={title} href={href} className="home-feature">
                  <h3><Icon size={34} weight="light" color={color} aria-hidden />{title}</h3>
                  <p>{body}</p>
                  <span className="feature-more">Learn more <ArrowRight size={15} weight="bold" aria-hidden /></span>
                </Link>
              ))}
            </div>
            <p style={{ marginTop: 24 }}>
              <Link href="/features" className="feature-more">See every feature <ArrowRight size={15} weight="bold" aria-hidden /></Link>
            </p>
          </div>
        </section>

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

        {/* PaceX */}
        <section className="section" id="how">
          <div className="container">
            <p className="eyebrow">PaceX</p>
            <h2 className="h-section" style={{ maxWidth: 560, marginBottom: 44 }}>
              A coach that learns how you run.
            </h2>
            <div className="grid-4">
              {STEPS.map(([title, body], i) => (
                <div key={title} className="step">
                  <div className="step-no">{String(i + 1).padStart(2, '0')}</div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PACE */}
        <section className="section" style={{ paddingTop: 24 }}>
          <div className="container">
            <p className="eyebrow">PACE Store</p>
            <h2 className="h-section" style={{ maxWidth: 560, marginBottom: 36 }}>
              Run more. Earn PACE. Spend it.
            </h2>
            <div className="extras">
              {PACE.map(([title, body]) => (
                <div key={title} className="extra">
                  <h3>{title}</h3>
                  <p>{body}</p>
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

        {/* Final call */}
        <section className="section" id="waitlist" style={{ textAlign: 'center' }}>
          <div className="container">
            <h2 className="h-display" style={{ fontSize: 'clamp(38px, 6vw, 72px)' }}>
              Ready to run <span className="accent">smarter?</span>
            </h2>
            {APP_LIVE ? (
              <div className="actions" style={{ justifyContent: 'center' }}>
                <GetAppLink className="btn btn-dark" live={<>Download for iPhone <ArrowRight size={18} aria-hidden /></>} />
              </div>
            ) : (
              <>
                <p className="lead" style={{ margin: '18px auto 0', maxWidth: 460 }}>
                  Runivo is opening city by city. Join the waitlist and we’ll tell you the day it reaches yours.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
                  <WaitlistForm source="web" />
                </div>
              </>
            )}
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
