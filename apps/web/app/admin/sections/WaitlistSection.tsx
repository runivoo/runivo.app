'use client';

import { useEffect, useState } from 'react';
import { Download, ListChecks } from 'lucide-react';
import { adminFetch, downloadCsv } from '@/lib/adminApi';
import { ghostBtn, thClass, ErrorNote, Spinner } from '../ui';

interface WaitlistRow { id: string; email: string; city: string | null; source: string; created_at: string }

export default function WaitlistSection() {
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch<{ total: number; rows: WaitlistRow[] }>('/waitlist')
      .then(d => { setRows(d.rows); setTotal(d.total); })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const exportCsv = () =>
    downloadCsv('runivo-waitlist.csv', [
      ['Email', 'City', 'Source', 'Joined'],
      ...rows.map(r => [r.email, r.city, r.source, r.created_at]),
    ]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Waitlist</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {loading ? 'Loading…' : `${total.toLocaleString()} sign-up${total === 1 ? '' : 's'} from runivo.in.`}
            {total > rows.length ? ` Showing the newest ${rows.length.toLocaleString()}.` : ''}
          </p>
        </div>
        <button onClick={exportCsv} disabled={rows.length === 0} className={`${ghostBtn} flex items-center gap-1.5`}>
          <Download className="w-3.5 h-3.5" />Export CSV
        </button>
      </div>

      <ErrorNote message={error} />

      {loading ? <Spinner /> : rows.length === 0 && !error ? (
        <div className="text-center py-16">
          <ListChecks className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No sign-ups yet. They appear here as people join from runivo.in.</p>
        </div>
      ) : rows.length > 0 && (
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className={thClass}>Email</th>
              <th className={`${thClass} hidden sm:table-cell`}>City</th>
              <th className={`${thClass} hidden sm:table-cell`}>Source</th>
              <th className={thClass}>Joined</th>
            </tr></thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-gray-900 break-all">{r.email}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{r.city ?? '–'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{r.source}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
