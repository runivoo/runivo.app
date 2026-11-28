'use client';

import { useEffect, useState } from 'react';
import { ClockCounterClockwise } from '@phosphor-icons/react/ssr';
import { adminFetch } from '@/lib/auth/adminApi';
import { thClass, ErrorNote, Spinner, Badge, SectionHeader, TableCard, EmptyState } from '../ui';

/* Every admin change, newest first (public.admin_actions, written by the server). Read-only. */

interface Action {
  id: number; admin_name: string; action: string; item_kind: string; item_id: string | null;
  item_label: string | null; details: { effects?: string[]; status?: string }; created_at: string;
}

const TONE: Record<string, 'red' | 'orange' | 'green' | 'blue' | 'gray'> = {
  delete: 'red', remove: 'red', remove_and_ban: 'red',
  hide: 'orange', end: 'orange', cancel: 'orange',
  create: 'green', show: 'green',
  update: 'blue', status: 'blue',
};
const ACTION_WORD: Record<string, string> = { remove_and_ban: 'remove + ban', dismiss: 'dismiss report' };

export default function ActivitySection() {
  const [rows, setRows] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch<{ actions: Action[] }>('/activity')
      .then(d => setRows(d.actions))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  return (
    <div>
      <SectionHeader title="Activity" description="Every change made in Studio, newest first. Kept for two years." />
      <ErrorNote message={error} />
      {loading ? <Spinner /> : rows.length === 0 && !error ? (
        <EmptyState icon={<ClockCounterClockwise className="w-8 h-8" />} title="No changes yet." hint="Creates, edits, hides and deletes show up here." />
      ) : rows.length > 0 && (
        <TableCard>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className={thClass}>When</th>
              <th className={thClass}>What</th>
              <th className={`${thClass} hidden sm:table-cell`}>Who</th>
            </tr></thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {rows.map(r => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{when(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={TONE[r.action] ?? 'gray'}>{ACTION_WORD[r.action] ?? r.action}</Badge>
                      <span className="text-gray-400 text-xs">{r.item_kind.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-gray-900 break-words">{r.item_label ?? r.item_id ?? ''}</span>
                    </div>
                    {r.details?.effects && r.details.effects.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {r.details.effects.map(e => <li key={e} className="text-xs text-gray-500">{e}</li>)}
                      </ul>
                    )}
                    <p className="text-xs text-gray-400 mt-1 sm:hidden">{r.admin_name}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell whitespace-nowrap">{r.admin_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </div>
  );
}
