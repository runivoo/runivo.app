import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
import { EndCta } from '@/components/ui/EndCta';
import { TERMS } from '@/lib/glossary';
import { definedTermSetLd, pageMetadata } from '@/lib/seo';
import { staticPage } from '@/lib/pages';

export const metadata: Metadata = pageMetadata(staticPage('/glossary'));

export default function GlossaryPage() {
  const letters = Array.from(new Set(TERMS.map(x => x.term[0].toUpperCase())));
  return (
    <PageShell crumbs={[{ name: 'Glossary', href: '/glossary' }]}>
      <JsonLd data={definedTermSetLd(TERMS)} />
      <section className="page-head plain">
        <div className="container">
          <p className="eyebrow">Glossary</p>
          <h1 className="h-page" style={{ maxWidth: 720 }}>Running terms, in plain words.</h1>
          <p className="lead" style={{ marginTop: 20, maxWidth: 560 }}>
            {TERMS.length} short definitions, from easy runs to negative splits, plus the few words that are Runivo’s own.
          </p>
        </div>
      </section>
      <section className="section-sm" style={{ paddingTop: 8 }}>
        <div className="container">
          <nav className="alpha" aria-label="Jump to a letter">
            {letters.map(l => <a key={l} href={`#letter-${l}`}>{l}</a>)}
          </nav>
          <div className="terms">
            {TERMS.map((x, i) => {
              const first = x.term[0].toUpperCase();
              const startsLetter = i === 0 || TERMS[i - 1].term[0].toUpperCase() !== first;
              return (
                <div key={x.id} className="term" id={x.id}>
                  <h2>{startsLetter && <span id={`letter-${first}`} />}{x.term}</h2>
                  <div>
                    <p>{x.definition}</p>
                    {x.links && (
                      <div className="term-links">
                        {x.links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <EndCta />
    </PageShell>
  );
}
