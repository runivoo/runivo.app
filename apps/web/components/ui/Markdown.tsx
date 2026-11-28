import Link from 'next/link';
import { Fragment } from 'react';
import { parseMarkdown, type Block, type Inline } from '@/lib/content/markdown';

function Inlines({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case 'text': return <Fragment key={i}>{n.v}</Fragment>;
          case 'strong': return <strong key={i}><Inlines nodes={n.v} /></strong>;
          case 'em': return <em key={i}><Inlines nodes={n.v} /></em>;
          case 'link': return n.href.startsWith('/')
            ? <Link key={i} href={n.href}><Inlines nodes={n.v} /></Link>
            : <a key={i} href={n.href} rel="noopener noreferrer" target="_blank"><Inlines nodes={n.v} /></a>;
        }
      })}
    </>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case 'h2': return <h2 id={b.id}><Inlines nodes={b.v} /></h2>;
    case 'h3': return <h3 id={b.id}><Inlines nodes={b.v} /></h3>;
    case 'p': return <p><Inlines nodes={b.v} /></p>;
    case 'quote': return <blockquote><p><Inlines nodes={b.v} /></p></blockquote>;
    case 'ul': return <ul>{b.items.map((it, i) => <li key={i}><Inlines nodes={it} /></li>)}</ul>;
    case 'ol': return <ol>{b.items.map((it, i) => <li key={i}><Inlines nodes={it} /></li>)}</ol>;
  }
}

/** Renders a guide's markdown body (see lib/content/markdown.ts for what is supported). */
export function Markdown({ source }: { source: string }) {
  return <div className="prose">{parseMarkdown(source).map((b, i) => <BlockView key={i} b={b} />)}</div>;
}
