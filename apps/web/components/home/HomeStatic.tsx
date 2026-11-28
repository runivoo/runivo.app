import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Coins, Hexagon, PersonSimpleRun, Sparkle } from '@phosphor-icons/react/ssr';
import { WaitlistForm } from '@/components/forms/WaitlistForm';
import { GetAppLink } from '@/components/ui/GetAppLink';
import { APP_LIVE } from '@/lib/config/site';

/**
 * The landing page's top without the 3D story: the poster hero, the four features, the PaceX steps and the
 * PACE block. Shown instead of the scroll story (components/city/CityStory.tsx) when the visitor prefers
 * reduced motion, WebGL is unavailable or Save-Data is on.
 */

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


export function HomeStatic() {
  return (
    <>
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
                <div className="rise rise-3" id="waitlist" style={{ marginTop: 32 }}>
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
    </>
  );
}
