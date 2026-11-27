import Link from 'next/link';
import { Logo } from './Logo';
import { GetAppLink } from './GetAppLink';
import { INSTAGRAM_URL, SUPPORT_EMAIL } from '@/lib/site';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div style={{ maxWidth: 300 }}>
            <Logo size={24} />
            <p className="muted" style={{ fontSize: 15, marginTop: 14 }}>
              Run more. Track every run, train with PaceX and earn PACE.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 64, flexWrap: 'wrap' }}>
            <div>
              <h4>Product</h4>
              <GetAppLink className="fl" />
              <Link className="fl" href="/#how">How it works</Link>
            </div>
            <div>
              <h4>Legal</h4>
              <Link className="fl" href="/privacy">Privacy</Link>
              <Link className="fl" href="/terms">Terms</Link>
            </div>
            <div>
              <h4>Company</h4>
              <Link className="fl" href="/partners">Partners</Link>
              <Link className="fl" href="/support">Support</Link>
              {INSTAGRAM_URL && <a className="fl" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram</a>}
            </div>
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
