import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { JsonLd } from '@/components/JsonLd';
import { Markdown } from '@/components/Markdown';
import { LinkCard } from '@/components/LinkCard';
import { EndCta } from '@/components/EndCta';
import { POSTS, getPost, nextPosts } from '@/lib/posts';
import { FEATURE_NAV, TOOLS_NAV } from '@/lib/nav';
import { articleLd, pageMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map(p => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getPost((await params).slug);
  if (!p) return {};
  return pageMetadata({ title: p.title, description: p.description, path: `/blog/${p.slug}`, publishedTime: p.published, modifiedTime: p.updated });
}

export default async function PostPage({ params }: Props) {
  const p = getPost((await params).slug);
  if (!p) notFound();
  const feature = FEATURE_NAV.find(f => f.slug === p.feature);
  const tools = TOOLS_NAV.filter(t => p.tools?.includes(t.slug));
  const more = nextPosts(p);
  const path = `/blog/${p.slug}`;

  return (
    <PageShell crumbs={[{ name: 'Guides', href: '/blog' }, { name: p.title, href: path }]}>
      <JsonLd data={articleLd({ title: p.title, description: p.description, path, published: p.published, modified: p.updated })} />

      <article className="container article" style={{ paddingTop: 28, paddingBottom: 24 }}>
        <p className="eyebrow">{p.category}</p>
        <h1 className="h-page" style={{ fontSize: 'clamp(34px, 5vw, 52px)' }}>{p.title}</h1>
        <p className="lead" style={{ marginTop: 18 }}>{p.description}</p>
        <p className="article-meta">
          <span>By the Runivo team</span>
          <span>Published {fmt(p.published)}</span>
          {p.updated !== p.published && <span>Updated {fmt(p.updated)}</span>}
          <span>{p.readMinutes} min read</span>
        </p>

        <Markdown source={p.body} />

        <aside className="callout article-cta" aria-label="Related in Runivo">
          <strong>Put it into practice.</strong>{' '}
          {feature && <>See how Runivo handles this in <Link href={`/features/${feature.slug}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>{feature.label}</Link>. </>}
          {tools.map((t, i) => (
            <span key={t.slug}>{i === 0 ? 'Try the ' : ' and the '}<Link href={`/tools/${t.slug}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>{t.label.toLowerCase()}</Link></span>
          ))}
          {tools.length > 0 && '.'}
        </aside>
      </article>

      <section className="section-sm">
        <div className="container">
          <h2 className="block-title">Keep reading</h2>
          <div className="link-cards">
            {more.map(m => <LinkCard key={m.slug} href={`/blog/${m.slug}`} title={m.title} text={m.description} meta={`${m.readMinutes} min read`} more="Read the guide" />)}
          </div>
        </div>
      </section>

      <EndCta />
    </PageShell>
  );
}
