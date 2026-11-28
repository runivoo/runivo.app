import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { GetAppLink } from '@/components/ui/GetAppLink';

export default function NotFound() {
  return (
    <PageShell>
      <section className="status-page">
        <div>
          <p className="status-code">404</p>
          <h1 className="h-section" style={{ marginTop: 12 }}>This route isn’t on the map.</h1>
          <p className="lead" style={{ margin: '14px auto 0', maxWidth: 420 }}>
            The page you’re after has moved or never existed.
          </p>
          <div className="actions" style={{ justifyContent: 'center' }}>
            <Link href="/" className="btn btn-dark">Back to home</Link>
            <GetAppLink className="btn btn-surface" live="Get the app" />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
