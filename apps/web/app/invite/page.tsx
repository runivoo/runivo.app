import type { Metadata } from 'next';
import { DeepLinkPage } from '@/components/templates/DeepLinkPage';
import { WaitlistForm } from '@/components/forms/WaitlistForm';
import { GetAppLink } from '@/components/ui/GetAppLink';
import { APP_LIVE } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Join Runivo',
  description: 'You have been invited to Runivo, a GPS running app with an AI coach and PACE rewards.',
  robots: { index: false, follow: false },
};

/**
 * Where the app's "Invite a friend" link lands (apps/mobile PeopleStep builds
 * https://www.runivo.in/invite?from=<username>&code=<code>).
 */
export default async function InvitePage({ searchParams }: { searchParams: Promise<{ from?: string | string[]; code?: string | string[] }> }) {
  const { from, code: rawCode } = await searchParams;
  // Invite codes (app Search → "Invite friends"): 6 to 12 letters/digits, shown only if well-formed.
  const c = (Array.isArray(rawCode) ? rawCode[0] : rawCode)?.trim().toUpperCase();
  const code = c && /^[A-Z0-9]{6,12}$/.test(c) ? c : null;
  const raw = Array.isArray(from) ? from[0] : from;
  // A username is letters, digits and underscores; anything else is dropped, never rendered.
  const inviter = raw && /^[A-Za-z0-9_]{1,30}$/.test(raw) ? raw : null;

  return (
    <DeepLinkPage title={inviter ? `${inviter} invited you to Runivo` : 'You are invited to Runivo'}>
      <p className="muted" style={{ marginTop: 14 }}>
        {APP_LIVE
          ? <>Get the app from the App Store, then follow {inviter ?? 'your friend'} once you are in.</>
          : <>Runivo is not on the App Store yet. Join the waitlist and we’ll email you the day it opens, then you can follow {inviter ?? 'your friend'}.</>}
      </p>
      {code && (
        <p style={{ marginTop: 22, fontSize: 17 }}>
          In the app, open Search, tap <strong>Got a code from a friend?</strong> and enter{' '}
          <strong style={{ letterSpacing: '0.12em' }}>{code}</strong>. You both get 50 PACE after your first 1 km run.
        </p>
      )}
      {APP_LIVE ? (
        <div className="actions" style={{ justifyContent: 'center' }}>
          <GetAppLink className="btn btn-dark" live="Get Runivo on iPhone" />
        </div>
      ) : (
        <WaitlistForm source="invite" />
      )}
    </DeepLinkPage>
  );
}
