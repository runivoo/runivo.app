'use client';
export const dynamic = 'force-dynamic';

/**
 * Admin CMS — /admin
 *
 * Access: profiles.subscription_tier = 'admin'
 * To grant access, run in Supabase SQL editor (protect_profile_columns resets the
 * tier on a plain update, so switch it off for that one statement):
 *   begin;
 *   alter table public.profiles disable trigger profiles_protect_columns;
 *   update public.profiles set subscription_tier = 'admin' where id = '<user-id>';
 *   alter table public.profiles enable trigger profiles_protect_columns;
 *   commit;
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { AdminShell } from './AdminShell';
import { AccessDeniedScreen, LoadingScreen, SignInScreen } from './AuthScreens';
import { DEFAULT_TAB, asTab, type AdminTab } from './nav';
import OverviewSection from './sections/OverviewSection';
import ActivitySection from './sections/ActivitySection';
import PeopleSection from './sections/PeopleSection';
import ModerationSection from './sections/ModerationSection';
import RacesSection from './sections/RacesSection';
import PartnersSection from './sections/PartnersSection';
import StoreSection from './sections/StoreSection';
import ReportsSection from './sections/ReportsSection';
import CampaignsSection from './sections/CampaignsSection';
import EventsSection from './sections/EventsSection';
import WaitlistSection from './sections/WaitlistSection';

// One component per tab. Add a section here and in nav.ts.
const SECTIONS: Record<AdminTab, () => React.ReactNode> = {
  overview:   () => <OverviewSection />,
  people:     () => <PeopleSection />,
  activity:   () => <ActivitySection />,
  moderation: () => <ModerationSection />,
  races:      () => <RacesSection />,
  partners:   () => <PartnersSection />,
  store:      () => <StoreSection />,
  reports:    () => <ReportsSection />,
  campaigns:  () => <CampaignsSection />,
  events:     () => <EventsSection />,
  waitlist:   () => <WaitlistSection />,
};

type AccessState = 'loading' | 'granted' | 'denied' | 'signed_out';

export default function AdminPage() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>('loading');
  const [tab, setTabState] = useState<AdminTab>(DEFAULT_TAB);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const checkAccess = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setAccess('signed_out'); return; }
    const { data } = await supabase.from('profiles').select('subscription_tier').eq('id', session.user.id).single();
    setAccess(data?.subscription_tier === 'admin' ? 'granted' : 'denied');
  }, []);

  useEffect(() => { checkAccess(); }, [checkAccess]);

  // The section lives in the URL hash (/admin#partners), so a refresh or a shared link lands on the same section.
  useEffect(() => {
    const fromHash = () => { const t = asTab(window.location.hash.slice(1)); if (t) setTabState(t); };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);
  const setTab = useCallback((t: AdminTab) => {
    setTabState(t);
    window.history.replaceState(null, '', `#${t}`);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmail(''); setPassword('');
    setAccess('signed_out');
  };

  const signIn = async () => {
    setSigningIn(true);
    setSignInError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSigningIn(false);
    if (error) { setSignInError(error.message); return; }
    await checkAccess();
  };

  if (access === 'loading') return <LoadingScreen />;
  if (access === 'signed_out') {
    return (
      <SignInScreen
        email={email} password={password} error={signInError} busy={signingIn}
        onEmail={setEmail} onPassword={setPassword} onSubmit={signIn}
      />
    );
  }
  if (access === 'denied') return <AccessDeniedScreen onHome={() => router.push('/')} onSignOut={signOut} />;

  return (
    <MotionConfig reducedMotion="user">
      <AdminShell tab={tab} onTabChange={setTab} onSignOut={signOut}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          >
            {SECTIONS[tab]()}
          </motion.div>
        </AnimatePresence>
      </AdminShell>
    </MotionConfig>
  );
}
