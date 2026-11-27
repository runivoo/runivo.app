'use client';

import { useCallback, useEffect, useState } from 'react';
import { Flag, Pencil, Plus, Trash2 } from 'lucide-react';
import { adminFetch } from '@/lib/adminApi';
import { RemoveDialog } from '../RemoveDialog';
import { ImageField } from '../ImageField';
import {
  inputClass, thClass, Field, ErrorNote, FormCard, Spinner, Badge, toLocalInput, fromLocalInput,
  Button, IconButton, SectionHeader, TableCard, EmptyState,
} from '../ui';
import type { PartnerRow } from './PartnersSection';

/*
 * Sponsored challenges: a brand's goal ("run 50 km in December") with a PACE Store reward as
 * the prize. Live ones show in the app's PACE Store; runners join, and finishing hands them a
 * code from the reward. Data: /api/admin/challenges.
 */

interface ChallengeRow {
  id: string; partner_id: string | null; brand: string; brand_color: string | null; title: string;
  description: string | null; metric: Metric; target: number; starts_at: string; ends_at: string;
  reward_id: string; countries: string[] | null; status: 'draft' | 'live' | 'ended'; image_url: string | null;
  joined: number; completed: number;
}
interface RewardOption { id: string; title: string; brand: string; code_mode: string; status: string }
type Metric = 'distance_km' | 'zones' | 'active_days';

const METRIC: Record<Metric, { label: string; unit: string }> = {
  distance_km: { label: 'Distance', unit: 'km' },
  zones:       { label: 'Zones claimed', unit: 'zones' },
  active_days: { label: 'Days with a run', unit: 'days' },
};
const STATUS_TONE = { draft: 'gray', live: 'green', ended: 'orange' } as const;

