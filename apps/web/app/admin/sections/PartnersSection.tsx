'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Handshake, Ban, Sparkles } from 'lucide-react';
import { RemoveDialog } from '../RemoveDialog';
import { ImageField } from '../ImageField';
import { adminFetch } from '@/lib/adminApi';
import { inputClass, thClass, Field, ErrorNote, FormCard, Spinner, Badge, Button, IconButton, SectionHeader, TableCard, EmptyState } from '../ui';

export interface PartnerRow {
  id: string;
  name: string;
  category: string;
  contact_name: string | null;
  contact_email: string | null;
  cities: string[] | null;
  countries: string[] | null;
  billing_model: 'free_listing' | 'cost_per_redemption';
  fee_per_redemption: number;
  fee_currency: string;
  billing_starts_on: string | null;
  status: 'applied' | 'active' | 'paused' | 'ended' | 'rejected';
  notes: string | null;
  logo_url?: string | null;
  created_at: string;
  website?: string | null;
  offer?: string | null;
  estimated_stock?: number | null;
  applied_at?: string | null;
}

const CATEGORIES = ['shoes', 'apparel', 'gear', 'nutrition', 'cafe', 'physio', 'races', 'gym', 'insurance', 'tech', 'other'];
const STATUSES: { value: PartnerRow['status']; label: string }[] = [
  { value: 'applied',  label: 'Applied: in review' },
  { value: 'active',   label: 'Active: rewards can go live' },
  { value: 'paused',   label: 'Paused' },
  { value: 'ended',    label: 'Ended' },
  { value: 'rejected', label: 'Rejected' },
];
const STATUS_TONE: Record<PartnerRow['status'], 'green' | 'blue' | 'orange' | 'gray' | 'red'> = {
  applied: 'blue', active: 'green', paused: 'orange', ended: 'gray', rejected: 'red',
};

const EMPTY = {
  name: '', category: 'shoes', contact_name: '', contact_email: '', cities: '', countries: 'IN',
  billing_model: 'free_listing', fee_per_redemption: '1.00', fee_currency: 'USD', billing_starts_on: '',
  status: 'applied', notes: '', logo_url: '',
};

