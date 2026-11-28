import { PageShell } from '@/components/layout/PageShell';

/** The frame for the legal pages (privacy, terms): a heading, the date, and long-form text styled by .legal in pages.css. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <PageShell>
      <article className="container legal">
        <p className="eyebrow">Legal</p>
        <h1 className="h-page" style={{ fontSize: 'clamp(38px, 5.4vw, 60px)' }}>{title}</h1>
        <p className="legal-date">Last updated: {updated}</p>
        <div className="legal-body">{children}</div>
      </article>
    </PageShell>
  );
}