const EMPTY = {
  partner_id: '', brand: '', brand_color: '', title: '', description: '', metric: 'distance_km' as Metric,
  target: '', starts_at: '', ends_at: '', reward_id: '', countries: '', status: 'draft' as ChallengeRow['status'], image_url: '',
};

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function ChallengesSection() {
  const [rows, setRows] = useState<ChallengeRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [rewards, setRewards] = useState<RewardOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<ChallengeRow | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, p, r] = await Promise.all([
        adminFetch<{ challenges: ChallengeRow[] }>('/challenges'),
        adminFetch<{ partners: PartnerRow[] }>('/partners'),
        adminFetch<{ rewards: RewardOption[] }>('/rewards'),
      ]);
      setRows(c.challenges); setPartners(p.partners); setRewards(r.rewards);
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const upd = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm(f => ({ ...f, [k]: v }));
  const pickPartner = (id: string) => {
    const p = partners.find(x => x.id === id);
    setForm(f => ({ ...f, partner_id: id, brand: p ? p.name : f.brand }));
  };

  const openNew = () => { setForm(EMPTY); setEditId(null); setShowForm(true); setError(''); };
  const openEdit = (r: ChallengeRow) => {
    setForm({
      partner_id: r.partner_id ?? '', brand: r.brand, brand_color: r.brand_color ?? '', title: r.title,
      description: r.description ?? '', metric: r.metric, target: String(r.target),
      starts_at: toLocalInput(r.starts_at), ends_at: toLocalInput(r.ends_at), reward_id: r.reward_id,
      countries: (r.countries ?? []).join(', '), status: r.status, image_url: r.image_url ?? '',
    });
    setEditId(r.id); setShowForm(true); setError('');
  };
  const close = () => { setShowForm(false); setEditId(null); };

  const save = async () => {
    setSaving(true); setError('');
    const body = {
      ...form, target: Number(form.target),
      starts_at: fromLocalInput(form.starts_at), ends_at: fromLocalInput(form.ends_at),
      partner_id: form.partner_id || null, brand_color: form.brand_color || null,
    };
    try {
      await adminFetch(editId ? `/challenges/${editId}` : '/challenges', { method: editId ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      await load(); close();
    } catch (e) { setError((e as Error).message); }
    setSaving(false);
  };

  const setStatus = async (r: ChallengeRow, status: ChallengeRow['status']) => {
    setError('');
    try { await adminFetch(`/challenges/${r.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await load(); }
    catch (e) { setError((e as Error).message); }
  };

  const prizeOptions = rewards.filter(r => r.status !== 'hidden');
  const canSave = form.brand.trim() && form.title.trim().length >= 3 && Number(form.target) > 0
    && form.starts_at && form.ends_at && form.reward_id;
  const live = rows.filter(r => r.status === 'live').length;

  return (
    <div>
      <SectionHeader
        title="Sponsored challenges"
        description={loading ? 'Loading…' : `${rows.length} total · ${live} live. Live challenges show in the app's PACE Store.`}
        action={<Button onClick={openNew} icon={<Plus className="w-4 h-4" strokeWidth={2.5} aria-hidden />}>New challenge</Button>}
      />

      {showForm && (
        <FormCard title={editId ? 'Edit challenge' : 'New challenge'} onClose={close}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Brand partner" hint="Its challenges leave the app if the brand is paused or ended." wide>
              <select className={inputClass} value={form.partner_id} onChange={e => pickPartner(e.target.value)}>
                <option value="">No partner (Runivo challenge)</option>
                {partners.filter(p => p.status !== 'rejected').map(p => <option key={p.id} value={p.id}>{p.name} · {p.status}</option>)}
              </select>
            </Field>
            <Field label="Brand name *"><input className={inputClass} value={form.brand} onChange={e => upd('brand', e.target.value)} maxLength={60} placeholder="e.g. Decathlon" /></Field>
            <Field label="Brand colour"><input className={inputClass} value={form.brand_color} onChange={e => upd('brand_color', e.target.value)} maxLength={7} placeholder="#0082C3" /></Field>
            <Field label="Title *" wide><input className={inputClass} value={form.title} onChange={e => upd('title', e.target.value)} maxLength={80} placeholder="e.g. Run 50 km in December" /></Field>
            <ImageField label="Banner" kind="challenge" value={form.image_url} onChange={v => upd('image_url', v)}
              hint="Wide images work best. Leave empty to use the brand's logo." />
            <Field label="Description" wide><textarea className={`${inputClass} resize-none`} rows={2} value={form.description} onChange={e => upd('description', e.target.value)} maxLength={400} /></Field>
            <Field label="Goal type *">
              <select className={inputClass} value={form.metric} onChange={e => upd('metric', e.target.value as Metric)}>
                {(Object.keys(METRIC) as Metric[]).map(m => <option key={m} value={m}>{METRIC[m].label}</option>)}
              </select>
            </Field>
            <Field label={`Goal (${METRIC[form.metric].unit}) *`}><input className={inputClass} type="number" min={1} step="any" value={form.target} onChange={e => upd('target', e.target.value)} placeholder="50" /></Field>
            <Field label="Starts *"><input className={inputClass} type="datetime-local" value={form.starts_at} onChange={e => upd('starts_at', e.target.value)} /></Field>
            <Field label="Ends *"><input className={inputClass} type="datetime-local" value={form.ends_at} onChange={e => upd('ends_at', e.target.value)} /></Field>
            <Field label="Prize: PACE Store reward *" hint="Finishers get a code from this reward, so give it a code pool or a static code." wide>
              <select className={inputClass} value={form.reward_id} onChange={e => upd('reward_id', e.target.value)}>
                <option value="">Pick a reward</option>
                {prizeOptions.map(r => <option key={r.id} value={r.id}>{r.brand} · {r.title}{r.code_mode === 'none' ? ' (no codes!)' : ''}</option>)}
              </select>
            </Field>
            <Field label="Countries" hint="Comma-separated codes, e.g. IN. Blank = everywhere."><input className={inputClass} value={form.countries} onChange={e => upd('countries', e.target.value)} placeholder="IN" /></Field>
            <Field label="Status">
              <select className={inputClass} value={form.status} onChange={e => upd('status', e.target.value as ChallengeRow['status'])}>
                <option value="draft">Draft (not in the app)</option>
                <option value="live">Live</option>
                <option value="ended">Ended</option>
              </select>
            </Field>
          </div>
          <ErrorNote message={error} />
          <div className="flex gap-2 mt-5">
            <Button grow variant="secondary" onClick={close}>Cancel</Button>
            <Button grow onClick={save} disabled={saving || !canSave}>{saving ? 'Saving…' : editId ? 'Save changes' : 'Create challenge'}</Button>
          </div>
        </FormCard>
      )}

      {!showForm && <ErrorNote message={error} />}

      {loading ? <Spinner /> : rows.length === 0 ? (
        <EmptyState icon={<Flag className="w-8 h-8" />} title="No challenges yet." hint="Create one for a brand partner: a goal, dates and a reward as the prize." />
      ) : (
        <TableCard>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className={thClass}>Challenge</th>
              <th className={`${thClass} hidden md:table-cell`}>When</th>
              <th className={`${thClass} text-right`}>Joined</th>
              <th className={thClass}>Status</th>
              <th className={`${thClass} text-right`}> </th>
            </tr></thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {rows.map(r => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: r.brand_color ?? '#D1D5DB' }} aria-hidden />
                      {r.brand} · {Number(r.target).toLocaleString('en-IN')} {METRIC[r.metric].unit}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 md:hidden">{day(r.starts_at)} to {day(r.ends_at)}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell whitespace-nowrap">{day(r.starts_at)} to {day(r.ends_at)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.joined.toLocaleString('en-IN')}
                    <span className="block text-xs text-gray-400">{r.completed.toLocaleString('en-IN')} finished</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                    {r.status === 'draft' && (
                      <button type="button" onClick={() => setStatus(r, 'live')} className="block text-xs font-medium text-[#4E7F1F] mt-1.5 min-h-[32px]">Go live</button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <IconButton label={`Edit ${r.title}`} onClick={() => openEdit(r)}><Pencil className="w-4 h-4 text-gray-500" aria-hidden /></IconButton>
                      <IconButton variant="danger" label={`Remove ${r.title}`} onClick={() => setRemoving(r)}><Trash2 className="w-4 h-4" aria-hidden /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      {removing && (
        <RemoveDialog kind="challenge" id={removing.id} name={removing.title}
          onClose={() => setRemoving(null)} onDone={() => { setRemoving(null); load(); }} />
      )}
    </div>
  );
}
