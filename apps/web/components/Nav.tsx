import Link from 'next/link';
import { Logo } from './Logo';
import { MegaMenu } from './MegaMenu';
import { MobileMenu } from './MobileMenu';
import { GetAppLink } from './GetAppLink';
import { TOP_LINKS } from '@/lib/nav';

export function Nav() {
  return (
    <header className="nav">
      <nav className="container nav-in" aria-label="Main">
        <Logo />
        <div className="nav-links">
          <MegaMenu />
          {TOP_LINKS.map(l => <Link key={l.href} href={l.href} className="nav-link">{l.label}</Link>)}
          <GetAppLink className="btn btn-dark btn-sm nav-cta" waitlist="Join waitlist" />
          <MobileMenu />
        </div>
      </nav>
    </header>
  );
}
