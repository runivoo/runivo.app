'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowsClockwise, Globe } from '@phosphor-icons/react/ssr';
import { adminFetch } from '@/lib/adminApi';
import { ErrorNote, Spinner, Button, SectionHeader, EmptyState } from '../ui';
import { Stat, Card, Bars, Ranked } from './OverviewSection';

/*
 * runivo.in visitors, from PostHog (server-side, /api/admin/website), and how
 * many of them joined the waitlist. Studio and sign-in pages are not counted.
 */

interface Named { name: string; count: number }
interface Day { day: string; count: number }
type Website =
  | { configured: false }
  | {
      configured: true; range: number; visitors: number; visitorsPrev: number; pageviews: number; signups: number;
      daily: Day[]; pages: Named[]; referrers: Named[]; countries: Named[]; devices: Named[];
    };

const RANGES = [7, 30, 90] as const;
const n = (v: number) => v.toLocaleString('en-IN');

function change(now: number, before: number): string | undefined {
  if (before === 0) return now > 0 ? 'New this period' : undefined;
  const p = Math.round(((now - before) / before) * 100);
  return `${p >= 0 ? '+' : ''}${p}% vs the period before`;
}

export default function WebsiteSection() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminFetch<Website>(`/website?days=${days}`)
      .then(setData)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [days]);
  useEffect(load, [load]);

  return (
    <div>
      <SectionHeader
        title="Website"
        description="Who visits runivo.in, where they come from, and how many join the waitlist."
        action={<>
          <div role="group" aria-label="Period" className="inline-flex rounded-xl border border-gray-100 bg-white p-1">
            {RANGES.map(r => (
              <button key={r} type="button" onClick={() => setDays(r)} aria-pressed={days === r}
                className={`px-3 py-1.5 text-sm rounded-lg ${days === r ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                {r} days
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={load} disabled={loading} icon={<ArrowsClockwise className="w-4 h-4" aria-hidden />}>Refresh</Button>
        </>}
      />
      <ErrorNote message={error} />

      {loading && !data ? <Spinner /> : data && !data.configured ? (
        <EmptyState
          icon={<Globe className="w-8 h-8" />}
          title="Connect PostHog to see website numbers."
          hint="In PostHog: Settings → Personal API keys → create one with only the “Query: read” scope. In Vercel, add it as POSTHOG_PERSONAL_API_KEY, and the number from your PostHog project's address (/project/12345) as POSTHOG_PROJECT_ID. Then redeploy."
        />
      ) : data && data.configured && (
        <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Visitors" value={n(data.visitors)} hint={change(data.visitors, data.visitorsPrev)} />
            <Stat label="Page views" value={n(data.pageviews)} hint={data.visitors ? `${(data.pageviews / data.visitors).toFixed(1)} per visitor` : undefined} />
            <Stat label="Joined the waitlist" value={n(data.signups)} hint={`Last ${data.range} days`} />
            <Stat label="Visitors who joined" value={data.visitors ? `${((data.signups / data.visitors) * 100).toFixed(1)}%` : '–'} hint="Sign-ups ÷ visitors" />
          </div>

          <Card title="Visitors per day" subtitle={`Last ${data.range} days`}>
            <Bars days={data.daily} empty={`No visitors in the last ${data.range} days.`} />
          </Card>

          <div className="grid lg:grid-cols-2 gap-3">
            <Card title="Where visitors came from" subtitle="Referring site">
              <Ranked rows={data.referrers} total={data.visitors} />
            </Card>
            <Card title="Top pages" subtitle="Page views">
              <Ranked rows={data.pages} total={data.pageviews} />
            </Card>
            <Card title="Countries" subtitle="Visitors">
              <Ranked rows={data.countries} total={data.visitors} />
            </Card>
            <Card title="Devices" subtitle="Visitors">
              <Ranked rows={data.devices} total={data.visitors} />
            </Card>
          </div>
          <p className="text-xs text-gray-400">
            A visitor is one browser. People who block analytics aren’t counted, so the real number is a bit higher.
          </p>
        </div>
      )}
    </div>
  );
}
