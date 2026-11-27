'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button, IconButton } from './ui';
import { NAV_GROUPS, type AdminTab } from './nav';

/**
 * The admin's frame: top bar, section navigation and the content area.
 *
 *   Large screens (lg and up): a sidebar you can collapse to icons. The choice is remembered.
 *   Smaller screens: the sidebar becomes a drawer opened from the menu button. It closes when you
 *   pick a section, press Escape or tap outside, keeps keyboard focus inside while open and hands
 *   focus back to the menu button.
 *
 * Every section renders inside the same content column, so they all share one width and padding.
 */

const COLLAPSE_KEY = 'runivo-admin-sidebar';
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function readCollapsed(): boolean {
  try { return localStorage.getItem(COLLAPSE_KEY) === 'collapsed'; } catch { return false; }
}

export function AdminShell({
  tab, onTabChange, onSignOut, children,
}: { tab: AdminTab; onTabChange: (tab: AdminTab) => void; onSignOut: () => void; children: ReactNode }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  const toggleCollapsed = () => {
    setCollapsed(c => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? 'expanded' : 'collapsed'); } catch { /* private mode: fine */ }
      return !c;
    });
  };

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuBtn.current?.focus();
  }, []);

  // A new section starts at the top, and screen readers land on the content.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo({ top: 0 });
    main.current?.focus({ preventScroll: true });
  }, [tab]);

  // Drawer: lock page scroll, move focus in, close on Escape, keep Tab inside.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.current?.querySelector<HTMLElement>('[aria-current="page"], nav button')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
      if (e.key !== 'Tab' || !drawer.current) return;
      const items = Array.from(drawer.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [drawerOpen, closeDrawer]);

  // Resizing up to a large screen while the drawer is open: close it.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => { if (mq.matches) setDrawerOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const pick = (id: AdminTab) => {
    onTabChange(id);
    if (drawerOpen) closeDrawer();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-100 flex items-center gap-2 px-3 sm:px-5">
        <IconButton
          ref={menuBtn} label="Open menu" className="lg:hidden"
          aria-expanded={drawerOpen} aria-controls="admin-drawer" onClick={() => setDrawerOpen(true)}
        >
          <Menu className="w-5 h-5" aria-hidden />
        </IconButton>
        <IconButton
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="hidden lg:inline-flex"
          aria-expanded={!collapsed} aria-controls="admin-sidebar" onClick={toggleCollapsed}
        >
          {collapsed ? <PanelLeftOpen className="w-5 h-5" aria-hidden /> : <PanelLeftClose className="w-5 h-5" aria-hidden />}
        </IconButton>

        <div className="flex items-center gap-3 min-w-0 ml-1">
          <Logo size={22} href={null} />
          <h1 className="text-sm font-medium text-gray-500 border-l border-gray-100 pl-3">Admin</h1>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" size="sm" className="px-3 sm:px-4" aria-label="View site" onClick={() => router.push('/')}>
            <ExternalLink className="w-4 h-4" aria-hidden /><span className="hidden sm:inline">View site</span>
          </Button>
          <Button variant="secondary" size="sm" className="px-3 sm:px-4" aria-label="Sign out" onClick={onSignOut}>
            <LogOut className="w-4 h-4" aria-hidden /><span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (large screens) */}
        <aside
          id="admin-sidebar"
          className={`hidden lg:block sticky top-16 h-[calc(100vh-4rem)] flex-shrink-0 overflow-y-auto overflow-x-hidden border-r border-gray-100 bg-white transition-[width] duration-200 ${collapsed ? 'w-[76px]' : 'w-60'}`}
        >
          <NavList tab={tab} onPick={pick} collapsed={collapsed} />
        </aside>

        {/* Content: the same column for every section */}
        <main ref={main} id="main" tabIndex={-1} className="flex-1 min-w-0 outline-none">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Drawer (smaller screens) */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <motion.div
              className="absolute inset-0 bg-gray-900/40" aria-hidden onClick={closeDrawer}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            />
            <motion.div
              ref={drawer} id="admin-drawer" role="dialog" aria-modal="true" aria-label="Admin sections"
              className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl flex flex-col"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="h-16 flex items-center justify-between gap-2 px-4 border-b border-gray-100">
                <Logo size={22} href={null} />
                <IconButton label="Close menu" onClick={closeDrawer}><X className="w-5 h-5" aria-hidden /></IconButton>
              </div>
              <div className="flex-1 overflow-y-auto">
                <NavList tab={tab} onPick={pick} collapsed={false} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The grouped section list. Collapsed, it shows icons only (the name stays available to screen readers and as a tooltip). */
function NavList({ tab, onPick, collapsed }: { tab: AdminTab; onPick: (id: AdminTab) => void; collapsed: boolean }) {
  return (
    <nav aria-label="Admin sections" className="py-3 px-3">
      {NAV_GROUPS.map((group, gi) => (
        <div key={group.label} className={gi > 0 ? 'mt-2' : undefined}>
          {collapsed
            ? (gi > 0 && <div className="mx-3 mb-2 border-t border-gray-100" aria-hidden />)
            : <p className="px-4 pt-3 pb-1 text-xs font-medium text-gray-400">{group.label}</p>}
          <ul className="flex flex-col gap-1">
            {group.items.map(({ id, label, Icon }) => {
              const active = tab === id;
              return (
                <li key={id}>
                  <button
                    type="button" onClick={() => onPick(id)}
                    aria-current={active ? 'page' : undefined} title={collapsed ? label : undefined}
                    className={`w-full flex items-center min-h-[44px] rounded-full text-sm transition-colors ${
                      collapsed ? 'justify-center' : 'gap-3 px-4'
                    } ${active ? 'bg-green-50 text-[#4E7F1F] font-semibold' : 'font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.8} aria-hidden />
                    <span className={collapsed ? 'sr-only' : 'truncate'}>{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
