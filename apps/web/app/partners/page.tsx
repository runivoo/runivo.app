import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { ApplyForm } from './ApplyForm';
import './partners.css';

export const metadata: Metadata = {
  title: 'Partners — Runivo',
  description: 'Be part of India’s running wave. Put your brand in the Runivo PACE Store, in front of runners in your city who have earned a reward.',
};

// Facts on this page come from docs/PACE_STORE_PARTNERS.md and the code: the launch cities are
// the store_cities table, the weekly cap is ENGINE.PACE_WEEKLY_CAP_FREE / _PREMIUM in runEngine.ts,
// the gates are reward_block_reason(). Nothing here is a projection.

const CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata'] as const;

const STORE_STEPS = [
  ['Runners earn PACE', 'Kilometres, daily missions and new ground all earn PACE. It is free to earn and cannot be bought, so every reward is earned by running.'],
  ['They open the PACE Store', 'Inside the app, runners see rewards from partner brands. Rewards can be limited to a city, so they only see offers they can use.'],
  ['They redeem a code', 'A runner spends PACE and gets a single-use code to use online or in your store. One code per runner, once.'],
] as const;

const WHY = [
  { title: 'Runners in your city', body: 'Limit a reward to the cities you serve, so every redemption is someone who can actually walk into your store.' },
  { title: 'At the moment they’ve earned it', body: 'Runners spend PACE they earned on their own runs. Your offer lands right after a good week, not between ads.' },
  { title: 'Codes you control', body: 'You supply single-use codes. A runner gets one only after 3 runs and 14 days on Runivo, so codes go to real runners.' },
  { title: 'Reports without personal data', body: 'Every month: views, redemptions and redemption rate, by city and runner rank. Never names or contact details.' },
] as const;

const LEVELS = [
  { level: 'Entry', pace: '50 to 100', time: 'About a week of running', example: '20% off running shoes' },
  { level: 'Mid', pace: '200 to 400', time: '3 to 4 weeks', example: 'Free gait analysis, race entry discount' },
  { level: 'Premium', pace: '1,000 to 1,500', time: 'About 3 months, Hunter rank and up', example: 'Free shoes, a sports massage' },
] as const;

const STEPS = [
  ['Say hello', 'Send your company and contact details. That is all we need to start.'],
  ['We get in touch', 'We reply within 5 working days.'],
  ['Agree', 'We work out the offer, stock, dates, cities and codes together, on one page of terms.'],
  ['Go live', 'Your reward appears in the PACE Store, optionally in a city campaign.'],
  ['Report', 'A monthly report on how it performed.'],
] as const;

export default function PartnersPage() {
  return (
    <>
      <Nav />
      <main id="main">
        {/* Hero */}
        <section className="hero hero-full">
          <div className="container">
            <p className="eyebrow rise">PACE Store partners</p>
            <h1 className="h-display rise rise-2" style={{ maxWidth: 820 }}>
              Be part of India’s <span className="accent">running wave.</span>
            </h1>
            <p className="lead rise rise-3" style={{ marginTop: 22, maxWidth: 580 }}>
              Runivo runners earn PACE with every run and spend it in the PACE Store on offers from brands like yours.
            </p>
            <div className="actions rise rise-3">
              <a href="#apply" className="btn btn-dark">Partner with us</a>
              <a href="#store" className="btn btn-surface">What is the PACE Store?</a>
            </div>
            <p className="muted rise rise-3" style={{ fontSize: 15, marginTop: 20, maxWidth: 560 }}>
              Rewards can be set for {CITIES.slice(0, -1).join(', ')} and {CITIES[CITIES.length - 1]}.
            </p>
          </div>
        </section>

        {/* What the PACE Store is */}
        <section className="section-sm" id="store">
          <div className="container">
            <p className="eyebrow">The PACE Store</p>
            <h2 className="h-section" style={{ maxWidth: 620, marginBottom: 36 }}>
              Where earned PACE becomes your offer.
            </h2>
            <div className="grid-3">
              {STORE_STEPS.map(([t, b], i) => (
                <div key={t} className="step">
                  <div className="step-no">{String(i + 1).padStart(2, '0')}</div>
                  <h3>{t}</h3>
                  <p>{b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why */}
        <section className="section-sm">
          <div className="container">
            <p className="eyebrow">Why brands join</p>
            <h2 className="h-section" style={{ maxWidth: 560, marginBottom: 36 }}>Built so every redemption counts.</h2>
            <div className="grid-2">
              {WHY.map(w => (
                <article key={w.title} className="card feature">
                  <h3>{w.title}</h3>
                  <p>{w.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing in PACE */}
        <section className="section-sm">
          <div className="container">
            <p className="eyebrow">How rewards are priced</p>
            <h2 className="h-section" style={{ maxWidth: 560, marginBottom: 16 }}>PACE means weeks of running.</h2>
            <p className="lead" style={{ maxWidth: 620, marginBottom: 28 }}>
              A runner earns up to 100 PACE a week (150 on Plus), so the price of your reward is how long someone runs to get it.
            </p>
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="level-table">
                <thead>
                  <tr>{['Level', 'PACE', 'Roughly', 'Example'].map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {LEVELS.map(l => (
                    <tr key={l.level}>
                      <td className="level-name">{l.level}</td>
                      <td className="level-pace">{l.pace}</td>
                      <td>{l.time}</td>
                      <td>{l.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Cost + criteria */}
        <section className="section-sm">
          <div className="container grid-2">
            <article className="card">
              <p className="eyebrow">What it costs</p>
              <h3 className="h-section" style={{ fontSize: 28, marginBottom: 12 }}>Free for our first 10 partners.</h3>
              <p className="muted" style={{ fontSize: 15.5, lineHeight: 1.6 }}>
                The first 10 partners list free in exchange for a strong offer. After that, you pay a small fixed fee
                only when a runner redeems your code. No listing fee, no fee for views.
              </p>
            </article>
            <article className="card">
              <p className="eyebrow">What we look for</p>
              <ul className="partner-list">
                <li>A fit for runners: shoes, apparel, nutrition, cafés near parks, physio, races, gyms, health cover.</li>
                <li>An offer worth running for: at least 15% off, or a free item.</li>
                <li>You can honour single-use codes, online or in store.</li>
              </ul>
            </article>
          </div>
        </section>

        {/* Steps */}
        <section className="section-sm">
          <div className="container">
            <p className="eyebrow">How it works</p>
            <div className="partner-steps">
              {STEPS.map(([t, b], i) => (
                <div key={t} className="step">
                  <div className="step-no" style={{ fontSize: 40 }}>{String(i + 1).padStart(2, '0')}</div>
                  <h3>{t}</h3>
                  <p>{b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Apply */}
        <section className="section" id="apply">
          <div className="container" style={{ maxWidth: 760 }}>
            <p className="eyebrow">Partner with us</p>
            <h2 className="h-section" style={{ marginBottom: 14 }}>Tell us who you are.</h2>
            <p className="lead" style={{ marginBottom: 28 }}>
              Four fields. We’ll get in touch within 5 working days and work out the offer together.
            </p>
            <ApplyForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
