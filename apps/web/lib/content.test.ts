import { describe, expect, it } from 'vitest';
import { FEATURE_LIST } from './features';
import { FEATURE_NAV, FEATURE_GROUPS, TOOLS_NAV, TOP_LINKS, FOOTER_LEARN } from './nav';
import { TOOL_PAGES } from './tools';
import { CITIES } from './cities';
import { TERMS } from './glossary';
import { POSTS, getPost } from './posts';
import { PAGES } from './pages';
import { CATEGORIES, categorySlug } from './blog';
import { internalLinks, plainText } from './markdown';
import { ENGINE } from '../../../packages/shared/src/engine/runEngine';

/** Every route that exists besides the registered pages. */
const OTHER_ROUTES = ['/privacy', '/terms', '/partners', '/support', '/blog/rss.xml'];
const KNOWN = new Set([...PAGES.map(p => p.path), ...OTHER_ROUTES]);

const blogAnchors = new Set(CATEGORIES.map(c => `/blog#${categorySlug(c)}`));
const ok = (href: string) => KNOWN.has(href.split('#')[0] || '/') || blogAnchors.has(href);

describe('content integrity', () => {
  it('has a page for every feature in the menu, and none extra', () => {
    expect(FEATURE_LIST.map(f => f.slug).sort()).toEqual(FEATURE_NAV.map(f => f.slug).sort());
    expect(FEATURE_GROUPS.flatMap(g => g.items).length).toBe(FEATURE_NAV.length);
    expect(TOOL_PAGES.map(t => t.slug).sort()).toEqual(TOOLS_NAV.map(t => t.slug).sort());
  });

  it('only links to pages that exist', () => {
    const links: [string, string][] = [];
    for (const l of [...TOP_LINKS, ...FOOTER_LEARN]) links.push(['nav', l.href]);
    for (const p of POSTS) {
      for (const h of internalLinks(p.body)) links.push([`post ${p.slug}`, h]);
      if (p.feature) links.push([`post ${p.slug} feature`, `/features/${p.feature}`]);
      for (const t of p.tools ?? []) links.push([`post ${p.slug} tool`, `/tools/${t}`]);
      for (const n of p.next ?? []) links.push([`post ${p.slug} next`, `/blog/${n}`]);
    }
    for (const f of FEATURE_LIST) {
      for (const sec of f.sections) if (sec.link) links.push([`feature ${f.slug} link`, sec.link[1]]);
      for (const g of f.guides) links.push([`feature ${f.slug} guide`, `/blog/${g}`]);
      for (const t of f.tools) links.push([`feature ${f.slug} tool`, `/tools/${t}`]);
      for (const r of f.related) links.push([`feature ${f.slug} related`, `/features/${r}`]);
    }
    for (const t of TOOL_PAGES) for (const g of t.guides) links.push([`tool ${t.slug} guide`, `/blog/${g}`]);
    for (const t of TERMS) for (const [, href] of t.links ?? []) links.push([`term ${t.id}`, href]);
    const broken = links.filter(([, h]) => !ok(h)).map(([from, h]) => `${from} -> ${h}`);
    expect(broken).toEqual([]);
  });

  it('has unique post slugs, titles and valid fields', () => {
    expect(new Set(POSTS.map(p => p.slug)).size).toBe(POSTS.length);
    for (const p of POSTS) {
      expect(getPost(p.slug)).toBe(p);
      expect(CATEGORIES).toContain(p.category);
      expect(p.updated >= p.published, `${p.slug} dates`).toBe(true);
      expect(p.readMinutes).toBeGreaterThanOrEqual(1);
      expect(plainText(p.body).split(/\s+/).length, `${p.slug} length`).toBeGreaterThan(300);
    }
    expect(POSTS.length).toBe(12);
  });

  it('has unique city and glossary entries', () => {
    expect(new Set(CITIES.map(c => c.slug)).size).toBe(CITIES.length);
    expect(new Set(TERMS.map(t => t.id)).size).toBe(TERMS.length);
    for (const c of CITIES) expect(c.spots.length, c.slug).toBeGreaterThanOrEqual(3);
  });
});

/** All visible words on the marketing content, with where each came from. */
function allText(): [string, string][] {
  const out: [string, string][] = [];
  for (const f of FEATURE_LIST) {
    out.push([`feature ${f.slug}`, [f.title, f.description, f.h1, f.lead, ...f.facts.flat(),
      ...f.sections.flatMap(s => [s.heading, s.intro ?? '', ...(s.lines ?? []), ...(s.items ?? []).flat()]),
      ...f.faqs.flat()].join('\n')]);
  }
  for (const p of POSTS) out.push([`post ${p.slug}`, [p.title, p.description, plainText(p.body)].join('\n')]);
  for (const t of TOOL_PAGES) out.push([`tool ${t.slug}`, [t.title, t.description, t.lead, ...t.method.paragraphs, ...t.faqs.flat()].join('\n')]);
  for (const c of CITIES) out.push([`city ${c.slug}`, [c.description, c.intro, c.season, ...c.spots.map(s => s.note), ...c.tips, c.race ?? ''].join('\n')]);
  for (const t of TERMS) out.push([`term ${t.id}`, t.definition]);
  return out;
}

