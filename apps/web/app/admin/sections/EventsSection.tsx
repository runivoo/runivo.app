'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { RemoveDialog } from '../RemoveDialog';
import { inputClass, labelClass, ErrorNote, FormCard, Spinner, Badge, Button, IconButton, SectionHeader, TableCard, EmptyState, StatusToggle } from '../ui';

interface EventRow {
  id: string;
  title: string;
  event_type: string;
  starts_at: string;
  location_name: string | null;
  distance_m: number | null;
  description: string | null;
  is_active: boolean;
  participant_count: number;
  organizer?: string | null;
  source: 'hosted' | 'curated';
  registration_url?: string | null;
  source_name?: string | null;
  discipline?: string | null;
  lat?: number | null;
  lng?: number | null;
  created_at: string;
}

const EVENT_TYPES = [
  { value: 'community-run',   label: 'Community run' },
  { value: 'race',            label: 'Race' },
  { value: 'challenge',       label: 'Challenge' },
  { value: 'brand-challenge', label: 'Brand challenge' },
  { value: 'king-of-hill',    label: 'King of the hill' },
  { value: 'survival',        label: 'Survival run' },
];

// Real-world sport taxonomy — deliberately separate from EVENT_TYPES above,
// which mixes real categories with in-app gamified modes. Mirrors the CHECK
// constraint on events.discipline (20260811000002_events_hosted_curated.sql).
const DISCIPLINES = [
  { value: '',              label: '— None —' },
  { value: 'marathon',      label: 'Marathon' },
  { value: 'half_marathon', label: 'Half marathon' },
  { value: '10k',           label: '10K' },
  { value: '5k',            label: '5K' },
  { value: 'cyclothon',     label: 'Cyclothon' },
  { value: 'triathlon',     label: 'Triathlon' },
  { value: 'trail_run',     label: 'Trail run' },
  { value: 'community_run', label: 'Community run' },
  { value: 'other',         label: 'Other' },
];

const EMPTY_EVENT = {
  title: '', event_type: 'community-run', starts_at: '', ends_at: '',
  location_name: '', distance_km: '', description: '', organizer: '',
  source: 'hosted' as 'hosted' | 'curated',
  registration_url: '', source_name: '', discipline: '', lat: '', lng: '',
};

