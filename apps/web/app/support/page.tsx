import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { JsonLd } from '@/components/JsonLd';
import { Faq } from '@/components/Faq';
import { faqLd, pageMetadata } from '@/lib/seo';
import { staticPage } from '@/lib/pages';
import { SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = pageMetadata(staticPage('/support'));

const FAQS: [string, string][] = [
  ['How do zones work?', 'A run, trail run, walk, hike, wheelchair or stroller run claims a 24 m wide strip along your route. Close a loop and the inside becomes yours too. A zone loses freshness each day until you run through it again. Rides and treadmill runs never claim zones, and zones are optional: tracking and PACE work the same without them.'],
  ['Can I lose a zone?', 'Yes. A zone fades if you do not run through it, and a runner whose route overlaps enough of a fresh zone, or any of a stale one, can take the overlapping part. Running through your own zone sets it back to fresh. You can hide your zones from the map in Settings.'],
  ['What is PACE and how do I earn it?', 'PACE is Runivo’s reward points: free to earn, never sold or cashed out. You earn it for each whole kilometre, new zones, streaks, daily missions and inviting friends. A weekly cap keeps it fair. Spend PACE on partner rewards in the PACE Store, which switch on city by city.'],
  ['Why is GPS inaccurate during my run?', 'GPS accuracy depends on your phone, your surroundings and the weather. Start in an open area and wait for the signal to settle before you move. Tall buildings, trees and tunnels reduce accuracy.'],
  ['How does the AI coach work?', 'PaceX reads your recent runs, your goal and your plan, and gives a debrief after each run, a weekly review and answers to your questions. It is off until you agree on a screen that names the AI provider and lists what is sent, and you can switch it off in Settings. It is general running guidance, not medical advice.'],
  ['How do I delete my account?', 'In the app, open Settings and choose Delete account. This permanently deletes your profile, run history, zones and PACE balance straight away. It cannot be undone. Copies in encrypted backups expire on their own schedule.'],
  ['Is Runivo available on Android?', 'Not yet. Runivo is iPhone first and Android is on our roadmap. Join the waitlist and tell us your city, and we will email you when it opens.'],
  ['How do I report a bug or problem?', `Email ${SUPPORT_EMAIL} with a description of the issue, your device model and iOS version. Screenshots or screen recordings help. We aim to respond within 24 hours on weekdays.`],
];

export default function SupportPage() {
  return (
    <PageShell crumbs={[{ name: 'Support', href: '/support' }]}>
      <JsonLd data={faqLd(FAQS)} />

      <section className="page-head plain">
        <div className="container">
          <p className="eyebrow">Support</p>
          <h1 className="h-page" style={{ maxWidth: 760 }}>How can we help?</h1>
          <p className="lead" style={{ marginTop: 22, maxWidth: 540 }}>
            Most answers are below. If yours is not, email us and a person will reply, usually within 24 hours on weekdays.
          </p>
          <div className="actions">
            <a className="btn btn-dark" href={`mailto:${SUPPORT_EMAIL}`}>Email support</a>
          </div>
          <p className="also" style={{ marginTop: 14 }}>{SUPPORT_EMAIL}</p>
        </div>
      </section>

      <section className="section" id="faq" style={{ paddingTop: 24 }}>
        <div className="container faq-wrap">
          <h2 className="h-section">Common questions.</h2>
          <Faq items={FAQS} />
        </div>
      </section>

      <section className="section-sm">
        <div className="container">
          <p className="also" style={{ marginTop: 0 }}>
            Also useful: <Link href="/features">Features</Link> · <Link href="/blog">Guides</Link> · <Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Service</Link>
          </p>
        </div>
      </section>
    </PageShell>
  );
}
