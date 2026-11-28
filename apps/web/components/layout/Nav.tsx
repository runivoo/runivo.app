import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';
import { MegaMenu } from '@/components/layout/MegaMenu';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { GetAppLink } from '@/components/ui/GetAppLink';
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
