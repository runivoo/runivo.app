'use client';

import { useState } from 'react';
import { ShieldWarning } from '@phosphor-icons/react/ssr';
import { Logo } from '@/components/layout/Logo';
import { supabase } from '@/lib/supabase';
import { Button, inputClass, labelClass } from './ui';

const SHELL = 'min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-10';
const CARD = 'w-full max-w-sm rounded-2xl bg-white border border-gray-100 p-8';

// profiles_protect_columns resets subscription_tier on a plain update, so it is switched off for this one statement.
const GRANT_SQL = `begin;
alter table public.profiles disable trigger profiles_protect_columns;
update public.profiles set subscription_tier = 'admin' where id = '<user-id>';
alter table public.profiles enable trigger profiles_protect_columns;
commit;`;

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="status" aria-label="Loading">
      <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(78,127,31,0.15)', borderTopColor: '#4E7F1F' }} />
    </div>
  );
}

export function SignInScreen({
  email, password, error, busy, onEmail, onPassword, onSubmit,
}: {
  email: string; password: string; error: string | null; busy: boolean;
  onEmail: (v: string) => void; onPassword: (v: string) => void; onSubmit: () => void;
}) {
  // Forgot password / first password: Supabase emails a link to /reset-password, where a new
  // password is set. The page there is on the allowed redirect list (Authentication → URL Configuration).
  const [resetState, setResetState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const sendReset = async () => {
    if (!email.trim()) return;
    setResetState('sending');
    const host = window.location.hostname;
    const redirectTo = host === 'runivo.in' || host.endsWith('.runivo.in')
      ? 'https://runivo.in/reset-password'
      : `${window.location.origin}/reset-password`;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    // Same message whether or not the address has an account, so this can't be used to find accounts.
    setResetState(err && !/rate|limit/i.test(err.message) ? 'error' : 'sent');
  };

  return (
    <main id="main" className={SHELL}>
      <div className={CARD}>
        <div className="mb-6"><Logo size={24} href={null} /></div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">Admin sign in</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in with your admin account to continue.</p>
        <form
          onSubmit={e => { e.preventDefault(); if (!busy && email && password) onSubmit(); }}
          className="flex flex-col gap-4"
        >
          <div>
            <label htmlFor="admin-email" className={labelClass}>Email</label>
            <input
              id="admin-email" type="email" autoComplete="username" inputMode="email" required
              value={email} onChange={e => onEmail(e.target.value)} className={inputClass}
              aria-invalid={!!error} aria-describedby={error ? 'admin-signin-error' : undefined}
            />
          </div>
          <div>
            <label htmlFor="admin-password" className={labelClass}>Password</label>
            <input
              id="admin-password" type="password" autoComplete="current-password" required
              value={password} onChange={e => onPassword(e.target.value)} className={inputClass}
              aria-invalid={!!error} aria-describedby={error ? 'admin-signin-error' : undefined}
            />
          </div>
          {error && <p id="admin-signin-error" role="alert" className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={busy || !email || !password} className="w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <div className="mt-4 text-center">
          {resetState === 'sent' ? (
            <p role="status" className="text-sm text-gray-500">If that email has an admin account, a link to set a password is on its way. Check spam too.</p>
          ) : (
            <button
              type="button" onClick={sendReset} disabled={!email.trim() || resetState === 'sending'}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 disabled:opacity-40 min-h-[44px] px-2"
            >
              {resetState === 'sending' ? 'Sending…' : 'Forgot password or first time? Email me a link'}
            </button>
          )}
          {resetState === 'error' && <p role="alert" className="text-sm text-red-600 mt-1">Couldn’t send the email. Try again in a minute.</p>}
          {!email.trim() && resetState === 'idle' && <p className="text-xs text-gray-400">Enter your email above first.</p>}
        </div>
      </div>
    </main>
  );
}

export function AccessDeniedScreen({ onHome, onSignOut }: { onHome: () => void; onSignOut: () => void }) {
  return (
    <main id="main" className={SHELL}>
      <div className={`${CARD} text-center`}>
        <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
          <ShieldWarning className="w-7 h-7 text-red-500" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-2">Access denied</h1>
        <p className="text-sm text-gray-500">
          This page is for Runivo admins only. Your account doesn&apos;t have admin access.
        </p>
        <details className="mt-5 text-left">
          <summary className="text-sm font-medium text-gray-500 cursor-pointer min-h-[44px] flex items-center">How to grant access</summary>
          <p className="text-xs text-gray-500 mt-1 mb-2">Run this in the Supabase SQL editor, with the account&apos;s user id:</p>
          <pre className="text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-xl p-3 overflow-x-auto">{GRANT_SQL}</pre>
        </details>
        <div className="flex flex-col sm:flex-row gap-2 mt-6">
          <Button grow onClick={onHome}>Back to home</Button>
          <Button grow variant="secondary" onClick={onSignOut}>Sign out</Button>
        </div>
      </div>
    </main>
  );
}
