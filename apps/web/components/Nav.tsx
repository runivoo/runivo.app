import Link from 'next/link';
import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';
import { GetAppLink } from './GetAppLink';

export function Nav() {
  return (
    <header className="nav">
      <nav className="container nav-in" aria-label="Main">
        <Logo />
        <div className="nav-links">
          <Link href="/#how" className="nav-link">How it works</Link>
          <Link href="/partners" className="nav-link">Partners</Link>
          <Link href="/support" className="nav-link">Support</Link>
          <GetAppLink className="btn btn-dark btn-sm" style={{ marginLeft: 8 }} waitlist="Join waitlist" />
          <MobileMenu />
        </div>
      </nav>
    </header>
  );
}
