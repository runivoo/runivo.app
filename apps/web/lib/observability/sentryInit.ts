import * as Sentry from '@sentry/nextjs';
import { scrubPII } from './sentryScrub';

/** The one Sentry setup for the browser, the Node server and the edge. Does nothing without NEXT_PUBLIC_SENTRY_DSN. */
export function initSentry(): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    tracesSampleRate: 0.2,
    beforeSend: event => scrubPII(event),
    beforeBreadcrumb: breadcrumb => scrubPII(breadcrumb),
  });
}
