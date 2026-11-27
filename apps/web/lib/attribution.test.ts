import { describe, it, expect } from 'vitest';
import { platformOf, referrerHost, slug } from './attribution';

describe('platformOf', () => {
  it('reads tagged links', () => {
    expect(platformOf({ source: 'Instagram' })).toBe('instagram');
    expect(platformOf({ source: 'ig' })).toBe('instagram');
    expect(platformOf({ source: 'twitter' })).toBe('x');
    expect(platformOf({ source: 'wa' })).toBe('whatsapp');
  });
  it('falls back to the referring site', () => {
    expect(platformOf({ referrer: 'https://l.instagram.com/?u=x' })).toBe('instagram');
    expect(platformOf({ referrer: 'https://t.co/abc' })).toBe('x');
    expect(platformOf({ referrer: 'https://www.google.co.in/' })).toBe('search');
    expect(platformOf({ referrer: 'https://www.linkedin.com/feed' })).toBe('linkedin');
  });
  it('prefers the tag over the referrer', () => {
    expect(platformOf({ source: 'linkedin', referrer: 'https://t.co/x' })).toBe('linkedin');
  });
  it('keeps unknown tags as a clean slug, and says direct when there is nothing', () => {
    expect(platformOf({ source: 'College Fest!' })).toBe('college-fest');
    expect(platformOf({ referrer: 'https://someblog.example/post' })).toBe('other-site');
    expect(platformOf({})).toBe('direct');
  });
  it('ignores our own site as a referrer', () => {
    expect(referrerHost('https://www.runivo.in/partners')).toBeNull();
    expect(platformOf({ referrer: 'https://runivo.in/' })).toBe('direct');
  });
  it('slugs never carry markup', () => {
    expect(slug('<script>alert(1)</script>', 30)).toBe('script-alert-1-script');
  });
});
