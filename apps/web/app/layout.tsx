import '../styles/globals.css';
import '../styles/motion.css';
import { Inter, Outfit } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import { PostHogProvider } from '../components/layout/PostHogProvider';
import { Motion } from '@/components/layout/Motion';
import { JsonLd } from '@/components/ui/JsonLd';
import { staticPage } from '@/lib/seo/pages';
import { ogImagePath, organizationLd, websiteLd } from '@/lib/seo/seo';
import { SITE_NAME, SITE_URL } from '@/lib/config/site';

// Text uses the system font: SF Pro on iPhone, iPad and Mac (what Apple's own sites use), and
// Inter, which is drawn to match it, everywhere else. Outfit is kept only for the "runivo" wordmark.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const outfit = Outfit({ subsets: ['latin'], weight: ['300'], variable: '--font-outfit', display: 'swap' });

const HOME = staticPage('/');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Pages give a short title; the template adds the site name.
  title: { default: HOME.title, template: `%s — ${SITE_NAME}` },
  description: HOME.description,
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    locale: 'en_IN',
    type: 'website',
    images: [{ url: ogImagePath('/'), width: 1200, height: 630, alt: HOME.title }],
  },
  twitter: { card: 'summary_large_image', images: [ogImagePath('/')] },
};

export const viewport: Viewport = {
  themeColor: '#F4F5F1',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <PostHogProvider>{children}</PostHogProvider>
        <Motion />
        <JsonLd data={organizationLd()} />
        <JsonLd data={websiteLd()} />
      </body>
    </html>
  );
}
