'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Envelope, PaperPlaneTilt, Plus, Trash } from '@phosphor-icons/react/ssr';
import { adminFetch } from '@/lib/auth/adminApi';
import { AiDraft } from '../AiDraft';
import { Badge, Button, EditButton, EmptyState, ErrorNote, Field, FormCard, IconButton, inputClass, SectionHeader, Spinner, TableCard, thClass } from '../ui';

/*
 * Email broadcasts to the waitlist (all, one city, or one platform). Written here, sent by
 * Resend's marketing feature, which adds the unsubscribe link and skips anyone who
 * unsubscribed. Data: /api/admin/broadcasts.
 */

interface Audience { kind: 'waitlist'; city?: string | null; platform?: string | null }
interface Row {
  id: string; name: string; subject: string; preheader: string | null; heading: string; body: string;
  button_label: string | null; button_url: string | null; audience: Audience;
  status: 'draft' | 'syncing' | 'sent' | 'failed'; recipients: number | null; synced: number; created_at: string; sent_at: string | null;
}
interface Named { name: string; count: number }

const EMPTY = { name: '', subject: '', preheader: '', heading: '', body: '', button_label: '', button_url: '', city: '', platform: '' };
const TONE = { draft: 'gray', syncing: 'blue', sent: 'green', failed: 'red' } as const;
const PLATFORM: Record<string, string> = { instagram: 'Instagram', x: 'X', linkedin: 'LinkedIn', whatsapp: 'WhatsApp', youtube: 'YouTube', facebook: 'Facebook', search: 'Search', direct: 'Direct', unknown: 'Unknown', 'other-site': 'Other sites' };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default function BroadcastsSection() {
  const [rows, setRows] = useState<Row[]>([]);
  const [cities, setCities] = useState<Named[]>([]);
  const [platforms, setPlatforms] = useState<Named[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState<{ id: string; synced: number; total: number } | null>(null);
  const stop = useRef(false);

  const load = useCallback(async () => {
    try {
      const d = await adminFetch<{ broadcasts: Row[]; cities: Named[]; platforms: Named[] }>('/broadcasts');
      setRows(d.broadcasts); setCities(d.cities); setPlatforms(d.platforms);
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // How many people the chosen audience reaches.
  useEffect(() => {
    if (!showForm) return;
    const q = new URLSearchParams();
    if (form.city) q.set('city', form.city);
    if (form.platform) q.set('platform', form.platform);
    setCount(null);
    const t = setTimeout(() => adminFetch<{ count: number }>(`/broadcasts/count?${q}`).then(d => setCount(d.count)).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [form.city, form.platform, showForm]);

  const upd = (k: keyof typeof EMPTY, v: string) => setForm(f => ({ ...f, [k]: v }));
  const openNew = () => { setForm(EMPTY); setEditId(null); setShowForm(true); setError(''); setNote(''); };
  const openEdit = (r: Row) => {
    setForm({
      name: r.name, subject: r.subject, preheader: r.preheader ?? '', heading: r.heading, body: r.body,
      button_label: r.button_label ?? '', button_url: r.button_url ?? '', city: r.audience.city ?? '', platform: r.audience.platform ?? '',
    });
    setEditId(r.id); setShowForm(true); setError(''); setNote('');
  };
  const close = () => { setShowForm(false); setEditId(null); };

  const payload = () => ({
    ...form, button_label: form.button_label || null, button_url: form.button_url || null,
    audience: { kind: 'waitlist', city: form.city || null, platform: form.platform || null },
  });

  /** Saves and returns the id (creates the draft the first time). */
  const save = async (): Promise<string | null> => {
    setSaving(true); setError('');
    try {
      const d = await adminFetch<{ broadcast: Row }>(editId ? `/broadcasts/${editId}` : '/broadcasts', { method: editId ? 'PATCH' : 'POST', body: JSON.stringify(payload()) });
      setEditId(d.broadcast.id); await load(); setSaving(false); return d.broadcast.id;
    } catch (e) { setError((e as Error).message); setSaving(false); return null; }
  };

  const test = async () => {
    const id = await save(); if (!id) return;
    setNote('Sending a test…');
    try { const d = await adminFetch<{ to: string }>(`/broadcasts/${id}/test`, { method: 'POST' }); setNote(`Test sent to ${d.to}.`); }
    catch (e) { setNote(''); setError((e as Error).message); }
  };

  const send = async (id: string, total: number | null) => {
    if (!window.confirm(`Send this to ${total ?? 'the'} ${total === 1 ? 'person' : 'people'} on the waitlist? This can't be undone.`)) return;
    stop.current = false; setError('');
    setSending({ id, synced: 0, total: total ?? 0 });
    try {
      for (;;) {
        const r = await adminFetch<{ phase: 'syncing' | 'sent'; synced: number; total: number }>(`/broadcasts/${id}/send`, { method: 'POST' });
        setSending({ id, synced: r.synced, total: r.total });
        if (r.phase === 'sent' || stop.current) break;
      }
    } catch (e) { setError((e as Error).message); }
    setSending(null); close(); load();
  };

  const sendFromForm = async () => { const id = await save(); if (id) await send(id, count); };

  const preview = useMemo(() => {
    const paras = form.body.trim().split(/\n\s*\n/).filter(Boolean).map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#55585A">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
    const btn = form.button_label ? `<span style="display:inline-block;margin-top:4px;padding:12px 22px;border-radius:999px;background:#17181A;color:#fff;font-size:14px;font-weight:500">${esc(form.button_label)}</span>` : '';
    return `<div style="font-family:Outfit,system-ui,sans-serif;background:#EDEDE9;padding:16px"><div style="background:#fff;border-radius:16px;padding:28px">
      <div style="font-size:16px;font-weight:300;letter-spacing:1px;color:#17181A"><span style="color:#F2A43A">⬡</span>&nbsp; runivo</div>
      <h1 style="margin:24px 0 14px;font-size:30px;line-height:1.1;font-weight:300;color:#17181A">${esc(form.heading || 'Your heading')}</h1>
      ${paras || '<p style="color:#bbb;font-size:15px">Your message…</p>'}${btn}
      <p style="margin:24px 0 0;padding-top:14px;border-top:1px solid #E8E8E4;font-size:11px;color:#8A8C8E">You’re getting this because you joined the Runivo waitlist. <u>Unsubscribe</u>.</p></div></div>`;
  }, [form]);

  const canSave = form.name.trim() && form.subject.trim() && form.heading.trim() && form.body.trim() && (!form.button_label || form.button_url.startsWith('https://'));

  return (
    <div>
      <SectionHeader
        title="Broadcasts"
        description="Email the waitlist: everyone, one city or one platform. Unsubscribes are handled by Resend."
        action={<Button onClick={openNew} icon={<Plus className="w-4 h-4" aria-hidden />}>New broadcast</Button>}
      />

      {sending && (
        <div role="status" className="mb-5 rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-sm font-semibold text-gray-900">Sending… keep this tab open</p>
          <p className="text-sm text-gray-500 mt-0.5">{sending.synced.toLocaleString('en-IN')} of {sending.total.toLocaleString('en-IN')} recipients prepared{sending.synced >= sending.total && sending.total > 0 ? ', handing over to Resend' : ''}.</p>
          <div className="h-1.5 rounded-full bg-gray-100 mt-3 overflow-hidden"><div className="h-full bg-[#4E7F1F] transition-all" style={{ width: `${sending.total ? (sending.synced / sending.total) * 100 : 5}%` }} /></div>
          <button type="button" onClick={() => { stop.current = true; }} className="text-xs text-gray-500 mt-2 min-h-[32px]">Pause (resume later from the list)</button>
        </div>
      )}

      {showForm && !sending && (
        <FormCard title={editId ? 'Edit broadcast' : 'New broadcast'} onClose={close}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
              <AiDraft<{ subject: string; preheader: string; heading: string; body: string }> kind="email" placeholder="e.g. Runivo is live in Bengaluru, get the app and claim your first street"
                onDraft={d => setForm(f => ({ ...f, subject: d.subject, preheader: d.preheader, heading: d.heading, body: d.body }))} />
              <Field label="Internal name *" hint="Only you see this." wide><input className={inputClass} value={form.name} onChange={e => upd('name', e.target.value)} maxLength={100} placeholder="e.g. Launch day" /></Field>
              <Field label="City">
                <select className={inputClass} value={form.city} onChange={e => upd('city', e.target.value)}>
                  <option value="">Every city</option>
                  {cities.map(c => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
                </select>
              </Field>
              <Field label="Came from">
                <select className={inputClass} value={form.platform} onChange={e => upd('platform', e.target.value)}>
                  <option value="">Any platform</option>
                  {platforms.map(p => <option key={p.name} value={p.name}>{PLATFORM[p.name] ?? p.name} ({p.count})</option>)}
                </select>
              </Field>
              <p className="sm:col-span-2 text-sm text-gray-600 -mt-1">Goes to <span className="font-semibold text-gray-900">{count == null ? '…' : count.toLocaleString('en-IN')}</span> {count === 1 ? 'person' : 'people'} on the waitlist (minus anyone who unsubscribed).</p>
              <Field label="Subject *" wide><input className={inputClass} value={form.subject} onChange={e => upd('subject', e.target.value)} maxLength={150} placeholder="Runivo is live in Bengaluru" /></Field>
              <Field label="Preview text" hint="The grey line after the subject in inboxes." wide><input className={inputClass} value={form.preheader} onChange={e => upd('preheader', e.target.value)} maxLength={150} /></Field>
              <Field label="Heading *" wide><input className={inputClass} value={form.heading} onChange={e => upd('heading', e.target.value)} maxLength={120} placeholder="We’re live." /></Field>
              <Field label="Message *" hint="Leave a blank line between paragraphs." wide><textarea className={`${inputClass} resize-y`} rows={7} value={form.body} onChange={e => upd('body', e.target.value)} maxLength={10000} /></Field>
              <Field label="Button text"><input className={inputClass} value={form.button_label} onChange={e => upd('button_label', e.target.value)} maxLength={40} placeholder="Get the app" /></Field>
              <Field label="Button link"><input className={inputClass} value={form.button_url} onChange={e => upd('button_url', e.target.value)} placeholder="https://runivo.in" /></Field>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Preview</p>
              <iframe title="Email preview" sandbox="" srcDoc={preview} className="w-full h-[560px] rounded-2xl border border-gray-100 bg-white" />
            </div>
          </div>
          <ErrorNote message={error} />
          {note && <p role="status" className="text-sm text-gray-600 mt-3">{note}</p>}
          <div className="flex flex-wrap gap-2 mt-5">
            <Button variant="secondary" onClick={() => save()} disabled={saving || !canSave}>{saving ? 'Saving…' : 'Save draft'}</Button>
            <Button variant="secondary" onClick={test} disabled={saving || !canSave} icon={<Envelope className="w-4 h-4" aria-hidden />}>Send me a test</Button>
            <Button onClick={sendFromForm} disabled={saving || !canSave || !count} icon={<PaperPlaneTilt className="w-4 h-4" aria-hidden />}>Send to {count ?? '…'} {count === 1 ? 'person' : 'people'}</Button>
          </div>
        </FormCard>
      )}

      {!showForm && <ErrorNote message={error} />}

      {loading ? <Spinner /> : rows.length === 0 ? (
        <EmptyState icon={<Envelope className="w-8 h-8" />} title="No broadcasts yet." hint="Write one for launch day, or a city announcement." />
      ) : (
        <TableCard>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className={thClass}>Broadcast</th>
              <th className={`${thClass} hidden md:table-cell`}>Audience</th>
              <th className={thClass}>Status</th>
              <th className={`${thClass} text-right`}> </th>
            </tr></thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {rows.map(r => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.subject}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                    Waitlist{r.audience.city ? ` · ${r.audience.city}` : ''}{r.audience.platform ? ` · ${PLATFORM[r.audience.platform] ?? r.audience.platform}` : ''}
                    {r.recipients != null && <span className="block text-gray-400">{r.recipients.toLocaleString('en-IN')} people</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={TONE[r.status]}>{r.status === 'syncing' ? 'paused' : r.status}</Badge>
                    {r.sent_at && <span className="block text-xs text-gray-400 mt-1">{new Date(r.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      {r.status === 'draft' && <EditButton name={r.name} onClick={() => openEdit(r)} />}
                      {(r.status === 'syncing' || r.status === 'failed') && !sending && (
                        <Button size="sm" variant="secondary" onClick={() => send(r.id, r.recipients)}>Resume</Button>
                      )}
                      {r.status === 'draft' && (
                        <IconButton variant="danger" label={`Delete ${r.name}`} onClick={async () => {
                          if (!window.confirm(`Delete the draft "${r.name}"?`)) return;
                          try { await adminFetch(`/broadcasts/${r.id}`, { method: 'DELETE' }); load(); } catch (e) { setError((e as Error).message); }
                        }}><Trash className="w-4 h-4" aria-hidden /></IconButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
      <p className="text-xs text-gray-400 mt-4">Opens, clicks and unsubscribes for each broadcast are in Resend → Broadcasts. Free plan: up to 1,000 people a month.</p>
    </div>
  );
}
