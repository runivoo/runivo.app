'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CaretDown, List, X } from '@phosphor-icons/react/ssr';
import { FEATURE_NAV, TOP_LINKS } from '@/lib/config/nav';
import { GetAppLink } from '@/components/ui/GetAppLink';

/**
 * The menu on phones and small tablets (the inline links are hidden under 860px).
 * Features expands to its pages. The page behind does not scroll while it is open,
 * Escape closes it and focus goes back to the menu button.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [features, setFeatures] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const close = () => { setOpen(false); setFeatures(false); };

  // Close after navigating.
  useEffect(() => { setOpen(false); setFeatures(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setFeatures(false); button.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    // A wider screen shows the inline links instead.
    const mq = window.matchMedia('(min-width: 861px)');
    const onWide = () => { if (mq.matches) { setOpen(false); setFeatures(false); } };
    mq.addEventListener('change', onWide);
    return () => {
      window.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onWide);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        ref={button} type="button" className="menu-btn" aria-expanded={open} aria-controls="mobile-menu"
        aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? <X size={20} weight="light" aria-hidden /> : <List size={20} weight="light" aria-hidden />}
      </button>
      {open && (
        <div id="mobile-menu" className="menu-panel">
          <button
            type="button" className="menu-link menu-toggle" aria-expanded={features} aria-controls="mobile-features"
            onClick={() => setFeatures(f => !f)}
          >
            Features <CaretDown size={18} weight="bold" aria-hidden className={features ? 'flip' : undefined} />
          </button>
          {features && (
            <ul id="mobile-features" className="menu-sub">
              <li><Link href="/features" className="menu-sublink" onClick={close}>All features</Link></li>
              {FEATURE_NAV.map(f => (
                <li key={f.slug}><Link href={`/features/${f.slug}`} className="menu-sublink" onClick={close}>{f.label}</Link></li>
              ))}
            </ul>
          )}
          {TOP_LINKS.map(l => (
            <Link key={l.href} href={l.href} className="menu-link" onClick={close}>{l.label}</Link>
          ))}
          <div className="menu-cta">
            <GetAppLink className="btn btn-dark" waitlist="Join the waitlist" />
          </div>
        </div>
      )}
    </>
  );
}
