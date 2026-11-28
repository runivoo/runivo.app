import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/ssr';

/** A plain link block: a small label, a title, a sentence and a quiet "more" link. No box, no colour. */
export function LinkCard({
  href, title, text, meta, more = 'Read more', icon,
}: { href: string; title: string; text: string; meta?: string; more?: string; icon?: React.ReactNode }) {
  return (
    <Link href={href} className="link-card">
      {icon}
      {meta && <span className="meta">{meta}</span>}
      <h3>{title}</h3>
      <p>{text}</p>
      <span className="more">{more} <CaretRight size={14} weight="bold" aria-hidden /></span>
    </Link>
  );
}
