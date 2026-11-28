import type { Metadata } from 'next';
import { PageShell } from '@/components/layout/PageShell';
import { LinkCard } from '@/components/ui/LinkCard';
import { EndCta } from '@/components/ui/EndCta';
import { CATEGORIES, categorySlug } from '@/lib/blog';
import { POSTS, postsIn } from '@/lib/posts';
import { pageMetadata } from '@/lib/seo';
import { staticPage } from '@/lib/pages';

export const metadata: Metadata = pageMetadata(staticPage('/blog'));

export default function BlogPage() {
  return (
    <PageShell crumbs={[{ name: 'Guides', href: '/blog' }]}>
      <section className="page-head plain">
        <div className="container">
          <p className="eyebrow">Guides</p>
          <h1 className="h-page" style={{ maxWidth: 720 }}>Run better, with less guesswork.</h1>
          <p className="lead" style={{ marginTop: 20, maxWidth: 560 }}>
            Plain-language guides on starting, training and staying safe, plus how Runivo works. {POSTS.length} guides so far.
          </p>
        </div>
      </section>

      <section className="section-sm" style={{ paddingTop: 8 }}>
        <div className="container">
          <nav className="chips-row" aria-label="Guide topics">
            {CATEGORIES.filter(c => postsIn(c).length > 0).map(c => <a key={c} href={`#${categorySlug(c)}`}>{c}</a>)}
          </nav>
          {CATEGORIES.filter(c => postsIn(c).length > 0).map(c => (
            <div key={c} id={categorySlug(c)} style={{ marginBottom: 48 }}>
              <h2 className="block-title">{c}</h2>
              <div className="link-cards">
                {postsIn(c).map(p => (
                  <LinkCard key={p.slug} href={`/blog/${p.slug}`} title={p.title} text={p.description} meta={`${p.readMinutes} min read`} more="Read the guide" />
                ))}
              </div>
            </div>
          ))}
          <p className="muted" style={{ fontSize: 15 }}>
            Prefer a feed reader? <a href="/blog/rss.xml" style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Subscribe by RSS</a>.
          </p>
        </div>
      </section>

      <EndCta />
    </PageShell>
  );
}
