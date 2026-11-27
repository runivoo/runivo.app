'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { adminFetch } from '@/lib/adminApi';
import { thClass, ErrorNote, Spinner, Badge, Button, SectionHeader, TableCard, EmptyState } from '../ui';

/**
 * Races runners added in plan setup. Approving puts one in the catalogue so
 * everyone can find it; check the date and distance against the organiser's
 * site first, because a wrong date makes plans peak on the wrong day.
 * Curated races come from curated Events and need no review here.
 */
interface RaceRow {
  id: string;
  name: string;
  city: string | null;
  starts_on: string;
  website_url: string | null;
  created_at: string;
  race_distances: { label: string; race_entries: { count: number }[] }[];
}

export default function RacesSection() {
  const [rows, setRows] = useState<RaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { races } = await adminFetch<{ races: RaceRow[] }>('/races');
      setRows(races);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load races');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const review = async (id: string, approve: boolean) => {
    setBusy(id); setError('');
    try {
      await adminFetch('/races', { method: 'POST', body: JSON.stringify({ id, approve }) });
      setRows(r => r.filter(x => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Races to review"
        description={<>Added by runners in plan setup. Check the date and distance on the organiser&apos;s site before approving.
        Curated races come from Events automatically.</>}
      />
      {error && <ErrorNote message={error} />}
      {loading ? <Spinner /> : rows.length === 0 ? (
        <EmptyState title="Nothing waiting." hint="Races runners add in plan setup show up here." />
      ) : (
        <TableCard>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className={thClass}>Race</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Distance</th>
                <th className={thClass}>Entered</th>
                <th className={thClass} />
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const entered = r.race_distances.reduce((t, d) => t + (d.race_entries[0]?.count ?? 0), 0);
                return (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-500">
                        {r.city ?? 'No city'}
                        {r.website_url && <> · <span className="font-mono">{r.website_url}</span></>}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{r.starts_on}</td>
                    <td className="px-4 py-3">{r.race_distances.map(d => <Badge key={d.label} tone="blue">{d.label}</Badge>)}</td>
                    <td className="px-4 py-3 text-gray-700">{entered}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" size="sm" disabled={busy === r.id} onClick={() => review(r.id, true)} aria-label={`Approve ${r.name}`} icon={<Check className="w-4 h-4" aria-hidden />}>Approve</Button>
                        <Button variant="secondary" size="sm" disabled={busy === r.id} onClick={() => review(r.id, false)} aria-label={`Reject ${r.name}`} icon={<X className="w-4 h-4" aria-hidden />}>Reject</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      )}
    </div>
  );
}
