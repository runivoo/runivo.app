/**
 * Where a visitor came from: a tagged link (?utm_source=instagram&utm_campaign=launch)
 * or the site that sent them. Used for waitlist sign-ups (migration 019).
 *
 * The website keeps the first touch of a visit in sessionStorage (the tab only, no
 * cookie) and sends it with the form; the server turns it into a platform here, so a
 * visitor can't put arbitrary labels into the reports.
 */

export interface Touch { source?: string; medium?: string; campaign?: string; referrer?: string }

const PLATFORMS: [string, RegExp][] = [
  ['instagram', /^(ig|insta|instagram)$|(^|\.)instagram\.com$/],
  ['x',         /^(x|twitter|tw)$|(^|\.)(x|twitter)\.com$|^t\.co$/],
  ['linkedin',  /^(li|linkedin)$|(^|\.)linkedin\.com$|^lnkd\.in$/],
  ['facebook',  /^(fb|facebook|meta)$|(^|\.)facebook\.com$|^fb\.me$/],
  ['whatsapp',  /^(wa|whatsapp)$|(^|\.)whatsapp\.com$|^wa\.me$/],
  ['youtube',   /^(yt|youtube)$|(^|\.)youtube\.com$|^youtu\.be$/],
  ['threads',   /^threads$|(^|\.)threads\.(net|com)$/],
  ['reddit',    /^reddit$|(^|\.)reddit\.com$/],
  ['strava',    /^strava$|(^|\.)strava\.com$/],
  ['email',     /^(email|newsletter|mail)$|(^|\.)(mail\.google|outlook\.live)\.com$/],
  ['search',    /^(google|bing|duckduckgo|ddg|yahoo)$|(^|\.)(google|bing|duckduckgo|yahoo)\.[a-z.]+$/],
];

/** A short lower-case slug: letters, digits, dash, underscore. */
export function slug(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max);
  return s || null;
}

/** The host of a referrer URL, without "www.", or null (also null for our own site). */
export function referrerHost(v: unknown): string | null {
  if (typeof v !== 'string' || !v) return null;
  try {
    const host = new URL(v.includes('://') ? v : `https://${v}`).hostname.toLowerCase().replace(/^www\./, '');
    if (!host || host === 'runivo.in' || host.endsWith('.runivo.in') || host === 'localhost') return null;
    return host.slice(0, 100);
  } catch { return null; }
}

/** instagram, x, linkedin, ... from the tag first, else from the referring site; "direct" when neither. */
export function platformOf(touch: Touch): string {
  const source = slug(touch.source, 30);
  const host = referrerHost(touch.referrer);
  for (const candidate of [source, host]) {
    if (!candidate) continue;
    const hit = PLATFORMS.find(([, re]) => re.test(candidate));
    if (hit) return hit[0];
  }
  if (source) return source;          // a tag we don't know yet, e.g. "college-fest"
  if (host) return 'other-site';
  return 'direct';
}

// ── Browser side ──────────────────────────────────────────────────────────────
const KEY = 'runivo-first-touch';

/** Remembers the first tagged link or referring site of this visit (call once per page load). */
export function rememberFirstTouch(): void {
  try {
    if (sessionStorage.getItem(KEY)) return;
    const q = new URLSearchParams(window.location.search);
    const touch: Touch = {
      source: q.get('utm_source') ?? q.get('ref') ?? undefined,
      medium: q.get('utm_medium') ?? undefined,
      campaign: q.get('utm_campaign') ?? undefined,
      referrer: referrerHost(document.referrer) ?? undefined,
    };
    sessionStorage.setItem(KEY, JSON.stringify(touch));
  } catch { /* storage blocked: sign-ups just count as direct */ }
}

export function firstTouch(): Touch {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Touch; } catch { return {}; }
}
