# Runivo web (`apps/web`)

The public website (runivo.in) and Studio, the staff admin at `/admin`. Next.js 15 (App Router), React 19, plain CSS for the site, Tailwind for Studio only. Deployed on Vercel from `main`.

## Where things live

```
app/            ROUTES ONLY: pages, API handlers, sitemap, robots, share images
  api/            waitlist, partners/apply (public) · admin/* (Studio, admin-only) · cron/admin-digest
components/     ALL UI, shared by every page
  layout/         Nav, MegaMenu, MobileMenu, Footer, Logo, PageShell, Motion, PostHogProvider
  ui/             Faq, LinkCard, EndCta, GetAppLink, Markdown, JsonLd
  forms/          WaitlistForm, Honeypot, FormSuccess
  templates/      LegalPage (privacy, terms), DeepLinkPage (invite, club and runner links)
  tools/          the three run calculators
  admin/          Studio: shell, sign-in screens, UI kit (ui.tsx), one file per section
content/        THE WORDS: features, tools, cities, glossary, blog/ (12 guides)
lib/            CODE, grouped by job
  config/         site.ts (constants and launch switch), nav.ts (every navigation link)
  seo/            seo.ts (metadata, JSON-LD), pages.ts (registry behind the sitemap and share images)
  content/        blog, posts, markdown, and the integrity and claims tests
  tools/          runMath.ts (the calculators' maths)
  email/          emailLayout (shared frame), waitlistEmail, broadcast
  forms/          postForm (client), attribution (where a sign-up came from)
  server/         adminServer (admin check, service client, input helpers), publicForm, rateLimit
  admin/          Studio's server logic: digest, stats, impact, AI helpers, event options
  auth/           supabase (browser client), adminApi (calls /api/admin with the admin's token)
  observability/  sentryInit, sentryScrub
styles/         globals.css (tokens), home, motion, pages, admin (Tailwind, loaded on /admin only)
```

Rules: pages in `app/` contain no styling or copy of their own beyond layout; words go in `content/`; anything used twice is a component in `components/` or a function in `lib/`. `npx jscpd` reports well under 1% duplicated code.

## What is wired to what (nothing is mocked)

| Feature | Route | Stored in |
|---|---|---|
| Waitlist sign-up | `POST /api/waitlist` | `public.waitlist` via `join_waitlist()` (service role only); a new address gets the welcome email (Resend) |
| Partner enquiry | `POST /api/partners/apply` | `public.partners` (status `applied`) via `submit_partner_application()` |
| Email broadcasts | `/api/admin/broadcasts/*` | `public.broadcasts` + Resend segments; every send has an unsubscribe link |
| Studio sections | `/api/admin/*` | partners, rewards and codes, campaigns, challenges, events, races, moderation, people, broadcasts, waitlist; every write is recorded in `public.admin_actions` (Activity) |
| Daily digest | `GET /api/cron/admin-digest` (Vercel Cron, `CRON_SECRET`) | emails admins; reads only |
| Analytics and errors | PostHog, Sentry | optional; off without their keys |
| Calculators, guides, glossary, city pages | none needed | static: the maths runs in the browser, the words are in `content/` |

Support is a `mailto:` link, not a form, so there is nothing to store.

## Protection

Anyone can open dev tools on any website, and the HTML, CSS and JavaScript they see is public by design. Protection is therefore on the server and in the database:

- **Studio:** every `/api/admin/*` handler runs through `adminRoute`, which checks the caller's Supabase token belongs to a profile with `subscription_tier = 'admin'` before using the service-role key (server only, never in the browser bundle). Writes accept only whitelisted, typed fields (`str`, `num`, `oneOf`, `httpsUrl`).
- **Public forms:** same-origin only (a form on another site is refused), a hidden honeypot field, a per-IP limit, an hourly cap inside the database function, and validation again in SQL. Errors never echo the database's message.
- **Database:** row-level security everywhere. The waitlist, broadcast and audit tables have no client grants, and the partners table has row-level security with no client policy, so a visitor's own key reads nothing from them (checked against the live project: permission denied, or no rows).
- **Headers:** a Content-Security-Policy listing the only hosts the site may load from or talk to (Supabase, PostHog, Sentry), no framing, HSTS, `nosniff`, a referrer policy, a permissions policy, `COOP`. The cron route compares its secret in constant time.
- **Admin pages:** `noindex`, and API responses are `no-store`.

## Run it

```
npm run dev --workspace=apps/web        # port 3004 (or: npx next dev -p 3000)
npm run typecheck --workspace=apps/web
npm test                                # from the repo root: includes the web tests
npx next build                          # stop the dev server first; they share .next
```

Environment variables are listed, with what each is for, in `.env.local.example`. Without the Supabase keys the site still renders; sign-ups and Studio need them.

## Launch switch

`lib/config/site.ts`: set `APP_LIVE = true` and `APP_STORE_URL` when the app is in the store. Every "Join the waitlist" button becomes "Download", and the app's structured data starts being emitted. What the site may say, and where each number comes from, is in `docs/WEBSITE_CLAIMS.md`; `lib/content/integrity.test.ts` enforces it.
