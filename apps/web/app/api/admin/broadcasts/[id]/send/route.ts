import { adminRoute, serviceClient, json, logAction } from '@/lib/adminServer';
import { addToSegment, audienceCount, audiencePage, createAndSendBroadcast, createSegment, ResendError, type Broadcast } from '@/lib/broadcast';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };
const BATCH = 40;          // recipients copied to Resend per call (~10 s at Resend's rate limit)
const PAUSE_MS = 130;      // keeps under 10 requests a second

/**
 * POST, called repeatedly by Studio until it answers { phase: 'sent' }:
 *   1. draft    → counts the audience, creates a Resend segment
 *   2. syncing  → copies the next BATCH recipients into it
 *   3. all in   → asks Resend to send the broadcast to the segment
 * Each step is saved, so a dropped connection just resumes where it stopped.
 */
export const POST = adminRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const db = serviceClient();
  const { data: row } = await db.from('broadcasts').select('*').eq('id', id).maybeSingle();
  const b = row as Broadcast | null;
  if (!b) return json({ error: 'Broadcast not found' }, 404);
  if (b.status === 'sent') return json({ phase: 'sent', synced: b.synced, total: b.recipients });

  try {
    if (b.status === 'draft' || (b.status === 'failed' && !b.resend_segment_id)) {
      const total = await audienceCount(b.audience);
      if (total === 0) return json({ error: 'Nobody matches this audience' }, 400);
      const seg = await createSegment(`Studio: ${b.name} (${new Date().toISOString().slice(0, 10)})`);
      await db.from('broadcasts').update({ status: 'syncing', recipients: total, synced: 0, resend_segment_id: seg.id, updated_at: new Date().toISOString() }).eq('id', id);
      await logAction(req, { action: 'send', kind: 'broadcast', id, label: b.name, details: { recipients: total, audience: b.audience } });
      return json({ phase: 'syncing', synced: 0, total });
    }

    const total = b.recipients ?? 0;
    if (b.synced < total) {
      const emails = await audiencePage(b.audience, b.synced, BATCH);
      for (const email of emails) {
        await addToSegment(email, b.resend_segment_id!);
        await new Promise(r => setTimeout(r, PAUSE_MS));
      }
      const synced = emails.length === 0 ? total : b.synced + emails.length;
      await db.from('broadcasts').update({ synced, status: 'syncing', updated_at: new Date().toISOString() }).eq('id', id);
      return json({ phase: 'syncing', synced, total });
    }

    const sent = await createAndSendBroadcast(b, b.resend_segment_id!);
    await db.from('broadcasts').update({ status: 'sent', resend_broadcast_id: sent.id, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id);
    return json({ phase: 'sent', synced: total, total });
  } catch (e) {
    const message = e instanceof ResendError ? e.message : 'Sending stopped. Press Resume to carry on.';
    if (b.status === 'draft') await db.from('broadcasts').update({ status: 'failed' }).eq('id', id);
    return json({ error: message }, 502);
  }
});
