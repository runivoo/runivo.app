'use client';

import { useEffect, useState } from 'react';
import { Download, ListChecks } from 'lucide-react';
import { adminFetch, downloadCsv } from '@/lib/adminApi';
import { thClass, ErrorNote, Spinner, Button, SectionHeader, TableCard, EmptyState } from '../ui';

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
      <SectionHeader
        title="Waitlist"
        description={<>{loading ? 'Loading…' : `${total.toLocaleString()} sign-up${total === 1 ? '' : 's'} from runivo.in.`}
            {total > rows.length ? ` Showing the newest ${rows.length.toLocaleString()}.` : ''}</>}
        action={<Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0} icon={<Download className="w-4 h-4" aria-hidden />}>Export CSV</Button>}
      />

      <ErrorNote message={error} />

      {loading ? <Spinner /> : rows.length === 0 && !error ? (
        <EmptyState icon={<ListChecks className="w-8 h-8" />} title="No sign-ups yet." hint="They appear here as people join from runivo.in." />
      ) : rows.length > 0 && (
        <TableCard>
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
        </TableCard>
      )}
    </div>
  );
}
