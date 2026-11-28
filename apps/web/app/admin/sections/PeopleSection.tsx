'use client';

import { useCallback, useEffect, useState } from 'react';
import { CaretLeft, CaretRight, DownloadSimple, MagnifyingGlass, Users } from '@phosphor-icons/react/ssr';
import { adminFetch, downloadCsv } from '@/lib/adminApi';
import { inputClass, thClass, ErrorNote, Spinner, Badge, Button, IconButton, SectionHeader, TableCard, EmptyState } from '../ui';

/*
 * Every account, with its email (GET /api/admin/people → public.admin_people, migration 017).
 * The server checks the caller is an admin before reading emails, and never lets the
 * response be cached. Exports are recorded in Activity.
 */

interface Person {
  id: string; email: string | null; phone: string | null; username: string | null; display_name: string | null;
  tier: string; city: string | null; banned: boolean; email_confirmed: boolean;
  joined_at: string; last_sign_in_at: string | null; runs: number; last_run_at: string | null;
}

const day = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';

export default function PeopleSection() {
  const [people, setPeople] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    const qs = new URLSearchParams({ page: String(page) });
    if (search) qs.set('q', search);
    adminFetch<{ total: number; people: Person[]; pageSize: number }>(`/people?${qs}`)
      .then(d => { setPeople(d.people); setTotal(d.total); setPageSize(d.pageSize); })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [page, search]);
  useEffect(load, [load]);

  // Search as you type, a moment after the last key.
  useEffect(() => {
    const t = setTimeout(() => { setPage(0); setSearch(query.trim()); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const qs = new URLSearchParams({ export: '1' });
      if (search) qs.set('q', search);
      const d = await adminFetch<{ people: Person[] }>(`/people?${qs}`);
      downloadCsv('runivo-people.csv', [
        ['Name', 'Username', 'Email', 'Phone', 'City', 'Plan', 'Banned', 'Joined', 'Last sign-in', 'Runs', 'Last run'],
        ...d.people.map(p => [p.display_name, p.username, p.email, p.phone, p.city, p.tier, p.banned ? 'yes' : '', p.joined_at, p.last_sign_in_at, p.runs, p.last_run_at]),
      ]);
    } catch (e) { setError((e as Error).message); }
    setExporting(false);
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <SectionHeader
        title="People"
        description={loading && !people.length ? 'Loading…' : `${total.toLocaleString('en-IN')} ${search ? 'matching' : ''} account${total === 1 ? '' : 's'}.`}
        action={<Button variant="secondary" onClick={exportCsv} disabled={exporting || total === 0} icon={<DownloadSimple className="w-4 h-4" aria-hidden />}>{exporting ? 'Exporting…' : 'Export CSV'}</Button>}
      />

      <div className="relative mb-4 max-w-md">
        <MagnifyingGlass className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" aria-hidden />
        <input
          type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, username, email or phone"
          aria-label="Search people" className={`${inputClass} pl-10`}
        />
      </div>

      <ErrorNote message={error} />

      {loading && !people.length ? <Spinner /> : people.length === 0 && !error ? (
        <EmptyState icon={<Users className="w-8 h-8" />} title={search ? 'Nobody matches that search.' : 'No accounts yet.'} />
      ) : people.length > 0 && (
        <>
          <TableCard>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                <th className={thClass}>Person</th>
                <th className={`${thClass} hidden md:table-cell`}>Joined</th>
                <th className={`${thClass} hidden md:table-cell`}>Last seen</th>
                <th className={`${thClass} text-right`}>Runs</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {people.map(p => (
                  <tr key={p.id} className="align-top">
                    <td className="px-4 py-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">{p.display_name || p.username || 'No name'}</span>
                        {p.username && <span className="text-xs text-gray-400">@{p.username}</span>}
                        {p.tier !== 'free' && <Badge tone={p.tier === 'admin' ? 'blue' : 'gold'}>{p.tier}</Badge>}
                        {p.banned && <Badge tone="red">banned</Badge>}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 break-all">
                        {p.email ?? p.phone ?? '–'}
                        {p.email && !p.email_confirmed && <span className="text-xs text-amber-600"> · not confirmed</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 md:hidden">Joined {day(p.joined_at)}{p.city ? ` · ${p.city}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell whitespace-nowrap">{day(p.joined_at)}{p.city ? <span className="block text-gray-400">{p.city}</span> : null}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell whitespace-nowrap">{day(p.last_sign_in_at)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="text-gray-900">{p.runs.toLocaleString('en-IN')}</span>
                      {p.last_run_at && <span className="block text-xs text-gray-400">last {day(p.last_run_at)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>

          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <span className="text-sm text-gray-500 mr-1">Page {page + 1} of {pages}</span>
              <IconButton label="Previous page" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading}><CaretLeft className="w-4 h-4" aria-hidden /></IconButton>
              <IconButton label="Next page" onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1 || loading}><CaretRight className="w-4 h-4" aria-hidden /></IconButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}
