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
 *
 * Promotions table — run once in Supabase SQL editor:
 *   create table if not exists promotions (
 *     id          uuid default gen_random_uuid() primary key,
 *     title       text not null,
 *     subtitle    text,
 *     image_url   text,
 *     cta_label   text,
 *     cta_url     text,
 *     placement   text not null default 'home_banner',
 *     is_active   boolean not null default true,
 *     active_from timestamptz,
 *     active_until timestamptz,
 *     created_at  timestamptz default now()
 *   );
 *   alter table promotions enable row level security;
 *   create policy "Admin full access" on promotions
 *     using (exists (
 *       select 1 from profiles
 *       where profiles.id = auth.uid()
 *         and profiles.subscription_tier = 'admin'
 *     ));
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import {
  Calendar, Megaphone, Plus, Trash2, ToggleLeft, ToggleRight,
  ArrowLeft, Pencil, X, AlertCircle, ShieldAlert, ShoppingBag,
  Handshake, BarChart3, BellRing, Flag,
  Trophy, LogOut, ListChecks,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import StoreSection from './sections/StoreSection';
import PartnersSection from './sections/PartnersSection';
import ReportsSection from './sections/ReportsSection';
import CampaignsSection from './sections/CampaignsSection';
import RacesSection from './sections/RacesSection';
import ModerationSection from './sections/ModerationSection';
import WaitlistSection from './sections/WaitlistSection';
import { inputClass, labelClass, primaryBtn, ghostBtn } from './ui';
import { Logo } from '@/components/Logo';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface PromoRow {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  placement: string;
  is_active: boolean;
  active_from: string | null;
  active_until: string | null;
  created_at: string;
}

type AdminTab = 'moderation' | 'events' | 'races' | 'promotions' | 'store' | 'partners' | 'reports' | 'campaigns' | 'waitlist';

const NAV: { id: AdminTab; label: string; Icon: typeof Calendar }[] = [
  { id: 'moderation', label: 'Moderation', Icon: Flag        },
  { id: 'partners',   label: 'Partners',   Icon: Handshake   },
  { id: 'store',      label: 'PACE Store', Icon: ShoppingBag },
  { id: 'reports',    label: 'Reports',    Icon: BarChart3   },
  { id: 'campaigns',  label: 'Campaigns',  Icon: BellRing    },
  { id: 'waitlist',   label: 'Waitlist',   Icon: ListChecks  },
  { id: 'events',     label: 'Events',     Icon: Calendar    },
  { id: 'races',      label: 'Races',      Icon: Trophy      },
  { id: 'promotions', label: 'Promotions', Icon: Megaphone   },
];

// ─── Shared styles ────────────────────────────────────────────────────────────

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

const PLACEMENTS = [
  { value: 'home_banner',    label: 'Home — Hero banner' },
  { value: 'events_top',     label: 'Events — Top banner' },
  { value: 'missions_top',   label: 'Missions — Top banner' },
  { value: 'profile_banner', label: 'Profile — Top banner' },
];

// ─── Events section ───────────────────────────────────────────────────────────

const EMPTY_EVENT = {
  title: '', event_type: 'community-run', starts_at: '', ends_at: '',
  location_name: '', distance_km: '', description: '', organizer: '',
  source: 'hosted' as 'hosted' | 'curated',
  registration_url: '', source_name: '', discipline: '', lat: '', lng: '',
};

function EventsSection() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_EVENT);
  const [editId, setEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const del = async (id: string) => {
    setDeletingId(id);
    const { error: err } = await supabase.from('events').delete().eq('id', id);
    if (err) { setError(err.message); setDeletingId(null); return; }
    setEvents(prev => prev.filter(e => e.id !== id));
    setDeletingId(null);
  };

  const canSave = form.title.trim().length >= 3 && !!form.starts_at && form.location_name.trim().length >= 2
    && (form.source !== 'curated' || form.registration_url.trim().length > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Events</h2>
          <p className="text-xs text-gray-400 mt-0.5">{events.length} total · {events.filter(e => e.is_active).length} active</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-900 text-white min-h-[44px] text-sm font-semibold shadow-sm active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          New event
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 p-5 rounded-2xl border border-[#4E7F1F]/20 bg-[#EEF5E4]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">{editId ? 'Edit event' : 'New event'}</h3>
              <button onClick={cancel} className="w-11 h-11 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>

            {/* Source: hosted (in-app RSVP) vs curated (outbound registration link) —
                the field that decides which of the inputs below are shown/required. */}
            <div className="mb-4">
              <span id="adm-source" className={labelClass}>Source</span>
              <div role="group" aria-labelledby="adm-source" className="flex rounded-xl border border-gray-100 bg-gray-50 p-1 gap-1">
                {(['hosted', 'curated'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={form.source === v}
                    onClick={() => setSource(v)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      form.source === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
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

            {error && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-500">{error}</p>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={cancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 bg-white">Cancel</button>
              <button
                onClick={save}
                disabled={!canSave || saving}
                className="flex-1 py-2.5 rounded-full bg-gray-900 text-white min-h-[44px] text-sm font-bold disabled:opacity-40 active:scale-95 transition-transform"
              >
                {saving ? 'Saving…' : editId ? 'Update event' : 'Create event'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(78,127,31,0.15)', borderTopColor: '#4E7F1F' }} />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No events yet. Create your first one.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3">Event</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 hidden sm:table-cell">Date</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 hidden sm:table-cell">Location</th>
                <th className="text-center text-xs font-semibold text-gray-400 px-4 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {events.map(e => (
                <tr key={e.id} className={`transition-colors ${!e.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-900 leading-tight">{e.title}</p>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        e.source === 'curated' ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {e.source === 'curated' ? 'Curated' : 'Hosted'}
                      </span>
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
                    <button onClick={() => toggleActive(e)} aria-pressed={e.is_active} aria-label={`${e.title}: ${e.is_active ? 'live' : 'off'}`} className="inline-flex items-center gap-1.5 min-h-[44px]">
                      {e.is_active
                        ? <ToggleRight className="w-5 h-5 text-[#4E7F1F]" />
                        : <ToggleLeft className="w-5 h-5 text-gray-300" />}
                      <span className={`text-xs font-semibold ${e.is_active ? 'text-[#4E7F1F]' : 'text-gray-300'}`}>
                        {e.is_active ? 'Live' : 'Off'}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(e)} aria-label={`Edit ${e.title}`} className="w-11 h-11 rounded-full border border-gray-100 bg-white flex items-center justify-center hover:border-gray-300 transition-colors">
                        <Pencil className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => del(e.id)}
                        aria-label={`Delete ${e.title}`}
                        disabled={deletingId === e.id}
                        className="w-11 h-11 rounded-full border border-red-100 bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors disabled:opacity-40"
                      >
                        {deletingId === e.id
                          ? <div className="w-3 h-3 rounded-full border border-red-300 border-t-transparent animate-spin" />
                          : <Trash2 className="w-4 h-4 text-red-400" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Promotions section ───────────────────────────────────────────────────────

const EMPTY_PROMO = {
  title: '', subtitle: '', image_url: '', cta_label: '', cta_url: '',
  placement: 'home_banner', active_from: '', active_until: '',
};

function PromotionsSection() {
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_PROMO);
  const [editId, setEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tableExists, setTableExists] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });
    if (err?.message?.includes('does not exist') || err?.code === '42P01') {
      setTableExists(false);
    } else {
      setPromos(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const upd = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setForm(EMPTY_PROMO); setEditId(null); setError(''); setShowForm(true); };

  const openEdit = (p: PromoRow) => {
    setForm({
      title:       p.title,
      subtitle:    p.subtitle ?? '',
      image_url:   p.image_url ?? '',
      cta_label:   p.cta_label ?? '',
      cta_url:     p.cta_url ?? '',
      placement:   p.placement,
      active_from: p.active_from ? new Date(p.active_from).toISOString().slice(0, 16) : '',
      active_until: p.active_until ? new Date(p.active_until).toISOString().slice(0, 16) : '',
    });
    setEditId(p.id);
    setError('');
    setShowForm(true);
  };

  const cancel = () => { setShowForm(false); setEditId(null); setError(''); };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setError('');
    const payload = {
      title:        form.title.trim(),
      subtitle:     form.subtitle.trim() || null,
      image_url:    form.image_url.trim() || null,
      cta_label:    form.cta_label.trim() || null,
      cta_url:      form.cta_url.trim() || null,
      placement:    form.placement,
      active_from:  form.active_from ? new Date(form.active_from).toISOString() : null,
      active_until: form.active_until ? new Date(form.active_until).toISOString() : null,
    };
    const { error: err } = editId
      ? await supabase.from('promotions').update(payload).eq('id', editId)
      : await supabase.from('promotions').insert({ ...payload, is_active: true });
    if (err) { setError(err.message); setSaving(false); return; }
    await load();
    cancel();
    setSaving(false);
  };

  const toggleActive = async (row: PromoRow) => {
    const { error: err } = await supabase.from('promotions').update({ is_active: !row.is_active }).eq('id', row.id);
    if (err) { setError(err.message); return; }
    setPromos(prev => prev.map(p => p.id === row.id ? { ...p, is_active: !p.is_active } : p));
  };

  const del = async (id: string) => {
    setDeletingId(id);
    const { error: err } = await supabase.from('promotions').delete().eq('id', id);
    if (err) { setError(err.message); setDeletingId(null); return; }
    setPromos(prev => prev.filter(p => p.id !== id));
    setDeletingId(null);
  };

  if (!tableExists) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 mb-1">Promotions table not found</p>
            <p className="text-xs text-amber-600 mb-3">Run this SQL in your Supabase SQL editor to enable promotions:</p>
            <pre className="text-xs bg-white border border-amber-100 rounded-xl p-4 text-gray-700 overflow-x-auto leading-relaxed">{`create table if not exists promotions (
  id           uuid default gen_random_uuid() primary key,
  title        text not null,
  subtitle     text,
  image_url    text,
  cta_label    text,
  cta_url      text,
  placement    text not null default 'home_banner',
  is_active    boolean not null default true,
  active_from  timestamptz,
  active_until timestamptz,
  created_at   timestamptz default now()
);
alter table promotions enable row level security;
create policy "Admin full access" on promotions
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.subscription_tier = 'admin'
  ));`}</pre>
            <button onClick={load} className="mt-3 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold">
              Retry after running SQL
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Promotions</h2>
          <p className="text-xs text-gray-400 mt-0.5">{promos.length} total · {promos.filter(p => p.is_active).length} active</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-900 text-white min-h-[44px] text-sm font-semibold shadow-sm active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          New Banner
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {PLACEMENTS.map(p => (
          <span key={p.value} className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-xs font-medium text-gray-400">
            <span className="text-gray-600">{p.value}</span> → {p.label}
          </span>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 p-5 rounded-2xl border border-[#4E7F1F]/20 bg-[#EEF5E4]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">{editId ? 'Edit promotion' : 'New promotion'}</h3>
              <button onClick={cancel} className="w-11 h-11 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="adm-f13" className={labelClass}>Title *</label>
                <input id="adm-f13" type="text" value={form.title} onChange={e => upd('title', e.target.value)}
                  placeholder="e.g. Summer Territory Challenge" maxLength={80} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="adm-f14" className={labelClass}>Subtitle <span className="font-normal text-gray-300">Optional</span></label>
                <input id="adm-f14" type="text" value={form.subtitle} onChange={e => upd('subtitle', e.target.value)}
                  placeholder="e.g. Claim 50 zones, win a prize" maxLength={120} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="adm-f15" className={labelClass}>Image URL <span className="font-normal text-gray-300">Optional</span></label>
                <input id="adm-f15" type="url" value={form.image_url} onChange={e => upd('image_url', e.target.value)}
                  placeholder="https://..." className={inputClass} />
                {form.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image_url} alt="preview" className="mt-2 w-full max-h-28 object-cover rounded-xl border border-gray-100" onError={e => (e.currentTarget.style.display = 'none')} />
                )}
              </div>
              <div>
                <label htmlFor="adm-f16" className={labelClass}>CTA label <span className="font-normal text-gray-300">Optional</span></label>
                <input id="adm-f16" type="text" value={form.cta_label} onChange={e => upd('cta_label', e.target.value)}
                  placeholder="e.g. Join Now" maxLength={30} className={inputClass} />
              </div>
              <div>
                <label htmlFor="adm-f17" className={labelClass}>CTA URL <span className="font-normal text-gray-300">Optional</span></label>
                <input id="adm-f17" type="text" value={form.cta_url} onChange={e => upd('cta_url', e.target.value)}
                  placeholder="e.g. /events or https://..." className={inputClass} />
              </div>
              <div>
                <label htmlFor="adm-f18" className={labelClass}>Placement</label>
                <select id="adm-f18" value={form.placement} onChange={e => upd('placement', e.target.value)} className={inputClass}>
                  {PLACEMENTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div />
              <div>
                <label htmlFor="adm-f19" className={labelClass}>Active from <span className="font-normal text-gray-300">Optional</span></label>
                <input id="adm-f19" type="datetime-local" value={form.active_from} onChange={e => upd('active_from', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="adm-f20" className={labelClass}>Active until <span className="font-normal text-gray-300">Optional</span></label>
                <input id="adm-f20" type="datetime-local" value={form.active_until} onChange={e => upd('active_until', e.target.value)} className={inputClass} />
              </div>
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-500">{error}</p>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={cancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 bg-white">Cancel</button>
              <button
                onClick={save}
                disabled={!form.title.trim() || saving}
                className="flex-1 py-2.5 rounded-full bg-gray-900 text-white min-h-[44px] text-sm font-bold disabled:opacity-40 active:scale-95 transition-transform"
              >
                {saving ? 'Saving…' : editId ? 'Update banner' : 'Create banner'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(78,127,31,0.15)', borderTopColor: '#4E7F1F' }} />
        </div>
      ) : promos.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No promotions yet. Create your first banner.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map(p => (
            <div key={p.id} className={`rounded-2xl border bg-white overflow-hidden transition-opacity ${!p.is_active ? 'opacity-50' : 'border-gray-100'}`}>
              <div className="flex gap-4 p-4">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.title} className="w-20 h-14 object-cover rounded-xl flex-shrink-0 bg-gray-50" />
                ) : (
                  <div className="w-20 h-14 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-5 h-5 text-gray-200" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{p.title}</p>
                      {p.subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.subtitle}</p>}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-xs font-medium text-gray-500">{p.placement}</span>
                        {p.cta_label && <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-xs font-medium text-blue-500">CTA: {p.cta_label}</span>}
                        {p.active_until && <span className="text-xs text-gray-300">Until {new Date(p.active_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => toggleActive(p)} aria-pressed={p.is_active} aria-label={`${p.title}: ${p.is_active ? 'live' : 'off'}`} className="flex items-center gap-1 px-2 min-h-[44px] rounded-full hover:bg-gray-50 transition-colors">
                        {p.is_active ? <ToggleRight className="w-5 h-5 text-[#4E7F1F]" /> : <ToggleLeft className="w-5 h-5 text-gray-300" />}
                        <span className={`text-xs font-semibold ${p.is_active ? 'text-[#4E7F1F]' : 'text-gray-300'}`}>{p.is_active ? 'Live' : 'Off'}</span>
                      </button>
                      <button onClick={() => openEdit(p)} aria-label={`Edit ${p.title}`} className="w-11 h-11 rounded-full border border-gray-100 flex items-center justify-center hover:border-gray-300 transition-colors">
                        <Pencil className="w-4 h-4 text-gray-400" />
                      </button>
                      <button onClick={() => del(p.id)} aria-label={`Delete ${p.title}`} disabled={deletingId === p.id} className="w-11 h-11 rounded-full border border-red-100 bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors disabled:opacity-40">
                        {deletingId === p.id ? <div className="w-3 h-3 rounded-full border border-red-300 border-t-transparent animate-spin" /> : <Trash2 className="w-4 h-4 text-red-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Admin page ──────────────────────────────────────────────────────────

type AccessState = 'loading' | 'granted' | 'denied' | 'signed_out';

export default function AdminPage() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>('loading');
  const [tab, setTab] = useState<AdminTab>('moderation');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setAccess('signed_out'); return; }
    const { data } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', session.user.id)
      .single();
    setAccess(data?.subscription_tier === 'admin' ? 'granted' : 'denied');
  };

  useEffect(() => { checkAccess(); }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setEmail(''); setPassword('');
    setAccess('signed_out');
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    setSignInError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSignInError(error.message);
      setSigningIn(false);
      return;
    }
    setSigningIn(false);
    await checkAccess();
  };

  const shell = 'min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-10';
  const authCard = 'w-full max-w-sm rounded-2xl bg-white border border-gray-100 p-8';

  if (access === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="status" aria-label="Loading">
        <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(78,127,31,0.15)', borderTopColor: '#4E7F1F' }} />
      </div>
    );
  }

  if (access === 'signed_out') {
    return (
      <main id="main" className={shell}>
        <div className={authCard}>
          <div className="mb-6"><Logo size={24} href={null} /></div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">Admin sign in</h1>
          <p className="text-sm text-gray-500 mb-6">Sign in with your admin account to continue.</p>
          <form
            onSubmit={e => { e.preventDefault(); if (!signingIn && email && password) handleSignIn(); }}
            className="flex flex-col gap-4"
          >
            <div>
              <label htmlFor="admin-email" className={labelClass}>Email</label>
              <input
                id="admin-email" type="email" autoComplete="username" inputMode="email" required
                value={email} onChange={e => setEmail(e.target.value)} className={inputClass}
                aria-invalid={!!signInError} aria-describedby={signInError ? 'admin-signin-error' : undefined}
              />
            </div>
            <div>
              <label htmlFor="admin-password" className={labelClass}>Password</label>
              <input
                id="admin-password" type="password" autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)} className={inputClass}
                aria-invalid={!!signInError} aria-describedby={signInError ? 'admin-signin-error' : undefined}
              />
            </div>
            {signInError && <p id="admin-signin-error" role="alert" className="text-sm text-red-600">{signInError}</p>}
            <button type="submit" disabled={signingIn || !email || !password} className={`${primaryBtn} w-full`}>
              {signingIn ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (access === 'denied') {
    return (
      <main id="main" className={shell}>
        <div className={`${authCard} text-center`}>
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-7 h-7 text-red-500" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-2">Access denied</h1>
          <p className="text-sm text-gray-500">
            This page is for Runivo admins only. Your account doesn&apos;t have admin access.
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Ask the Runivo team to grant your account admin access.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-6">
            <button onClick={() => router.push('/')} className={`${primaryBtn} flex-1`}>Back to home</button>
            <button onClick={handleSignOut} className={`${ghostBtn} flex-1`}>Sign out</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-gray-50">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-5 min-h-[68px] flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Back to the site"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" strokeWidth={2} aria-hidden />
          </button>
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <Logo size={22} href={null} />
            <h1 className="text-sm font-medium text-gray-500 border-l border-gray-100 pl-3">Admin</h1>
          </div>
          <button onClick={handleSignOut} className={ghostBtn}>
            <LogOut className="w-4 h-4" strokeWidth={2} aria-hidden /> Sign out
          </button>
        </header>

        <div className="flex min-h-[calc(100vh-68px)]">
          {/* Sidebar */}
          <nav aria-label="Admin sections" className="w-56 flex-shrink-0 border-r border-gray-100 bg-white pt-6 px-3 hidden sm:block">
            {NAV.map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-4 min-h-[44px] rounded-full text-sm font-medium mb-1 transition-colors ${
                  tab === item.id
                    ? 'bg-green-50 text-[#4E7F1F] font-semibold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} aria-hidden />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Mobile tab bar */}
          <nav aria-label="Admin sections" className="sm:hidden fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-100 flex overflow-x-auto">
            {NAV.map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
                className={`flex-1 min-w-[76px] min-h-[56px] flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                  tab === item.id ? 'text-[#4E7F1F]' : 'text-gray-500'
                }`}
              >
                <item.Icon className="w-5 h-5" strokeWidth={1.8} aria-hidden />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <main id="main" className="flex-1 px-5 py-6 pb-32 sm:pb-8 max-w-4xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
              >
                {tab === 'moderation' && <ModerationSection />}
                {tab === 'events'     && <EventsSection />}
                {tab === 'races'      && <RacesSection />}
                {tab === 'promotions' && <PromotionsSection />}
                {tab === 'store'      && <StoreSection />}
                {tab === 'partners'   && <PartnersSection />}
                {tab === 'reports'    && <ReportsSection />}
                {tab === 'campaigns'  && <CampaignsSection />}
                {tab === 'waitlist'   && <WaitlistSection />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