export default function PartnersSection() {
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<PartnerRow | null>(null);
  const [screens, setScreens] = useState<Record<string, { summary: string; fit: number; why: string; questions: string[] } | 'loading' | { error: string }>>({});
  const screen = async (id: string) => {
    setScreens(s => ({ ...s, [id]: 'loading' }));
    try {
      const r = await adminFetch<{ summary: string; fit: number; why: string; questions: string[] }>(`/partners/${id}/screen`, { method: 'POST' });
      setScreens(s => ({ ...s, [id]: r }));
    } catch (e) { setScreens(s => ({ ...s, [id]: { error: (e as Error).message } })); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { partners } = await adminFetch<{ partners: PartnerRow[] }>('/partners');
      setRows(partners);
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const upd = (k: keyof typeof EMPTY, v: string) => setForm(p => ({ ...p, [k]: v }));
  const openNew = () => { setForm(EMPTY); setEditId(null); setError(''); setShowForm(true); };
  const openEdit = (r: PartnerRow) => {
    setForm({
      name: r.name, category: r.category, contact_name: r.contact_name ?? '', contact_email: r.contact_email ?? '',
      cities: (r.cities ?? []).join(', '), countries: (r.countries ?? []).join(', '),
      billing_model: r.billing_model, fee_per_redemption: String(r.fee_per_redemption ?? 0), fee_currency: r.fee_currency,
      billing_starts_on: r.billing_starts_on ?? '', status: r.status, notes: r.notes ?? '',
      logo_url: r.logo_url ?? '',
    });
    setEditId(r.id); setError(''); setShowForm(true);
  };
  const close = () => { setShowForm(false); setEditId(null); setError(''); };

  const save = async () => {
    setSaving(true); setError('');
    try {
      await adminFetch(editId ? `/partners/${editId}` : '/partners', {
        method: editId ? 'PATCH' : 'POST',
        body: JSON.stringify(form),
      });
      await load();
      close();
    } catch (e) { setError((e as Error).message); }
    setSaving(false);
  };

  const [deciding, setDeciding] = useState<string | null>(null);
  const decide = async (r: PartnerRow, status: 'active' | 'rejected') => {
    if (status === 'rejected' && !window.confirm(`Reject ${r.name}'s application?`)) return;
    setDeciding(r.id); setError('');
    try {
      await adminFetch(`/partners/${r.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await load();
    } catch (e) { setError((e as Error).message); }
    setDeciding(null);
  };

  // Applications first (oldest first, so nobody waits), then everyone else.
  const applications = rows
    .filter(r => r.status === 'applied')
    .sort((a, b) => (a.applied_at ?? a.created_at).localeCompare(b.applied_at ?? b.created_at));
  const others = rows.filter(r => r.status !== 'applied');

  const freeCount = rows.filter(r => r.billing_model === 'free_listing' && r.status === 'active').length;

  return (
    <div>
      <SectionHeader
        title="Partners"
        description={<>{rows.filter(r => r.status === 'active').length} active · {rows.filter(r => r.status === 'applied').length} to review · {freeCount}/10 free listings used</>}
        action={<Button onClick={openNew} icon={<Plus className="w-4 h-4" strokeWidth={2.5} aria-hidden />}>Add partner</Button>}
      />

      {showForm && (
        <FormCard title={editId ? 'Edit partner' : 'New partner'} onClose={close}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name *"><input className={inputClass} value={form.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Brooks India" maxLength={120} /></Field>
            <Field label="Category">
              <select className={inputClass} value={form.category} onChange={e => upd('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Contact name"><input className={inputClass} value={form.contact_name} onChange={e => upd('contact_name', e.target.value)} maxLength={120} /></Field>
            <Field label="Contact email"><input className={inputClass} type="email" value={form.contact_email} onChange={e => upd('contact_email', e.target.value)} maxLength={200} /></Field>
            <Field label="Cities" hint="Comma separated, e.g. Bengaluru, Mumbai"><input className={inputClass} value={form.cities} onChange={e => upd('cities', e.target.value)} /></Field>
            <Field label="Countries" hint="ISO codes, e.g. IN"><input className={inputClass} value={form.countries} onChange={e => upd('countries', e.target.value)} /></Field>
            <Field label="Billing">
              <select className={inputClass} value={form.billing_model} onChange={e => upd('billing_model', e.target.value)}>
                <option value="free_listing">Free listing (first 10 partners)</option>
                <option value="cost_per_redemption">Cost per redemption</option>
              </select>
            </Field>
            {form.billing_model === 'cost_per_redemption' && (
              <>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Field label="Fee per redemption"><input className={inputClass} type="number" min="0" step="0.25" value={form.fee_per_redemption} onChange={e => upd('fee_per_redemption', e.target.value)} /></Field>
                  </div>
                  <div style={{ width: 90 }}>
                    <Field label="Currency"><input className={inputClass} value={form.fee_currency} onChange={e => upd('fee_currency', e.target.value.toUpperCase())} maxLength={3} /></Field>
                  </div>
                </div>
                <Field label="Billing starts" hint="Month 2 of the partnership"><input className={inputClass} type="date" value={form.billing_starts_on} onChange={e => upd('billing_starts_on', e.target.value)} /></Field>
              </>
            )}
            <Field label="Status">
              <select className={inputClass} value={form.status} onChange={e => upd('status', e.target.value)}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <ImageField label="Logo" kind="partner" aspect="square" value={form.logo_url} onChange={v => upd('logo_url', v)}
              hint="Square works best. Used on this brand's rewards and challenges that have no image of their own." />
            <Field label="Notes" hint="Agreed terms, review notes" wide>
              <textarea className={`${inputClass} resize-none`} rows={3} value={form.notes} onChange={e => upd('notes', e.target.value)} maxLength={2000}
                placeholder="Offer, stock, dates, cities, how codes work. Review: fits runners? at least 15% off or a free item? can honour codes?" />
            </Field>
          </div>
          <ErrorNote message={error} />
          <div className="flex gap-2 mt-4">
            <Button variant="secondary" grow onClick={close}>Cancel</Button>
            <Button grow onClick={save} disabled={saving || form.name.trim().length < 2}>{saving ? 'Saving…' : editId ? 'Update partner' : 'Create partner'}</Button>
          </div>
        </FormCard>
      )}

      {!showForm && <ErrorNote message={error} />}

      {!loading && applications.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 mb-2">Applications to review · reply within 5 working days</p>
          <div className="grid gap-3">
            {applications.map(r => (
              <div key={r.id} className="rounded-2xl border border-blue-100 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                      <Badge tone="blue">Applied</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.category}
                      {r.contact_name ? ` · ${r.contact_name}` : ''}
                      {r.contact_email ? ` · ${r.contact_email}` : ''}
                      {r.website ? ` · ${r.website}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">
                      {[...(r.cities ?? []), ...(r.countries ?? [])].join(', ') || 'Everywhere'}
                      {r.estimated_stock != null ? ` · about ${r.estimated_stock} rewards` : ''}
                      {r.applied_at ? ` · applied ${new Date(r.applied_at).toLocaleDateString()}` : ''}
                    </p>
                    {r.offer && <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{r.offer}</p>}
                    {(() => {
                      const sc = screens[r.id];
                      if (!sc) return null;
                      if (sc === 'loading') return <p className="text-xs text-gray-400 mt-3">Reading the application…</p>;
                      if ('error' in sc) return <p role="alert" className="text-xs text-red-600 mt-3">{sc.error}</p>;
                      return (
                        <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm">
                          <p className="text-gray-900"><span className="font-semibold">AI fit {sc.fit}/5</span> · {sc.summary}</p>
                          {sc.why && <p className="text-gray-600 mt-1">{sc.why}</p>}
                          {sc.questions.length > 0 && <ul className="mt-2 space-y-0.5">{sc.questions.map(q => <li key={q} className="text-gray-600">· {q}</li>)}</ul>}
                          <p className="text-xs text-gray-400 mt-2">AI advice from the application only. You decide.</p>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="secondary" size="sm" onClick={() => screen(r.id)} disabled={screens[r.id] === 'loading'} icon={<Sparkles className="w-4 h-4" aria-hidden />}>AI check</Button>
                    <Button variant="secondary" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                    <Button variant="secondary" size="sm" onClick={() => decide(r, 'rejected')} disabled={deciding === r.id}>Reject</Button>
                    <Button size="sm" onClick={() => decide(r, 'active')} disabled={deciding === r.id}>Approve</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? <Spinner /> : others.length === 0 && applications.length === 0 ? (
        <EmptyState icon={<Handshake className="w-8 h-8" />} title="No partners yet." hint="Applications from runivo.in/partners show up here." />
      ) : others.length === 0 ? null : (
        <TableCard>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className={thClass}>Partner</th>
              <th className={`${thClass} hidden sm:table-cell`}>Where</th>
              <th className={`${thClass} hidden sm:table-cell`}>Billing</th>
              <th className={thClass}>Status</th>
              <th className={`${thClass} text-right`}> </th>
            </tr></thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {others.map(r => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.category}{r.contact_email ? ` · ${r.contact_email}` : ''}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{[...(r.cities ?? []), ...(r.countries ?? [])].join(', ') || 'Everywhere'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell whitespace-nowrap">
                    {r.billing_model === 'free_listing' ? 'Free listing' : `${r.fee_currency} ${Number(r.fee_per_redemption).toFixed(2)} / redemption`}
                  </td>
                  <td className="px-4 py-3"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <IconButton label={`Edit ${r.name}`} onClick={() => openEdit(r)}><Pencil className="w-4 h-4 text-gray-500" aria-hidden /></IconButton>
                      {r.status !== 'ended' && r.status !== 'rejected' && (
                        <IconButton variant="danger" label={`End partnership with ${r.name}`} onClick={() => setRemoving(r)}><Ban className="w-4 h-4" aria-hidden /></IconButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      {removing && (
        <RemoveDialog kind="partner" id={removing.id} name={removing.name}
          onClose={() => setRemoving(null)} onDone={() => { setRemoving(null); load(); }} />
      )}
    </div>
  );
}
