'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, CaretDown } from '@phosphor-icons/react/ssr';
import { ACCENT_HEX, FEATURE_GROUPS } from '@/lib/nav';

/**
 * "Features" in the header. The word itself is a real link to /features; the chevron beside it
 * opens a panel listing every feature page. The panel opens when the pointer is on it or when
 * keyboard focus is inside, closes on Escape or when you leave, and hands focus back to the
 * chevron. The links are always in the page HTML (the panel is hidden with CSS, not removed), so
 * search engines and screen readers can find them.
 */
export function MegaMenu() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const caret = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const openNow = () => { cancel(); setOpen(true); };
  const closeSoon = () => { cancel(); timer.current = setTimeout(() => setOpen(false), 140); };

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => cancel, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      if (wrap.current?.contains(document.activeElement)) caret.current?.focus();
    };
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open]);

  return (
    <div
      ref={wrap} className="mega-wrap"
      onPointerEnter={e => { if (e.pointerType === 'mouse') openNow(); }}
      onPointerLeave={e => { if (e.pointerType === 'mouse') closeSoon(); }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}
    >
      <Link href="/features" className="nav-link mega-link" aria-current={pathname.startsWith('/features') ? 'page' : undefined}>Features</Link>
      <button
        ref={caret} type="button" className="mega-caret" aria-label="Features menu"
        aria-expanded={open} aria-controls="features-menu" onClick={() => setOpen(o => !o)}
      >
        <CaretDown size={14} weight="bold" aria-hidden />
      </button>

      <div id="features-menu" className="mega" data-open={open}>
        <div className="container">
          <div className="mega-grid">
            {FEATURE_GROUPS.map(group => (
              <div key={group.label}>
                <p className="mega-heading">{group.label}</p>
                <ul>
                  {group.items.map(({ slug, label, blurb, icon: Icon, accent }) => (
                    <li key={slug}>
                      <Link href={`/features/${slug}`} className="mega-item">
                        <span className="mega-icon"><Icon size={24} weight="light" color={ACCENT_HEX[accent]} aria-hidden /></span>
                        <span>
                          <span className="mega-label">{label}</span>
                          <span className="mega-blurb">{blurb}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mega-foot">
            <Link href="/features" className="mega-all">See everything Runivo does <ArrowRight size={15} weight="bold" aria-hidden /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
