'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Site-wide motion, mounted once in the root layout. It renders nothing.
 *
 * 1. Scroll reveals: blocks below the first screen fade and rise as they enter the
 *    viewport, staggered within a row. A block the page jumps past is shown at once. Only blocks that are off-screen at load are
 *    hidden, so nothing flashes, and the hidden state is removed again once the
 *    transition ends so hover effects are not slowed by it. The hero has its own
 *    load animation (.rise) and is left alone.
 * 2. A "scrolled" flag on <html> for the nav shadow and the scroll progress line.
 *
 * Nothing happens for people who ask for reduced motion or on the admin pages. Without JavaScript every block is simply visible.
 * The styles are in styles/motion.css.
 */

// Blocks that reveal. A block inside another revealed block is skipped (the outer one carries it).
const TARGETS = [
  '.section .eyebrow', '.section-sm .eyebrow',
  '.h-section', '.section .h-display', '.section > .container > .lead',
  '.step', '.extra', '.facts-row', '.home-feature', '.band', '.faq-item',
  '.waitlist', '.spec', '.link-card', '.sec', '.tool-panel',
].join(',');

const REVEAL_MS = 700;
const STAGGER_MS = 70;
const MAX_STAGGER = 5;

export function Motion() {
  const pathname = usePathname();

  // Nav shadow + progress line flag.
  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    const root = document.documentElement;
    root.dataset.motion = '';
    const onScroll = () => {
      if (window.scrollY > 8) root.dataset.scrolled = '';
      else delete root.dataset.scrolled;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      delete root.dataset.motion;
      delete root.dataset.scrolled;
    };
  }, [pathname]);

  // Scroll reveals, set up again after every navigation.
  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timers: number[] = [];
    const seenInRow = new Map<Element, number>();

    const all = Array.from(document.querySelectorAll<HTMLElement>(TARGETS)).filter(
      el => !el.closest('.hero') && !el.parentElement?.closest(TARGETS),
    );

    // Only blocks that start below the first screen are hidden; the rest are left alone.
    let waiting: HTMLElement[] = [];
    for (const el of all) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) continue;
      const parent = el.parentElement as Element;
      const n = seenInRow.get(parent) ?? 0;
      seenInRow.set(parent, n + 1);
      el.style.setProperty('--rv-d', `${Math.min(n, MAX_STAGGER) * STAGGER_MS}ms`);
      el.dataset.rv = 'hide';
      waiting.push(el);
    }

    // Reveal what has come into view. This also catches blocks the page jumped past in one go
    // (anchor link, restored scroll position, End key): those are above the viewport, so they
    // are shown at once with no animation, never left hidden.
    let frame = 0;
    const sweep = () => {
      frame = 0;
      const vh = window.innerHeight;
      const still: HTMLElement[] = [];
      for (const el of waiting) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0) { delete el.dataset.rv; continue; }
        if (r.top >= vh * 0.92) { still.push(el); continue; }
        el.dataset.rv = 'in';
        const delay = parseInt(el.style.getPropertyValue('--rv-d') || '0', 10);
        // Drop the hidden-state rules once finished so hover transitions are not delayed.
        timers.push(window.setTimeout(() => { delete el.dataset.rv; }, REVEAL_MS + delay + 80));
      }
      waiting = still;
      if (!waiting.length) { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); }
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(sweep); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      timers.forEach(t => window.clearTimeout(t));
      for (const el of all) { delete el.dataset.rv; el.style.removeProperty('--rv-d'); }
    };
  }, [pathname]);

  return null;
}
