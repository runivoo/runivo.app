import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/ssr';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { JsonLd } from '@/components/ui/JsonLd';
import { breadcrumbLd, mobileAppLd, type Crumb } from '@/lib/seo/seo';
import { APP_LIVE, APP_STORE_URL } from '@/lib/config/site';
import '@/styles/home.css';
import '@/styles/pages.css';

/**
 * The frame for the content pages (features, tools, guides, glossary, cities): the header, a
 * breadcrumb trail (shown and sent to search engines as structured data), the page and the
 * footer. `crumbs` lists the trail after Home, ending with the current page.
 */
export function PageShell({ crumbs = [], children }: { crumbs?: Crumb[]; children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main id="main">
        {crumbs.length > 0 && (
          <>
            <JsonLd data={breadcrumbLd(crumbs)} />
            <nav className="crumbs container" aria-label="Breadcrumb">
              <ol>
                <li><Link href="/">Home</Link></li>
                {crumbs.map((c, i) => (
                  <li key={c.href}>
                    <CaretRight size={11} weight="bold" aria-hidden />
                    {i === crumbs.length - 1
                      ? <span aria-current="page">{c.name}</span>
                      : <Link href={c.href}>{c.name}</Link>}
                  </li>
                ))}
              </ol>
            </nav>
          </>
        )}
        {APP_LIVE && crumbs.length === 1 && crumbs[0].href === '/features' && <JsonLd data={mobileAppLd(APP_STORE_URL)} />}
        {children}
      </main>
      <Footer />
    </>
  );
}
