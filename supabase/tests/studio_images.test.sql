-- Studio images (018_studio_images): the bucket, the columns, and the app's lists carrying them.
\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.check(ok boolean, what text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAILED: %', what; END IF; RAISE NOTICE 'ok  %', what; END $$;

SELECT pg_temp.check(EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'studio-media' AND public), 'studio-media bucket is public to read');
SELECT pg_temp.check(EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'logo_url'), 'brands have a logo');
SELECT pg_temp.check(EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pace_store_rewards' AND column_name = 'image_url'), 'rewards have an image');
SELECT pg_temp.check(EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sponsored_challenges' AND column_name = 'image_url'), 'challenges have a banner');

-- Only https images (no javascript: or data: links in the app).
DO $$ BEGIN
  INSERT INTO public.partners (name, logo_url) VALUES ('Bad', 'javascript:alert(1)');
  RAISE EXCEPTION 'FAILED: a non-https logo was accepted';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok  only https logos'; END $$;

-- The catalog returns the image, falling back to the brand's logo.
INSERT INTO public.partners (id, name, status, logo_url) VALUES ('00000000-0000-0000-0000-00000000f001', 'Brand', 'active', 'https://x.test/logo.png');
INSERT INTO public.pace_store_rewards (id, brand, title, description, pace_cost, value_label, partner_id, status)
VALUES ('00000000-0000-0000-0000-00000000f002', 'Brand', 'Socks', 'Run socks', 100, '1 pair', '00000000-0000-0000-0000-00000000f001', 'available');
SELECT pg_temp.check((SELECT image_url FROM public.store_catalog() WHERE id = '00000000-0000-0000-0000-00000000f002') = 'https://x.test/logo.png', 'catalog falls back to the brand logo');
UPDATE public.pace_store_rewards SET image_url = 'https://x.test/socks.png' WHERE id = '00000000-0000-0000-0000-00000000f002';
SELECT pg_temp.check((SELECT image_url FROM public.store_catalog() WHERE id = '00000000-0000-0000-0000-00000000f002') = 'https://x.test/socks.png', 'catalog prefers the reward image');

SELECT pg_temp.check(has_function_privilege('authenticated', 'public.store_catalog(double precision, double precision)', 'EXECUTE'), 'runners can still read the store');
SELECT pg_temp.check(NOT has_function_privilege('anon', 'public.store_catalog(double precision, double precision)', 'EXECUTE'), 'visitors cannot');
SELECT pg_temp.check(has_function_privilege('authenticated', 'public.list_sponsored_challenges()', 'EXECUTE'), 'runners can still list challenges');
ROLLBACK;
