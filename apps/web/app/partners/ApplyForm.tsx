'use client';

import { useId, useState, type FormEvent } from 'react';
import { Honeypot } from '@/components/forms/Honeypot';
import { FormSuccess } from '@/components/forms/FormSuccess';
import { postForm } from '@/lib/forms/postForm';

type State = { status: 'idle' | 'sending' | 'sent' | 'error'; message?: string };

/**
 * Short partner enquiry: company, your name, work email, website. We get in touch
 * and work out the offer, stock and cities together, so none of that is asked here.
 * The honeypot field is hidden from people and tempting to bots.
 */
export function ApplyForm() {
  const uid = useId();
  const [state, setState] = useState<State>({ status: 'idle' });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = Object.fromEntries(
      ['name', 'contact_name', 'contact_email', 'website', 'company_url'].map(k => [k, String(f.get(k) ?? '')]),
    );
    setState({ status: 'sending' });
    const reply = await postForm('/api/partners/apply', payload);
    setState(reply.ok ? { status: 'sent' } : { status: 'error', message: reply.error });
  }

  if (state.status === 'sent') return <FormSuccess wide title="Thanks, we’ve got it.">We’ll get in touch within 5 working days.</FormSuccess>;

  return (
    <form onSubmit={submit} noValidate className="apply-form">
      <Honeypot id={`${uid}-co`} />

      <div>
        <label className="field-label" htmlFor={`${uid}-name`}>Company name *</label>
        <input className="field" id={`${uid}-name`} name="name" required minLength={2} maxLength={120} autoComplete="organization" />
      </div>
      <div>
        <label className="field-label" htmlFor={`${uid}-contact`}>Your name</label>
        <input className="field" id={`${uid}-contact`} name="contact_name" maxLength={120} autoComplete="name" />
      </div>
      <div>
        <label className="field-label" htmlFor={`${uid}-email`}>Work email *</label>
        <input className="field" id={`${uid}-email`} name="contact_email" type="email" required maxLength={200} autoComplete="email" />
      </div>
      <div>
        <label className="field-label" htmlFor={`${uid}-site`}>Website</label>
        <input className="field" id={`${uid}-site`} name="website" maxLength={300} placeholder="yourbrand.com" autoComplete="url" />
      </div>

      <div className="apply-actions">
        <button type="submit" className="btn btn-dark" disabled={state.status === 'sending'}>
          {state.status === 'sending' ? 'Sending…' : 'Send'}
        </button>
        <p className="waitlist-note" style={{ marginTop: 0 }}>We only use these details to reply about partnering.</p>
      </div>

      {state.status === 'error' && <p role="alert" className="form-error apply-error">{state.message}</p>}
    </form>
  );
}
