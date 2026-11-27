'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { adminFetch } from '@/lib/adminApi';
import { Button, IconButton, Spinner, inputClass } from './ui';

/**
 * The remove dialog (Admin PRD, "Safe delete"). Before anything goes it asks the server
 * what removing it would touch, shows that in plain words, and offers the safer choice
 * first (hide, end). A real delete needs the name typed when data would be lost. The
 * server enforces the same rules, so this is guidance, not the only guard.
 */

export type RemoveKind = 'reward' | 'event' | 'partner' | 'challenge';

interface Impact {
  label: string;
  effects: { text: string; loss: boolean }[];
  blockers: string[];
  canDelete: boolean;
  confirmByName: boolean;
  safer: { action: 'hide' | 'end'; label: string; description: string } | null;
}

const NOUN: Record<RemoveKind, string> = { reward: 'reward', event: 'event', partner: 'brand', challenge: 'challenge' };

// What each choice calls. Kept here so every section removes things the same way.
const ACTIONS: Record<RemoveKind, { safer?: { path: (id: string) => string; body: object }; del?: (id: string) => string }> = {
  reward:  { safer: { path: id => `/rewards/${id}`, body: { status: 'hidden' } }, del: id => `/rewards/${id}` },
  event:   { safer: { path: id => `/events/${id}`, body: { is_active: false } }, del: id => `/events/${id}` },
  partner: { safer: { path: id => `/partners/${id}`, body: { status: 'ended' } } },
  challenge: { safer: { path: id => `/challenges/${id}`, body: { status: 'ended' } }, del: id => `/challenges/${id}` },
};

export function RemoveDialog({ kind, id, name, onClose, onDone }: {
  kind: RemoveKind; id: string; name: string;
  onClose: () => void;
  onDone: (result: 'hidden' | 'ended' | 'deleted') => void;
}) {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [error, setError] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState<'safer' | 'delete' | null>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    adminFetch<Impact>(`/impact?kind=${kind}&id=${encodeURIComponent(id)}`)
      .then(setImpact)
      .catch(e => setError((e as Error).message));
  }, [kind, id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    card.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const runSafer = async () => {
    const a = ACTIONS[kind].safer;
    if (!a || !impact?.safer) return;
    setBusy('safer'); setError('');
    try {
      await adminFetch(a.path(id), { method: 'PATCH', body: JSON.stringify(a.body) });
      onDone(impact.safer.action === 'end' ? 'ended' : 'hidden');
    } catch (e) { setError((e as Error).message); setBusy(null); }
  };

  const runDelete = async () => {
    const path = ACTIONS[kind].del;
    if (!path) return;
    setBusy('delete'); setError('');
    try {
      await adminFetch(path(id), { method: 'DELETE' });
      onDone('deleted');
    } catch (e) { setError((e as Error).message); setBusy(null); }
  };

  const nameOk = !impact?.confirmByName || typed.trim().toLowerCase() === (impact.label || name).trim().toLowerCase();
  const deletable = Boolean(ACTIONS[kind].del) && impact?.canDelete;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/40" aria-hidden onClick={() => !busy && onClose()} />
      <div
        ref={card} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="remove-title"
        style={{ outline: 'none' }}
        className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-400">Remove {NOUN[kind]}</p>
            <h2 id="remove-title" className="text-lg font-semibold tracking-tight text-gray-900 mt-0.5 break-words">{impact?.label || name}</h2>
          </div>
          <IconButton label="Close" onClick={onClose} disabled={!!busy}><X className="w-4 h-4 text-gray-500" aria-hidden /></IconButton>
        </div>

        <div className="px-6 pb-6 pt-4">
          {!impact && !error && <Spinner />}

          {impact && (
            <>
              <p className="text-sm font-medium text-gray-700 mb-2">What this touches</p>
              {impact.effects.length === 0 && impact.blockers.length === 0 ? (
                <p className="text-sm text-gray-500 mb-5">Nothing else is linked to it. It can be removed cleanly.</p>
              ) : (
                <ul className="space-y-2 mb-5">
                  {impact.blockers.map(b => (
                    <li key={b} className="flex gap-2.5 text-sm text-gray-700">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" aria-hidden />{b}
                    </li>
                  ))}
                  {impact.effects.map(e => (
                    <li key={e.text} className={`flex gap-2.5 text-sm ${e.loss ? 'text-red-700' : 'text-gray-700'}`}>
                      {e.loss
                        ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" aria-hidden />
                        : <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" aria-hidden />}
                      {e.text}
                    </li>
                  ))}
                </ul>
              )}

              {impact.safer && (
                <div className="rounded-2xl border border-[#4E7F1F]/20 bg-green-50 p-4 mb-3">
                  <p className="text-sm font-semibold text-gray-900">{impact.safer.label}</p>
                  <p className="text-sm text-gray-600 mt-1 mb-3">{impact.safer.description}</p>
                  <Button onClick={runSafer} disabled={!!busy}>{busy === 'safer' ? 'Working…' : impact.safer.label}</Button>
                </div>
              )}

              {deletable ? (
                <div className="rounded-2xl border border-red-100 p-4">
                  <p className="text-sm font-semibold text-gray-900">Delete for good</p>
                  <p className="text-sm text-gray-600 mt-1">This can’t be undone.</p>
                  {impact.confirmByName && (
                    <label className="block mt-3">
                      <span className="text-sm text-gray-600">Type <span className="font-semibold text-gray-900">{impact.label || name}</span> to confirm</span>
                      <input className={`${inputClass} mt-2`} value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
                    </label>
                  )}
                  <Button variant="danger" className="mt-3" onClick={runDelete} disabled={!!busy || !nameOk}>
                    {busy === 'delete' ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              ) : !impact.safer && (
                <p className="text-sm text-gray-500">Nothing more to do: it’s already out of the app.</p>
              )}
            </>
          )}

          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
