import Link from 'next/link';
import type { ReactNode } from 'react';
import { APP_LIVE, APP_STORE_URL, WAITLIST_HREF } from '@/lib/config/site';

/**
 * The one "get the app" link. Before launch it leads to the waitlist; after
 * launch (APP_LIVE in lib/config/site.ts) it leads to the App Store. `live` and
 * `waitlist` are the two labels, so each place can word its own button.
 */
export function GetAppLink({
  live = 'Download',
  waitlist = 'Join the waitlist',
  waitlistHref = WAITLIST_HREF,
  className,
  style,
}: {
  live?: ReactNode;
  waitlist?: ReactNode;
  /** Where the waitlist button goes. Pages with their own waitlist form point it at that form. */
  waitlistHref?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return APP_LIVE
    ? <a href={APP_STORE_URL} className={className} style={style}>{live}</a>
    : <Link href={waitlistHref} className={className} style={style}>{waitlist}</Link>;
}
