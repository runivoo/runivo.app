'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { adminFetch } from '@/lib/adminApi';
import { ErrorNote, Spinner, Button, SectionHeader } from '../ui';

/*
 * Studio overview: how Runivo is doing, on one page. Numbers come from
 * /api/admin/overview (database: migration 015; email: Resend).
 */

interface Day { day: string; count: number }
interface Named { name: string; count: number }
interface Overview {
  generated_at: string;
  waitlist: { total: number; today: number; last_7d: number; daily: Day[]; cities: Named[]; sources: Named[] };
  runners: { total: number; new_7d: number; active_7d: number; daily_new: Day[] };
  runs: { total: number; last_7d: number; km_7d: number; km_total: number };
  territory: { zones: number; claimed_7d: number };
  partners: { waiting: number; live: number; redeemed_30d: number };
  email: {
    available: boolean; reason?: string; capped: boolean;
    sent: number; delivered: number; opened: number; clicked: number; bounced: number; complained: number; other: number;
  };
}

const n = (v: number) => v.toLocaleString('en-IN');
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–');

export default function OverviewSection() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminFetch<Overview>('/overview')
      .then(setData)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  return (
    <div>
      <SectionHeader
        title="Overview"
        description={data ? `How Runivo is doing. Updated ${new Date(data.generated_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}.` : 'How Runivo is doing.'}
        action={<Button variant="secondary" onClick={load} disabled={loading} icon={<RefreshCw className="w-4 h-4" aria-hidden />}>Refresh</Button>}
      />
      <ErrorNote message={error} />

      {loading && !data ? <Spinner /> : data && (
        <div className="space-y-6">
          <Group title="Waitlist">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="People waiting" value={n(data.waitlist.total)} />
              <Stat label="Joined today" value={n(data.waitlist.today)} />
              <Stat label="Last 7 days" value={n(data.waitlist.last_7d)} />
              <Stat label="Top city" value={data.waitlist.cities[0]?.name ?? '–'} />
            </div>
            <Card title="Sign-ups per day" subtitle="Last 30 days">
              <Bars days={data.waitlist.daily} />
            </Card>
            <div className="grid md:grid-cols-2 gap-3">
              <Card title="Cities"><Ranked rows={data.waitlist.cities} total={data.waitlist.total} /></Card>
              <Card title="Where they came from"><Ranked rows={data.waitlist.sources} total={data.waitlist.total} /></Card>
            </div>
          </Group>

          <Group title="Welcome email">
            {data.email.available ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Stat label="Sent" value={n(data.email.sent)} />
                  <Stat label="Delivered" value={n(data.email.delivered)} hint={pct(data.email.delivered, data.email.sent)} />
                  <Stat label="Opened" value={n(data.email.opened)} hint={`${pct(data.email.opened, data.email.delivered)} · approximate`} />
                  <Stat label="Bounced or spam" value={n(data.email.bounced + data.email.complained)}
                        tone={data.email.bounced + data.email.complained > 0 ? 'warn' : undefined} />
                </div>
                <p className="text-xs text-gray-400">
                  From Resend. Some email apps block open tracking, so real opens are higher.
                  {data.email.capped ? ' Counted over the most recent 2,000 emails.' : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500 rounded-2xl border border-gray-100 bg-white p-5">{data.email.reason}</p>
            )}
          </Group>

          <Group title="App">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Runners" value={n(data.runners.total)} hint={`+${n(data.runners.new_7d)} this week`} />
              <Stat label="Ran this week" value={n(data.runners.active_7d)} />
              <Stat label="Runs this week" value={n(data.runs.last_7d)} hint={`${n(data.runs.total)} all time`} />
              <Stat label="Km this week" value={n(data.runs.km_7d)} hint={`${n(data.runs.km_total)} all time`} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Zones held" value={n(data.territory.zones)} hint={`${n(data.territory.claimed_7d)} claimed this week`} />
              <Stat label="Brands live" value={n(data.partners.live)} />
              <Stat label="Brands waiting" value={n(data.partners.waiting)} tone={data.partners.waiting > 0 ? 'warn' : undefined} />
              <Stat label="Rewards redeemed" value={n(data.partners.redeemed_30d)} hint="last 30 days" />
            </div>
            <Card title="New runners per day" subtitle="Last 30 days">
              <Bars days={data.runners.daily_new} />
            </Card>
          </Group>
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-500">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'warn' }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 min-w-0">
      <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
      <p className={`text-2xl font-semibold tracking-tight mt-1 truncate ${tone === 'warn' ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-0.5 truncate">{hint}</p>}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** Daily counts as bars. Hover (or long-press) a bar for its day and number. */
function Bars({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map(d => d.count));
  const label = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (days.every(d => d.count === 0)) return <p className="text-sm text-gray-400 py-6 text-center">Nothing yet in the last 30 days.</p>;
  return (
    <div>
      <div className="flex items-end gap-[3px] h-28" role="img" aria-label={`Daily counts, last 30 days, highest ${max}`}>
        {days.map(d => (
          <div key={d.day} title={`${label(d.day)}: ${d.count}`} className="flex-1 h-full flex items-end">
            <div className="w-full rounded-t-[3px] bg-[#4E7F1F]/80 hover:bg-[#4E7F1F]"
                 style={{ height: d.count ? `${Math.max(6, (d.count / max) * 100)}%` : '2px', opacity: d.count ? 1 : 0.25 }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-gray-400 mt-2">
        <span>{label(days[0].day)}</span><span>Today</span>
      </div>
    </div>
  );
}

/** A short ranked list with a share bar. */
function Ranked({ rows, total }: { rows: Named[]; total: number }) {
  if (rows.length === 0) return <p className="text-sm text-gray-400 py-4 text-center">Nothing yet.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map(r => (
        <li key={r.name}>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 truncate capitalize">{r.name}</span>
            <span className="text-gray-500 tabular-nums">{n(r.count)} <span className="text-gray-300">· {pct(r.count, total)}</span></span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-50 mt-1 overflow-hidden">
            <div className="h-full rounded-full bg-[#4E7F1F]/70" style={{ width: total ? `${(r.count / total) * 100}%` : 0 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
