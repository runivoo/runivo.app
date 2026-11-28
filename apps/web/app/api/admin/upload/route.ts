import { randomUUID } from 'node:crypto';
import { adminRoute, serviceClient, json, logAction } from '@/lib/server/adminServer';

export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const KINDS = ['partner', 'reward', 'challenge', 'event'] as const;
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * POST /api/admin/upload (multipart: file, kind) → { url }
 * Stores an image in the public studio-media bucket (migration 018). Only this route can
 * write there: it runs as the service role after the admin check. The file gets a random
 * name, so nothing a person typed ends up in the path.
 */
export const POST = adminRoute(async (req: Request) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const kind = KINDS.find(k => k === form?.get('kind'));
  if (!(file instanceof File) || !kind) return json({ error: 'Send an image and what it is for' }, 400);
  const ext = TYPES[file.type];
  if (!ext) return json({ error: 'Use a JPG, PNG or WebP image' }, 400);
  if (file.size > MAX_BYTES) return json({ error: 'Image is over 2 MB' }, 400);

  const path = `${kind}/${randomUUID()}.${ext}`;
  const storage = serviceClient().storage.from('studio-media');
  const { error } = await storage.upload(path, await file.arrayBuffer(), { contentType: file.type, cacheControl: '31536000', upsert: false });
  if (error) return json({ error: error.message }, 400);
  const url = storage.getPublicUrl(path).data.publicUrl;
  await logAction(req, { action: 'upload', kind: `${kind}_image`, label: path, details: { bytes: file.size } });
  return json({ url }, 201);
});
