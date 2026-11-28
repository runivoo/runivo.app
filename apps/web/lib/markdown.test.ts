import { describe, expect, it } from 'vitest';
import { internalLinks, parseInline, parseMarkdown, plainText } from './markdown';

describe('markdown', () => {
  it('parses headings, paragraphs and lists', () => {
    const blocks = parseMarkdown('## Why it works\n\nSome **bold** and *soft* text with a [link](/blog/x).\n\n- one\n- two\n\n1. first\n2. second\n\n> note');
    expect(blocks.map(b => b.t)).toEqual(['h2', 'p', 'ul', 'ol', 'quote']);
    expect(blocks[0]).toMatchObject({ t: 'h2', id: 'why-it-works' });
    expect(blocks[2]).toMatchObject({ t: 'ul', items: [[{ t: 'text', v: 'one' }], [{ t: 'text', v: 'two' }]] });
  });

  it('parses inline marks', () => {
    expect(parseInline('a **b** [c](/d) e')).toEqual([
      { t: 'text', v: 'a ' },
      { t: 'strong', v: [{ t: 'text', v: 'b' }] },
      { t: 'text', v: ' ' },
      { t: 'link', href: '/d', v: [{ t: 'text', v: 'c' }] },
      { t: 'text', v: ' e' },
    ]);
  });

  it('finds internal links and strips marks', () => {
    const src = 'See [one](/blog/a) and [two](https://example.com) and [three](/tools/b).';
    expect(internalLinks(src)).toEqual(['/blog/a', '/tools/b']);
    expect(plainText('## Hi\n\n**bold** [x](/y)')).toBe('Hi\n\nbold x');
  });
});
