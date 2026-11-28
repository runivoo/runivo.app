/**
 * A deliberately small markdown reader for the guides: headings (## and ###), paragraphs,
 * bullet and numbered lists, > callouts, and **bold**, *italic* and [links](/path) inside text.
 * Anything else is plain text. Pure data out, so it is tested (markdown.test.ts).
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; v: Inline[] }
  | { t: 'em'; v: Inline[] }
  | { t: 'link'; href: string; v: Inline[] };

export type Block =
  | { t: 'h2' | 'h3'; id: string; v: Inline[]; text: string }
  | { t: 'p'; v: Inline[] }
  | { t: 'ul' | 'ol'; items: Inline[][] }
  | { t: 'quote'; v: Inline[] };

export const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const TOKEN = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let rest = src;
  while (rest) {
    const m = TOKEN.exec(rest);
    if (!m) { out.push({ t: 'text', v: rest }); break; }
    if (m.index > 0) out.push({ t: 'text', v: rest.slice(0, m.index) });
    if (m[1] !== undefined) out.push({ t: 'strong', v: parseInline(m[1]) });
    else if (m[2] !== undefined) out.push({ t: 'em', v: parseInline(m[2]) });
    else out.push({ t: 'link', href: m[4], v: parseInline(m[3]) });
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of src.trim().split(/\n\s*\n/)) {
    const lines = raw.split('\n').map(l => l.trimEnd()).filter(Boolean);
    if (!lines.length) continue;
    const first = lines[0];
    if (first.startsWith('### ')) { const text = first.slice(4); blocks.push({ t: 'h3', id: slugify(text), v: parseInline(text), text }); continue; }
    if (first.startsWith('## ')) { const text = first.slice(3); blocks.push({ t: 'h2', id: slugify(text), v: parseInline(text), text }); continue; }
    if (lines.every(l => l.startsWith('- '))) { blocks.push({ t: 'ul', items: lines.map(l => parseInline(l.slice(2))) }); continue; }
    if (lines.every(l => /^\d+\.\s/.test(l))) { blocks.push({ t: 'ol', items: lines.map(l => parseInline(l.replace(/^\d+\.\s/, ''))) }); continue; }
    if (lines.every(l => l.startsWith('> '))) { blocks.push({ t: 'quote', v: parseInline(lines.map(l => l.slice(2)).join(' ')) }); continue; }
    blocks.push({ t: 'p', v: parseInline(lines.join(' ')) });
  }
  return blocks;
}

/** Plain text of a post body, for length checks and the claims scan. */
export function plainText(src: string): string {
  return src.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^(#+|>|-|\d+\.)\s/gm, '');
}

/** Every internal link (/something) used in a body. */
export function internalLinks(src: string): string[] {
  return Array.from(src.matchAll(/\]\((\/[^)\s]*)\)/g), m => m[1]);
}
