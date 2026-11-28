import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/seo';
import { staticPage } from '@/lib/seo/pages';
import { PageShell } from '@/components/layout/PageShell';
import { ApplyForm } from './ApplyForm';
import './partners.css';

export const metadata: Metadata = pageMetadata(staticPage('/partners'));

// Facts on this page come from docs/PACE_STORE_PARTNERS.md and the code: the launch cities are
// the store_cities table and the gates are reward_block_reason(). Nothing here is a projection.
// No weekly PACE cap is quoted: it differs between free and Plus and may change.

const CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata'] as const;

const STORE: [string, string][] = [
  ['Runners earn PACE', 'Kilometres, daily missions and new ground all earn PACE. It is free to earn and cannot be bought, so every reward is earned by running.'],
  ['They open the PACE Store', 'Inside the app, runners see rewards from partner brands. A reward can be limited to a city, so they only see offers they can use.'],
  ['They redeem a code', 'A runner spends PACE and gets a single-use code to use online or in your store. One code per runner, once.'],
];

const WHY: [string, string][] = [
  ['Runners in your city', 'Limit a reward to the cities you serve, so every redemption is someone who can walk into your store.'],
  ['At the moment they have earned it', 'Your offer lands right after a good week of running, not between ads.'],
  ['Codes you control', 'You supply single-use codes. A runner gets one only after 3 runs and 14 days on Runivo, so codes go to real runners.'],
  ['Reports without personal data', 'Every month: views, redemptions and redemption rate, by city and runner rank. Never names or contact details.'],
];

const LEVELS: [string, string][] = [
  ['Entry · 50 to 100 PACE', 'For example, 20% off running shoes.'],
  ['Mid · 200 to 400 PACE', 'For example, a free gait analysis or a race entry discount.'],
  ['Premium · 1,000 to 1,500 PACE', 'For example, free shoes or a sports massage. Needs weeks of running, and the Hunter rank.'],
];

const STEPS: [string, string][] = [
  ['Say hello', 'Send your company and contact details. That is all we need to start.'],
  ['We get in touch', 'We reply within 5 working days.'],
  ['Agree', 'We work out the offer, stock, dates, cities and codes together, on one page of terms.'],
  ['Go live', 'Your reward appears in the PACE Store, optionally in a city campaign.'],
  ['Report', 'A monthly report on how it performed.'],
];

export default function PartnersPage() {
  return (
    <PageShell>
      <div className="toned tone-amber">
        {/* Hero: fills the first screen */}
        <section className="hero-full">
          <div className="container">
            <p className="eyebrow rise">PACE Store partners</p>
            <h1 className="h-page rise rise-2" style={{ maxWidth: 860 }}>Be part of India’s running wave.</h1>
            <p className="lead rise rise-3" style={{ marginTop: 22, maxWidth: 560 }}>
              Runivo runners earn PACE with every run and spend it in the PACE Store on offers from brands like yours.
            </p>
            <div className="actions rise rise-3">
              <a href="#apply" className="btn btn-dark">Partner with us</a>
              <a href="#store" className="btn btn-surface">What is the PACE Store?</a>
            </div>
            <p className="also rise rise-3" style={{ marginTop: 22 }}>
              Rewards can be set for {CITIES.slice(0, -1).join(', ')} and {CITIES[CITIES.length - 1]}.
            </p>
          </div>
        </section>

        <section className="section-sm" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="sec" id="store">
              <h2 className="sec-title">Where earned PACE becomes your offer.</h2>
              <div className="sec-body">
                <ul className="rows">{STORE.map(([t, b]) => <li key={t}><h3>{t}</h3><p>{b}</p></li>)}</ul>
              </div>
            </div>

            <div className="sec">
              <h2 className="sec-title">Built so every redemption counts.</h2>
              <div className="sec-body">
                <ul className="rows">{WHY.map(([t, b]) => <li key={t}><h3>{t}</h3><p>{b}</p></li>)}</ul>
              </div>
            </div>

            <div className="sec">
              <div>
                <h2 className="sec-title">How rewards are priced.</h2>
                <p className="sec-intro" style={{ marginTop: 16 }}>PACE is earned by running, so the price of your reward is how much someone runs to get it. Suggested levels:</p>
              </div>
              <div className="sec-body">
                <ul className="rows">{LEVELS.map(([t, b]) => <li key={t}><h3>{t}</h3><p>{b}</p></li>)}</ul>
              </div>
            </div>

            <div className="sec">
              <h2 className="sec-title">What it costs.</h2>
              <div className="sec-body">
                <p className="sec-intro">
                  Free for our first 10 partners, in exchange for a strong offer. After that, a small fixed fee only when a runner redeems your code.
                  No listing fee, no fee for views.
                </p>
              </div>
            </div>

            <div className="sec">
              <h2 className="sec-title">What we look for.</h2>
              <div className="sec-body">
                <ul className="rows plain">
                  <li><p>A fit for runners: shoes, apparel, nutrition, cafés near parks, physio, races, gyms, health cover.</p></li>
                  <li><p>An offer worth running for: at least 15% off, or a free item.</p></li>
                  <li><p>You can honour single-use codes, online or in store.</p></li>
                </ul>
              </div>
            </div>

            <div className="sec">
              <h2 className="sec-title">How it works.</h2>
              <div className="sec-body">
                <ol className="rows steps">{STEPS.map(([t, b]) => <li key={t}><h3>{t}</h3><p>{b}</p></li>)}</ol>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="apply" style={{ paddingTop: 24 }}>
          <div className="container">
           <div style={{ maxWidth: 760 }}>
            <p className="eyebrow">Partner with us</p>
            <h2 className="h-section" style={{ marginBottom: 14 }}>Tell us who you are.</h2>
            <p className="lead" style={{ marginBottom: 32 }}>
              Four fields. We’ll get in touch within 5 working days and work out the offer together.
            </p>
            <ApplyForm />
           </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
