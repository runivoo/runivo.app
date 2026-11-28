import type { Metadata } from 'next';
import './admin.css';

// The admin is for staff only: keep it out of search results and give the tab a clear title.
export const metadata: Metadata = {
  title: 'Admin — Runivo',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
