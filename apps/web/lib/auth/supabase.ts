import { createClient } from '@supabase/supabase-js';

/**
 * The browser's Supabase client (the public URL and anon key only; the service-role key never leaves the
 * server). Used for sign-in on the admin and password-reset pages. The fallbacks below exist only so the
 * site can be built without env vars; a real deploy sets both, and sign-in cannot work without them.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
);
