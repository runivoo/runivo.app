import { PageShell } from '@/components/layout/PageShell';
import { GetAppLink } from '@/components/ui/GetAppLink';
import { APP_LIVE, APP_TAGLINE } from '@/lib/site';

/**
 * The landing page for a link shared from the app (an invite, a club, a runner). A heading, one line
 * about Runivo, then whatever the link needs (a button to open the app, a code, the waitlist form).
 * `again` finishes the "get the app first" line once the app is in the store: ", then open this link again."
 */
export function DeepLinkPage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <PageShell>
      <section className="page-head plain deeplink">
        <div className="container">
          <h1 className="h-page">{title}</h1>
          <p className="lead" style={{ marginTop: 18 }}>{APP_TAGLINE}</p>
          {children}
        </div>
      </section>
    </PageShell>
  );
}

/** "Open in Runivo" for people who have the app. */
export function OpenInAppButton({ href, label }: { href: string; label: string }) {
  return <div className="actions" style={{ justifyContent: 'center' }}><a href={href} className="btn btn-dark">{label}</a></div>;
}

/** The line under the button for people who do not have the app yet. */
export function GetAppNote({ again }: { again: string }) {
  return (
    <p className="also" style={{ marginTop: 22 }}>
      {APP_LIVE ? 'No app yet? ' : 'Runivo is not on the App Store yet. '}
      <GetAppLink live="Get Runivo on the App Store" waitlist="Join the waitlist" />
      {APP_LIVE ? `, then ${again}` : ' and we’ll email you the day it opens.'}
    </p>
  );
}
