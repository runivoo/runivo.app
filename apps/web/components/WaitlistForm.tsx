'use client';

import { useId, useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';

type State = { status: 'idle' | 'sending' | 'sent' | 'error'; message?: string };

/**
 * Pre-launch waitlist: an email, plus an optional city so we know where to
 * launch first. Posts to /api/waitlist. The honeypot field is hidden from
 * people and tempting to bots.
 */
export function WaitlistForm({ source = 'web' }: { source?: string }) {
  const uid = useId();
  const [state, setState] = useState<State>({ status: 'idle' });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState({ status: 'sending' });
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(f.get('email') ?? ''),
          city: String(f.get('city') ?? ''),
          company_url: String(f.get('company_url') ?? ''),
          source,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) setState({ status: 'sent' });
      else setState({ status: 'error', message: data.error ?? 'Something went wrong. Please try again.' });
    } catch {
      setState({ status: 'error', message: 'Couldn’t reach us. Check your connection and try again.' });
    }
  }

  if (state.status === 'sent') {
    return (
      <div className="waitlist-done" role="status">
        <span className="waitlist-tick"><Check size={18} strokeWidth={3} aria-hidden /></span>
        <div>
          <p className="waitlist-done-title">You’re on the list.</p>
          <p className="waitlist-done-body">Check your inbox for a confirmation. We’ll email you once more, the day Runivo opens in your city.</p>
        </div>
      </div>
    );
  }

  const sending = state.status === 'sending';
  return (
    <form className="waitlist" onSubmit={submit} noValidate>
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor={`${uid}-co`}>Leave this empty</label>
        <input id={`${uid}-co`} name="company_url" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="waitlist-row">
        <div className="waitlist-field">
          <label className="sr-only" htmlFor={`${uid}-email`}>Email</label>
          <input
            id={`${uid}-email`} name="email" type="email" className="field" placeholder="Your email"
            required maxLength={200} autoComplete="email" inputMode="email"
            aria-invalid={state.status === 'error'} aria-describedby={state.status === 'error' ? `${uid}-err` : undefined}
          />
        </div>
        <div className="waitlist-field waitlist-city">
          <label className="sr-only" htmlFor={`${uid}-city`}>City (optional)</label>
          <input
            id={`${uid}-city`} name="city" type="text" className="field" placeholder="City (optional)"
            maxLength={80} autoComplete="address-level2"
          />
        </div>
        <button type="submit" className="btn btn-dark" disabled={sending}>
          {sending ? 'Joining…' : 'Join the waitlist'}
        </button>
      </div>

      {state.status === 'error' && <p id={`${uid}-err`} role="alert" className="form-error waitlist-note">{state.message}</p>}
      {state.status !== 'error' && (
        <p className="waitlist-note">Free. One email when we launch, nothing else.</p>
      )}
    </form>
  );
}
