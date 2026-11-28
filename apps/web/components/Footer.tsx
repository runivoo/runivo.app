import Link from 'next/link';
import { Logo } from './Logo';
import { GetAppLink } from './GetAppLink';
import { INSTAGRAM_URL, SUPPORT_EMAIL } from '@/lib/site';
import { FEATURE_NAV, FOOTER_LEARN } from '@/lib/nav';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo size={24} />
            <p className="muted" style={{ fontSize: 15, marginTop: 14 }}>
              Run smarter. Track every run, train with PaceX and earn PACE.
            </p>
            <GetAppLink className="btn btn-dark btn-sm" waitlist="Join the waitlist" style={{ marginTop: 18 }} />
          </div>
          <div>
            <h4>Features</h4>
            {FEATURE_NAV.map(f => <Link key={f.slug} className="fl" href={`/features/${f.slug}`}>{f.label}</Link>)}
          </div>
          <div>
            <h4>Learn</h4>
            {FOOTER_LEARN.map(l => <Link key={l.href} className="fl" href={l.href}>{l.label}</Link>)}
          </div>
          <div>
            <h4>Company</h4>
            <Link className="fl" href="/partners">Partners</Link>
            <Link className="fl" href="/support">Support</Link>
            {INSTAGRAM_URL && <a className="fl" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram</a>}
            <Link className="fl" href="/privacy">Privacy</Link>
            <Link className="fl" href="/terms">Terms</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Runivo. All rights reserved.</span>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </div>
      </div>
    </footer>
  );
}
