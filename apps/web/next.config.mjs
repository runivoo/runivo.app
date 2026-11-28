import { withSentryConfig } from '@sentry/nextjs';

// Headers for every page and API route: no framing by other sites (clickjacking), transport and
// referrer policy, and a Content-Security-Policy that lists exactly which hosts the site may load
// from or talk to. Next needs inline scripts and styles to hydrate pages (nonces would force every
// page to render per request), so 'unsafe-inline' stays; the host lists are what stop a script or
// request to anywhere else. Browsers cannot be stopped from opening dev tools, so what protects the
// site is on the server: every /api/admin route checks the admin's token, writes go through
// validated fields, forms are same-origin only and rate limited, and the database enforces its own rules.
const host = (value, fallback) => { try { return new URL(value || fallback).origin; } catch { return new URL(fallback).origin; } };
const isDev = process.env.NODE_ENV !== 'production';

const supabase = host(process.env.NEXT_PUBLIC_SUPABASE_URL, 'https://placeholder.supabase.co');
const posthog = host(process.env.NEXT_PUBLIC_POSTHOG_HOST, 'https://us.i.posthog.com');
const posthogAssets = posthog.replace('.i.posthog.com', '-assets.i.posthog.com');
const sentry = ['https://*.ingest.sentry.io', 'https://*.ingest.us.sentry.io', 'https://*.ingest.de.sentry.io'];

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} ${posthogAssets}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabase.replace('https://', 'wss://')} ${posthog} ${posthogAssets} ${sentry.join(' ')}${isDev ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
];

/** @type {import('next').NextConfig} */
const config = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

// org/project are only needed for source-map upload at build time (requires a
// SENTRY_AUTH_TOKEN env var in CI) — without them set, the Sentry build plugin skips
// upload rather than failing the build, so this is safe to leave unconfigured locally.
export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
});
