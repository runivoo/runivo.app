import type { Metadata } from 'next';

// A one-off link from an email: keep it out of search results.
export const metadata: Metadata = {
  title: 'Reset your password',
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