export default function EventsSection() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_EVENT);
  const [editId, setEditId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<EventRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('starts_at', { ascending: false });
    setEvents(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const upd = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));
  const setSource = (v: 'hosted' | 'curated') => setForm(p => ({ ...p, source: v }));

  const openNew = () => {
    setForm(EMPTY_EVENT);
    setEditId(null);
    setError('');
    setShowForm(true);
  };

  const openEdit = (e: EventRow) => {
    const startsLocal = e.starts_at ? new Date(e.starts_at).toISOString().slice(0, 16) : '';
    setForm({
      title: e.title,
      event_type: e.event_type,
      starts_at: startsLocal,
      ends_at: '',
      location_name: e.location_name ?? '',
      distance_km: e.distance_m ? String(e.distance_m / 1000) : '',
      description: e.description ?? '',
      organizer: e.organizer ?? '',
      source: e.source ?? 'hosted',
      registration_url: e.registration_url ?? '',
      source_name: e.source_name ?? '',
      discipline: e.discipline ?? '',
      lat: e.lat != null ? String(e.lat) : '',
      lng: e.lng != null ? String(e.lng) : '',
    });
    setEditId(e.id);
    setError('');
    setShowForm(true);
  };

  const cancel = () => { setShowForm(false); setEditId(null); setError(''); };

  const save = async () => {
    if (!form.title.trim() || !form.starts_at || !form.location_name.trim()) return;
    if (form.source === 'curated' && !form.registration_url.trim()) {
      setError('Curated listings need a registration URL — that\'s the whole point, it\'s where users actually sign up.');
      return;
    }
    setSaving(true);
    setError('');
    const startsAt = new Date(form.starts_at);
    const endsAt = new Date(startsAt.getTime() + 2 * 3600 * 1000);
    const payload = {
      title:             form.title.trim(),
      event_type:        form.event_type,
      starts_at:         startsAt.toISOString(),
      ends_at:           endsAt.toISOString(),
      location_name:     form.location_name.trim() || null,
      distance_m:        form.distance_km ? Math.round(parseFloat(form.distance_km) * 1000) : null,
      description:       form.description.trim() || null,
      organizer:         form.organizer.trim() || null,
      source:            form.source,
      registration_url:  form.source === 'curated' ? form.registration_url.trim() : null,
      source_name:       form.source === 'curated' ? (form.source_name.trim() || null) : null,
      discipline:        form.discipline || null,
      lat:               form.lat ? parseFloat(form.lat) : null,
      lng:               form.lng ? parseFloat(form.lng) : null,
    };
    const { error: err } = editId
      ? await supabase.from('events').update(payload).eq('id', editId)
      : await supabase.from('events').insert({ ...payload, is_active: true, participant_count: 0 });
    if (err) { setError(err.message); setSaving(false); return; }
    await load();
    cancel();
    setSaving(false);
  };

  const toggleActive = async (row: EventRow) => {
    const { error: err } = await supabase.from('events').update({ is_active: !row.is_active }).eq('id', row.id);
    if (err) { setError(err.message); return; }
    setEvents(prev => prev.map(e => e.id === row.id ? { ...e, is_active: !e.is_active } : e));
  };


  const canSave = form.title.trim().length >= 3 && !!form.starts_at && form.location_name.trim().length >= 2
    && (form.source !== 'curated' || form.registration_url.trim().length > 0);

  return (
    <div>
      <SectionHeader
        title="Events"
        description={<>{events.length} total · {events.filter(e => e.is_active).length} active</>}
        action={<Button onClick={openNew} icon={<Plus className="w-4 h-4" strokeWidth={2.5} aria-hidden />}>New event</Button>}
      />

      {showForm && (
        <FormCard title={editId ? 'Edit event' : 'New event'} onClose={cancel}>

            {/* Source: hosted (in-app RSVP) vs curated (outbound registration link) —
                the field that decides which of the inputs below are shown/required. */}
            <div className="mb-4">
              <span id="adm-source" className={labelClass}>Source</span>
              <div role="group" aria-labelledby="adm-source" className="flex rounded-full border border-gray-100 bg-white p-1 gap-1">
                {(['hosted', 'curated'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={form.source === v}
                    onClick={() => setSource(v)}
                    className={`flex-1 min-h-[44px] rounded-full text-sm font-medium transition-colors ${
                      form.source === v ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {v === 'hosted' ? 'Hosted (in-app RSVP)' : 'Curated (external link)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="adm-f1" className={labelClass}>Event title *</label>
                <input id="adm-f1" type="text" value={form.title} onChange={e => upd('title', e.target.value)}
                  placeholder="e.g. Sunday Morning Run" maxLength={80} className={inputClass} />
              </div>

              {form.source === 'curated' && (
                <>
                  <div>
                    <label htmlFor="adm-f2" className={labelClass}>Registration URL *</label>
                    <input id="adm-f2" type="url" value={form.registration_url} onChange={e => upd('registration_url', e.target.value)}
                      placeholder="https://..." className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="adm-f3" className={labelClass}>Source name <span className="font-normal text-gray-300">shown as &quot;via ...&quot;</span></label>
                    <input id="adm-f3" type="text" value={form.source_name} onChange={e => upd('source_name', e.target.value)}
                      placeholder="e.g. World Marathon Majors" className={inputClass} />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="adm-f4" className={labelClass}>Event type</label>
                <select id="adm-f4" value={form.event_type} onChange={e => upd('event_type', e.target.value)} className={inputClass}>
                  {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="adm-f5" className={labelClass}>Sport / discipline <span className="font-normal text-gray-300">for category search</span></label>
                <select id="adm-f5" value={form.discipline} onChange={e => upd('discipline', e.target.value)} className={inputClass}>
                  {DISCIPLINES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="adm-f6" className={labelClass}>Start date and time *</label>
                <input id="adm-f6" type="datetime-local" value={form.starts_at} onChange={e => upd('starts_at', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="adm-f7" className={labelClass}>Location *</label>
                <input id="adm-f7" type="text" value={form.location_name} onChange={e => upd('location_name', e.target.value)}
                  placeholder="e.g. Hyde Park, London" className={inputClass} />
              </div>
              <div>
                <label htmlFor="adm-f8" className={labelClass}>Latitude <span className="font-normal text-gray-300">powers &quot;near me&quot; search</span></label>
                <input id="adm-f8" type="number" value={form.lat} onChange={e => upd('lat', e.target.value)}
                  placeholder="e.g. 51.5074" step="0.000001" className={inputClass} />
              </div>
              <div>
                <label htmlFor="adm-f9" className={labelClass}>Longitude</label>
                <input id="adm-f9" type="number" value={form.lng} onChange={e => upd('lng', e.target.value)}
                  placeholder="e.g. -0.1278" step="0.000001" className={inputClass} />
              </div>
              <div>
                <label htmlFor="adm-f10" className={labelClass}>Distance (km) <span className="font-normal text-gray-300">Optional</span></label>
                <input id="adm-f10" type="number" value={form.distance_km} onChange={e => upd('distance_km', e.target.value)}
                  placeholder="e.g. 5" min="0" step="0.1" className={inputClass} />
              </div>
              <div>
                <label htmlFor="adm-f11" className={labelClass}>Organizer <span className="font-normal text-gray-300">Optional</span></label>
                <input id="adm-f11" type="text" value={form.organizer} onChange={e => upd('organizer', e.target.value)}
                  placeholder="e.g. Runivo Team" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="adm-f12" className={labelClass}>Description <span className="font-normal text-gray-300">Optional</span></label>
                <textarea id="adm-f12" value={form.description} onChange={e => upd('description', e.target.value)}
                  placeholder="Tell runners what to expect..." rows={2} maxLength={500}
                  className={`${inputClass} resize-none`} />
              </div>
            </div>

            <ErrorNote message={error} />

            <div className="flex gap-2 mt-4">
              <Button variant="secondary" grow onClick={cancel}>Cancel</Button>
              <Button grow onClick={save} disabled={!canSave || saving}>{saving ? 'Saving…' : editId ? 'Update event' : 'Create event'}</Button>
            </div>
          </FormCard>
      )}

      {loading ? (
        <Spinner />
      ) : events.length === 0 ? (
        <EmptyState icon={<Calendar className="w-8 h-8" />} title="No events yet." hint="Create your first one." />
      ) : (
        <TableCard>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Event</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden sm:table-cell">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden sm:table-cell">Location</th>
                <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {events.map(e => (
                <tr key={e.id} className={`transition-colors ${!e.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-900 leading-tight">{e.title}</p>
                      <Badge tone={e.source === 'curated' ? 'blue' : 'gray'}>{e.source === 'curated' ? 'Curated' : 'Hosted'}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                      {e.event_type.replace(/-/g, ' ')}
                      {e.discipline ? ` · ${e.discipline.replace(/_/g, ' ')}` : ''}
                      {e.source === 'curated' ? '' : ` · ${e.participant_count} going`}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell whitespace-nowrap">
                    {new Date(e.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    <br />
                    <span className="text-gray-300">{new Date(e.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell max-w-[140px] truncate">
                    {e.location_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusToggle active={e.is_active} name={e.title} onToggle={() => toggleActive(e)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton label={`Edit ${e.title}`} onClick={() => openEdit(e)}><Pencil className="w-4 h-4 text-gray-500" aria-hidden /></IconButton>
                      <IconButton variant="danger" label={`Remove ${e.title}`} onClick={() => setRemoving(e)}>
                        <Trash2 className="w-4 h-4" aria-hidden />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      {removing && (
        <RemoveDialog kind="event" id={removing.id} name={removing.title}
          onClose={() => setRemoving(null)} onDone={() => { setRemoving(null); load(); }} />
      )}
    </div>
  );
}
