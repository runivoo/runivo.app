'use client';

import { useState } from 'react';
import { Sparkle } from '@phosphor-icons/react/ssr';
import { adminFetch } from '@/lib/auth/adminApi';
import { Button, inputClass } from './ui';

/** "Draft with AI": one line about the goal → Claude fills the fields, which stay editable. */
export function AiDraft<T>({ kind, onDraft, placeholder }: { kind: 'push' | 'email'; onDraft: (d: T) => void; placeholder: string }) {
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async () => {
    setBusy(true); setError('');
    try { onDraft(await adminFetch<T>('/ai-draft', { method: 'POST', body: JSON.stringify({ kind, goal }) })); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="sm:col-span-2 rounded-2xl border border-gray-100 bg-white p-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input className={`${inputClass} flex-1`} value={goal} onChange={e => setGoal(e.target.value)} maxLength={400} placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter' && goal.trim() && !busy) { e.preventDefault(); run(); } }} aria-label="What is this for?" />
        <Button variant="secondary" onClick={run} disabled={busy || !goal.trim()} icon={<Sparkle className="w-4 h-4" aria-hidden />}>{busy ? 'Writing…' : 'Draft with AI'}</Button>
      </div>
      {error ? <p role="alert" className="text-xs text-red-600 mt-1.5">{error}</p>
        : <p className="text-xs text-gray-400 mt-1.5">Fills the fields below in Runivo’s voice. Read and edit before sending.</p>}
    </div>
  );
}
