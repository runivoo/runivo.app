import type { Metadata } from 'next';
import { DeepLinkPage, GetAppNote, OpenInAppButton } from '@/components/templates/DeepLinkPage';

export const metadata: Metadata = {
  title: 'Follow on Runivo',
  description: 'Follow this runner on Runivo.',
  robots: { index: false, follow: false },
};

/**
 * Where a profile QR code or "Send link" lands (apps/mobile profileCard.ts
 * builds https://www.runivo.in/r/<user id>?u=<username>). Offers to open the
 * runner in the app (runivo://runner/<id>), or to get the app first.
 */
export default async function RunnerLinkPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ u?: string | string[] }>;
}) {
  const { id: rawId } = await params;
  const { u } = await searchParams;
  const id = /^[0-9a-f-]{36}$/i.test(rawId) ? rawId.toLowerCase() : null;
  const rawName = Array.isArray(u) ? u[0] : u;
  // Usernames are letters, digits and underscores; anything else is dropped, never rendered.
  const name = rawName && /^[A-Za-z0-9_]{1,30}$/.test(rawName) ? rawName : null;

  return (
    <DeepLinkPage title={name ? `Follow @${name} on Runivo` : 'Follow this runner on Runivo'}>
      {id && <OpenInAppButton href={`runivo://runner/${id}`} label="Open in Runivo" />}
      <GetAppNote again="scan the code again." />
    </DeepLinkPage>
  );
}