describe('claims we must not make (see docs/WEBSITE_CLAIMS.md)', () => {
  const BANNED: [RegExp, string][] = [
    [/available now|download now|now available|out now/i, 'the app is not released'],
    [/free forever/i, 'free at launch only'],
    [/cheat[- ]?proof|unhackable/i, 'no system is perfect'],
    [/thousands of runners|\d+k\+? runners|\d[\d,]* runners (use|trust)/i, 'no user counts'],
    [/testimonial|rated \d/i, 'no reviews exist'],
    [/\bRunivo Plus\b|\bsubscription|\bpremium\b/i, 'subscriptions are off'],
    [/health connect|wear os|android app is (live|available)/i, 'not built or not live'],
    [/\bnutrition\b|calorie|macro/i, 'nutrition is parked'],
    [/\b(brooks|nike|adidas|puma|decathlon|asics)\b/i, 'no partner is live; do not name brands'],
    [/20\+ sports|\d\d\+ sports/i, 'seven sports plus treadmill'],
    [/hexagons?\b.*\bclaim|claim.*\bhexagons?\b/i, 'zones are route strips, not hexagons'],
    [/\btokens?\b/i, 'PACE is reward points, not a token'],
  ];

  for (const [pattern, why] of BANNED) {
    it(`never says ${pattern} (${why})`, () => {
      const hits = allText().filter(([, text]) => pattern.test(text)).map(([where]) => where);
      expect(hits).toEqual([]);
    });
  }

  it('only mentions watch brands to say they are not available', () => {
    const hits = allText()
      .flatMap(([where, text]) => text.split(/(?<=[.!?])\s+|\n/).filter(s => /garmin|coros|polar/i.test(s)).map(s => [where, s] as const))
      .filter(([, s]) => !/\bnot (yet )?(available|supported|connected)|\bnot available yet|\bare not|\bis not|\bno\b/i.test(s))
      .map(([where, s]) => `${where}: ${s}`);
    expect(hits).toEqual([]);
  });
});

describe('numbers match the app', () => {
  const text = (f: string) => allText().find(([w]) => w === f)![1];

  it('PACE earning and ranks', () => {
    const t = text('feature pace-rewards');
    expect(t).toContain(`${ENGINE.PACE_PER_KM} PACE for each whole kilometre`);
    expect(t).toContain(`${ENGINE.PACE_PER_NEW_ZONE} PACE for a new zone`);
    expect(t).toContain(`${ENGINE.PACE_PER_STOLEN_ZONE} for each rival zone`);
    expect(t).toContain(`${ENGINE.PACE_STREAK_BONUS} PACE each time your streak reaches a multiple of ${ENGINE.STREAK_BONUS_EVERY_DAYS} days`);
    const r = ENGINE.RANK_THRESHOLDS;
    expect(t).toContain(`Strider at ${r.strider}, Chaser at ${r.chaser}, Hunter at ${r.hunter.toLocaleString('en-US')} and Sovereign at ${r.sovereign.toLocaleString('en-US')}`);
  });

  it('zones', () => {
    const t = text('feature zones');
    expect(t).toContain(`${ENGINE.CORRIDOR_HALF_WIDTH_M * 2} m wide strip`);
    expect(t).toContain(`within ${ENGINE.LOOP_CLOSE_DIST_M} m of an earlier point`);
    expect(t).toContain(`loop of at least ${ENGINE.LOOP_MIN_PERIMETER_M} m`);
    expect(t).toContain(`At least ${ENGINE.MIN_TERRITORY_DIST_M} m, ${ENGINE.MIN_GPS_POINTS} clean GPS points and ${ENGINE.MIN_TERRITORY_AREA_M2} m²`);
    expect(t).toContain(`${ENGINE.FRESHNESS_DECAY_PER_DAY} a day`);
    expect(t).toContain(`Below ${ENGINE.FRESHNESS_STALE_AT} it is stale`);
  });

  it('GPS checks', () => {
    const t = text('post how-gps-run-tracking-works');
    expect(t).toContain(`accuracy worse than ${ENGINE.GPS_ACCURACY_THRESHOLD_M} m`);
    expect(t).toContain(`more than ${ENGINE.MAX_SEGMENT_SPEED_MS} m/s`);
  });

  it('sports that earn PACE', () => {
    expect(ENGINE.TERRITORY_ACTIVITIES).not.toContain('ride');
    for (const a of ['run', 'trail_run', 'walk', 'hike', 'wheelchair', 'stroller']) expect(ENGINE.TERRITORY_ACTIVITIES).toContain(a);
  });
});
