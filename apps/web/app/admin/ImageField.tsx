'use client';

import { useRef, useState } from 'react';
import { ImageSquare, X } from '@phosphor-icons/react/ssr';
import { supabase } from '@/lib/supabase';
import { Button, IconButton, labelClass } from './ui';

/**
 * Pick an image, shrink it in the browser (longest side 1200 px, WebP), upload it through
 * /api/admin/upload and hand back its public URL. Shows a preview and a remove button.
 */
export function ImageField({ label, hint, kind, value, onChange, aspect = 'wide' }: {
  label: string; hint?: string; kind: 'partner' | 'reward' | 'challenge' | 'event';
  value: string; onChange: (url: string) => void; aspect?: 'wide' | 'square';
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const blob = await shrink(file, 1200);
      const body = new FormData();
      body.append('kind', kind);
      body.append('file', new File([blob], 'image.webp', { type: blob.type }));
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/upload', { method: 'POST', body, headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } });
      const out = await res.json().catch(() => ({})) as { url?: string; error?: string };
      if (!res.ok || !out.url) throw new Error(out.error ?? `Upload failed (${res.status})`);
      onChange(out.url);
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
    if (input.current) input.current.value = '';
  };

  return (
    <div className="sm:col-span-2">
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-3">
        <div className={`relative flex-shrink-0 rounded-xl border border-gray-100 bg-gray-50 overflow-hidden ${aspect === 'square' ? 'w-16 h-16' : 'w-28 h-16'}`}>
          {value
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={value} alt="" className="w-full h-full object-cover" />
            : <ImageSquare className="w-5 h-5 text-gray-300 absolute inset-0 m-auto" aria-hidden />}
        </div>
        <Button variant="secondary" size="sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Uploading…' : value ? 'Replace' : 'Upload image'}
        </Button>
        {value && !busy && <IconButton label={`Remove ${label.toLowerCase()}`} onClick={() => onChange('')}><X className="w-4 h-4 text-gray-500" aria-hidden /></IconButton>}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => pick(e.target.files?.[0])} />
      </div>
      {hint && !error && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
      {error && <p role="alert" className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}

/** Longest side at most `max` px, re-encoded as WebP (JPEG where WebP isn't supported). */
async function shrink(file: File, max: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/webp', 0.85));
  if (blob && blob.type === 'image/webp') return blob;
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not read the image'))), 'image/jpeg', 0.85));
}
