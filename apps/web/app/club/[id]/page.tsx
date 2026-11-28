import type { Metadata } from 'next';
import { DeepLinkPage, GetAppNote, OpenInAppButton } from '@/components/templates/DeepLinkPage';

export const metadata: Metadata = {
  title: 'Join a club on Runivo',
  description: 'You have been invited to a running club on Runivo.',
  robots: { index: false, follow: false },
};

/**
 * Where a club invite lands (apps/mobile clubService clubInviteLinks builds
 * https://www.runivo.in/club/<club id>?invite=<code>). Offers to open the club in
 * the app (runivo://club/<id>?invite=<code>, which joins), or to get the app first.
 */
export default async function ClubLinkPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  const { id: rawId } = await params;
  const { invite } = await searchParams;
  const id = /^[0-9a-f-]{36}$/i.test(rawId) ? rawId.toLowerCase() : null;
  const rawCode = Array.isArray(invite) ? invite[0] : invite;
  // Invite codes are short letters and digits; anything else is dropped, never passed on.
  const code = rawCode && /^[A-Za-z0-9_-]{4,64}$/.test(rawCode) ? rawCode : null;

  return (
    <DeepLinkPage title="You’re invited to a running club">
      {id && <OpenInAppButton href={`runivo://club/${id}${code ? `?invite=${encodeURIComponent(code)}` : ''}`} label="Open the club in Runivo" />}
      <GetAppNote again="open this link again." />
    </DeepLinkPage>
  );
}
