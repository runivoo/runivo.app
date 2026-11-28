import { describe, expect, it } from 'vitest';
import { PAGES } from './pages';
import { absoluteUrl, articleLd, breadcrumbLd, definedTermSetLd, faqLd, jsonLdString, organizationLd, pageMetadata } from './seo';
import { SITE_URL } from './site';
import sitemap from '../app/sitemap';

describe('page registry', () => {
  it('has unique paths and titles', () => {
    const paths = PAGES.map(p => p.path);
    expect(new Set(paths).size).toBe(paths.length);
    const titles = PAGES.map(p => p.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('keeps titles and descriptions a searchable length', () => {
    for (const p of PAGES) {
      const full = p.absolute ? p.title : `${p.title} — Runivo`;
      expect(full.length, `title of ${p.path}: "${full}"`).toBeLessThanOrEqual(60);
      expect(p.description.length, `description of ${p.path}`).toBeGreaterThanOrEqual(70);
      expect(p.description.length, `description of ${p.path}`).toBeLessThanOrEqual(160);
      expect(p.updated, `date of ${p.path}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('puts every page in the sitemap', () => {
    const urls = sitemap().map(e => e.url);
    expect(urls).toEqual(PAGES.map(p => absoluteUrl(p.path)));
    expect(sitemap().every(e => e.lastModified)).toBe(true);
  });
});

describe('metadata and structured data', () => {
  it('sets a canonical address, Open Graph and Twitter card', () => {
    const m = pageMetadata({ title: 'Zones', description: 'd'.repeat(80), path: '/features/zones' });
    expect(m.alternates?.canonical).toBe(`${SITE_URL}/features/zones`);
    expect(m.openGraph).toMatchObject({ url: `${SITE_URL}/features/zones`, title: 'Zones — Runivo', type: 'website' });
    expect(JSON.stringify(m.openGraph?.images)).toContain('/og/features/zones');
    expect(m.twitter).toMatchObject({ card: 'summary_large_image' });
  });

  it('marks articles as articles and the home title as absolute', () => {
    const a = pageMetadata({ title: 'T', description: 'd', path: '/blog/x', publishedTime: '2026-11-28', modifiedTime: '2026-11-28' });
    expect(a.openGraph).toMatchObject({ type: 'article', publishedTime: '2026-11-28' });
    const home = pageMetadata({ title: 'Runivo: x', description: 'd', path: '/', absolute: true });
    expect(home.title).toEqual({ absolute: 'Runivo: x' });
    expect(home.alternates?.canonical).toBe(`${SITE_URL}/`);
  });

  it('builds valid structured data', () => {
    expect(absoluteUrl('/a')).toBe(`${SITE_URL}/a`);
    const crumbs = breadcrumbLd([{ name: 'Guides', href: '/blog' }, { name: 'X', href: '/blog/x' }]);
    expect((crumbs.itemListElement as { position: number; name: string }[]).map(i => `${i.position}:${i.name}`)).toEqual(['1:Home', '2:Guides', '3:X']);
    expect(faqLd([['Q?', 'A.']]).mainEntity).toHaveLength(1);
    expect(articleLd({ title: 't', description: 'd', path: '/blog/x', published: '2026-11-28', modified: '2026-11-28' })['@type']).toBe('Article');
    expect(definedTermSetLd([{ term: 'Pace', id: 'pace', definition: 'x' }]).hasDefinedTerm).toHaveLength(1);
    expect(organizationLd()['@type']).toBe('Organization');
  });

  it('cannot be broken out of its script tag', () => {
    const s = jsonLdString({ name: '</script><script>alert(1)</script>' });
    expect(s).not.toContain('</script>');
    expect(JSON.parse(s).name).toBe('</script><script>alert(1)</script>');
  });
});
