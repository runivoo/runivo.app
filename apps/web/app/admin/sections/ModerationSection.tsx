'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { Sparkle } from '@phosphor-icons/react/ssr';
import { ErrorNote, Spinner, Badge, Button, SectionHeader, EmptyState } from '../ui';

interface Item {
  key: string;
  source: 'comment' | 'club' | 'event' | 'post' | 'user' | 'club_message';
  target_id: string;
  report_count: number;
  reasons: string[];
  first_reported_at: string;
  preview: string | null;
  author_id: string | null;
  author_username: string | null;
}

const LABEL: Record<Item['source'], string> = {
  comment: 'Comment', club: 'Club', event: 'Event', post: 'Post', user: 'Runner', club_message: 'Club chat message',
};

type Verdict = 'spam' | 'harmful' | 'probably_fine' | 'needs_human';
const VERDICT: Record<Verdict, { label: string; tone: 'red' | 'orange' | 'green' | 'gray' }> = {
  harmful: { label: 'AI: harmful', tone: 'red' }, spam: { label: 'AI: spam', tone: 'orange' },
  needs_human: { label: 'AI: needs a look', tone: 'gray' }, probably_fine: { label: 'AI: probably fine', tone: 'green' },
};
const ORDER: Verdict[] = ['harmful', 'spam', 'needs_human', 'probably_fine'];

const ago = (iso: string) => {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  return h < 1 ? 'under an hour ago' : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

/**
 * The review queue for everything people report in the app. The App Store
 * guideline on user-generated content (1.2) expects reports to reach someone
 * who acts; docs/MODERATION.md sets the target at 24 hours. Items past that are
 * marked so they are not missed.
 */
export default function ModerationSection() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [triage, setTriage] = useState<Record<string, { verdict: Verdict; reason: string }>>({});
  const [sorting, setSorting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await adminFetch<{ items: Item[] }>('/moderation');
      setItems(items);
      setError('');
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (item: Item, action: 'dismiss' | 'remove' | 'remove_and_ban') => {
    const confirmText =
      action === 'dismiss' ? null
      : action === 'remove' ? `Delete this ${LABEL[item.source].toLowerCase()} for everyone?`
      : `Delete this ${LABEL[item.source].toLowerCase()} AND suspend ${item.author_username ?? 'its author'}? They will no longer be able to post.`;
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(item.key);
    try {
      await adminFetch('/moderation', { method: 'POST', body: JSON.stringify({ source: item.source, target_id: item.target_id, action }) });
      setItems(prev => prev.filter(i => i.key !== item.key));
    } catch (e) { setError((e as Error).message); }
    setBusy(null);
  };

  // AI sorts the queue (harmful first); the actions stay with the admin.
  const sortWithAi = async () => {
    setSorting(true); setError('');
    try {
      const r = await adminFetch<{ results: Record<string, { verdict: Verdict; reason: string }> }>('/moderation/triage', {
        method: 'POST',
        body: JSON.stringify({ items: items.map(i => ({ key: i.key, kind: i.source, preview: i.preview, reasons: i.reasons, report_count: i.report_count })) }),
      });
      setTriage(r.results);
    } catch (e) { setError((e as Error).message); }
    setSorting(false);
  };
  const shown = Object.keys(triage).length
    ? [...items].sort((a, b) => ORDER.indexOf(triage[a.key]?.verdict ?? 'needs_human') - ORDER.indexOf(triage[b.key]?.verdict ?? 'needs_human'))
    : items;

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionHeader
        title="Moderation"
        description={<>Open reports, oldest first. Act within 24 hours. Removing deletes the content; suspending also stops its author from posting.</>}
        action={items.length > 0 && <Button variant="secondary" onClick={sortWithAi} disabled={sorting} icon={<Sparkle className="w-4 h-4" aria-hidden />}>{sorting ? 'Sorting…' : 'Sort with AI'}</Button>}
      />
      {Object.keys(triage).length > 0 && <p className="text-xs text-gray-400 -mt-3 mb-4">Sorted by AI: harmful first. AI only suggests; check each item before acting.</p>}
      <ErrorNote message={error} />

      {items.length === 0 ? (
        <EmptyState title="Nothing to review." hint="New reports appear here." />
      ) : (
        <ul className="space-y-3">
          {shown.map(item => {
            const overdue = Date.now() - new Date(item.first_reported_at).getTime() > 24 * 3_600_000;
            return (
              <li key={item.key} className="p-4 rounded-2xl border border-gray-100 bg-white">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge tone="blue">{LABEL[item.source]}</Badge>
                  <Badge tone={item.report_count >= 3 ? 'red' : 'gray'}>{item.report_count} report{item.report_count === 1 ? '' : 's'}</Badge>
                  {overdue && <Badge tone="orange">over 24h</Badge>}
                  <span className="text-xs text-gray-400">first reported {ago(item.first_reported_at)}</span>
                  {triage[item.key] && <Badge tone={VERDICT[triage[item.key].verdict].tone}>{VERDICT[triage[item.key].verdict].label}</Badge>}
                </div>
                {triage[item.key]?.reason && <p className="text-xs text-gray-500 mb-1.5">{triage[item.key].reason}</p>}
                <p className="text-[15px] text-gray-900 whitespace-pre-wrap break-words">
                  {item.preview ?? <span className="text-gray-400">(content already removed)</span>}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {item.author_username ? <>By <strong>{item.author_username}</strong> · </> : null}
                  Reasons: {item.reasons.join(', ')}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button variant="secondary" size="sm" disabled={busy === item.key} onClick={() => act(item, 'dismiss')}>Dismiss</Button>
                  {item.source !== 'user' && (
                    <Button variant="secondary" size="sm" disabled={busy === item.key} onClick={() => act(item, 'remove')}>Remove</Button>
                  )}
                  {item.author_id && (
                    <Button variant="danger" size="sm" disabled={busy === item.key} onClick={() => act(item, 'remove_and_ban')}>{item.source === 'user' ? 'Suspend runner' : 'Remove and suspend author'}</Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
