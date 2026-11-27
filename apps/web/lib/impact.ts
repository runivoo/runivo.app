import { serviceClient } from './adminServer';

/**
 * What removing an item would touch, in plain words, and what Studio allows.
 * Counts come from public.admin_impact (migration 016); the rules are the Admin PRD's
 * "Safe delete" table. Server only: the delete routes enforce the same verdict, so the
 * dialog can't be bypassed by calling the API directly.
 */

export type ImpactKind = 'reward' | 'event' | 'partner' | 'challenge';
export const IMPACT_KINDS: readonly ImpactKind[] = ['reward', 'event', 'partner', 'challenge'];

export interface Impact {
  kind: ImpactKind;
  exists: boolean;
  label: string;
  /** What a delete would cause, one line each. `loss` lines are data that would be gone for good. */
  effects: { text: string; loss: boolean }[];
  /** Why a delete isn't allowed. Empty = allowed. */
  blockers: string[];
  canDelete: boolean;
  /** Anything is lost → the admin types the item's name to confirm. */
  confirmByName: boolean;
  /** The safer choice offered first, if the item isn't already in that state. */
  safer: { action: 'hide' | 'end'; label: string; description: string } | null;
  counts: Record<string, unknown>;
}

const n = (v: unknown) => Number(v ?? 0);
const plural = (k: number, one: string, many: string) => `${k.toLocaleString('en-IN')} ${k === 1 ? one : many}`;

export async function getImpact(kind: ImpactKind, id: string): Promise<Impact> {
  const { data, error } = await serviceClient().rpc('admin_impact', { p_kind: kind, p_id: id });
  if (error) throw new Error(error.message);
  const c = (data ?? {}) as Record<string, unknown>;
  const base = { kind, exists: Boolean(c.exists), label: String(c.label ?? ''), counts: c };
  const effects: Impact['effects'] = [];
  const blockers: string[] = [];
  let safer: Impact['safer'] = null;

  if (kind === 'reward') {
    const claimed = n(c.redeemed_by), unused = n(c.codes_unused), views = n(c.views), challenges = n(c.challenges);
    if (claimed) blockers.push(`${plural(claimed, 'runner has', 'runners have')} claimed this. Their codes and history have to stay.`);
    if (challenges) blockers.push(`${plural(challenges, 'sponsored challenge uses', 'sponsored challenges use')} this as its prize.`);
    if (unused) effects.push({ text: `${plural(unused, 'unused code', 'unused codes')} will be deleted.`, loss: true });
    if (views) effects.push({ text: `${plural(views, 'view', 'views')} of reward history will be deleted (brand reports lose them).`, loss: true });
    if (c.status !== 'hidden') {
      safer = { action: 'hide', label: 'Hide from the store', description: 'Runners stop seeing it and can’t claim it. Codes, claims and history stay.' };
    }
  }

  if (kind === 'event') {
    const going = n(c.going), saved = n(c.bookmarked), finished = n(c.finished), races = n(c.races);
    if (going) effects.push({ text: `${plural(going, 'runner is', 'runners are')} going. They lose it from their plans.`, loss: true });
    if (saved) effects.push({ text: `${plural(saved, 'runner saved', 'runners saved')} it.`, loss: true });
    if (finished) effects.push({ text: `${plural(finished, 'finish', 'finishes')} recorded for it will be deleted.`, loss: true });
    if (races) effects.push({ text: `${plural(races, 'race is', 'races are')} linked. ${races === 1 ? 'It stays' : 'They stay'}, without the event.`, loss: false });
    if (c.active !== false) {
      safer = { action: 'hide', label: 'Hide the event', description: 'It leaves the app. Who’s going, saves and finishes stay, and you can show it again.' };
    }
  }

  if (kind === 'partner') {
    const rewards = n(c.rewards), live = n(c.rewards_live), challenges = n(c.challenges), claimed = n(c.redeemed_by);
    blockers.push('Brands are never deleted, so their reports and runners’ claimed codes stay intact.');
    if (live) effects.push({ text: `${plural(live, 'live reward leaves', 'live rewards leave')} the store (${plural(rewards, 'reward', 'rewards')} in all).`, loss: false });
    if (challenges) effects.push({ text: `${plural(challenges, 'sponsored challenge stops', 'sponsored challenges stop')} showing.`, loss: false });
    if (claimed) effects.push({ text: `${plural(claimed, 'runner keeps', 'runners keep')} the codes they already claimed.`, loss: false });
    if (c.status !== 'ended') {
      safer = { action: 'end', label: 'End the partnership', description: 'Every offer from this brand leaves the app at once. Their history stays; you can reactivate them.' };
    }
  }

  if (kind === 'challenge') {
    const joined = n(c.joined), completed = n(c.completed), won = n(c.codes_won);
    if (joined) blockers.push(`${plural(joined, 'runner has', 'runners have')} joined, ${completed.toLocaleString('en-IN')} finished.`);
    if (won) effects.push({ text: `${plural(won, 'runner keeps', 'runners keep')} the code they already won.`, loss: false });
    if (joined) effects.push({ text: 'It leaves the app; progress so far is kept.', loss: false });
    if (c.status !== 'ended') {
      safer = { action: 'end', label: 'End it early', description: 'It stops showing and nobody new can join or finish. Codes already won stay valid.' };
    }
  }

  const canDelete = base.exists && blockers.length === 0;
  // A delete that can't happen loses nothing: only say what stays or changes.
  const shown = canDelete ? effects : effects.filter(e => !e.loss);
  return { ...base, effects: shown, blockers, canDelete, confirmByName: canDelete && shown.some(e => e.loss), safer };
}
