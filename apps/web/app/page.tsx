import Image from 'next/image';
import Link from 'next/link';
import { Activity, ArrowRight, Coins, Hexagon, Sparkles } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { HexagonMark } from '@/components/Logo';
import { Faq } from '@/components/Faq';
import { WaitlistForm } from '@/components/WaitlistForm';
import { GetAppLink } from '@/components/GetAppLink';
import { APP_LIVE } from '@/lib/site';
import './home.css';

// Every line here describes something the app does today (docs/ONBOARDING.md, the store
// listing, the privacy policy and the sport list in apps/mobile/src/features/run/constants/activities.ts).
// Nothing is a projection or a placeholder. If the sport list changes, update SPORTS and the FAQ.

const FEATURES = [
  {
    tile: 'tile-mint', icon: Activity, title: 'Track every run',
    body: 'GPS route, distance, pace, splits and elevation, with the screen locked and live stats on your lock screen. Optional auto-pause and voice updates.',
  },
  {
    tile: 'tile-lavender', icon: Sparkles, title: 'PaceX, your AI coach',
    body: 'A debrief after every run, a weekly review, and answers on pace, recovery and race prep. Plans for 5K, 10K, half marathon and marathon.',
  },
  {
    tile: 'tile-amber', icon: Coins, title: 'PACE and the PACE Store',
    body: 'Earn PACE for kilometres, daily missions and new ground. Spend it in the PACE Store on partner rewards in selected cities.',
  },
  {
    tile: 'tile-ink', icon: Hexagon, title: 'Zones and clubs',
    body: 'Run a street to claim a zone, or close a loop to own what is inside. Join a club, chat with clubmates and climb the weekly leaderboards.',
  },
] as const;

const SPORTS = ['Run', 'Trail run', 'Walk', 'Hike', 'Ride', 'Wheelchair', 'Stroller run'] as const;

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
                  <p style={{ marginTop: 18 }}>
                    <Link href="/#features" className="muted" style={{ fontSize: 15, fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3 }}>See what is inside</Link>
                  </p>
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
            <div className="grid-2">
              {FEATURES.map(({ tile, icon: Icon, title, body }) => (
                <article key={title} className="card feature">
                  <div className={`tile ${tile}`}><Icon size={24} strokeWidth={2} aria-hidden /></div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Sports */}
        <section className="section-sm">
          <div className="container">
            <p className="eyebrow">Your sport</p>
            <h2 className="h-section" style={{ maxWidth: 620, marginBottom: 28 }}>
              Seven sports to track. Treadmill runs you can log by hand.
            </h2>
            <ul className="sports" aria-label="Sports you can track">
              {SPORTS.map(s => <li key={s}>{s}</li>)}
              <li className="sports-alt">Treadmill, logged by hand</li>
            </ul>
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
