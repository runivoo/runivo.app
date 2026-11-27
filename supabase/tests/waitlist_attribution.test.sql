-- Waitlist attribution (019_waitlist_attribution): platform and campaign are saved and counted.
\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.check(ok boolean, what text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAILED: %', what; END IF; RAISE NOTICE 'ok  %', what; END $$;
SELECT set_config('test.role', 'service_role', true);

SELECT pg_temp.check(public.join_waitlist('ig1@test.local', 'Pune', 'web', 'Instagram', 'Launch', 'social', 'l.instagram.com') IS TRUE, 'a sign-up with a platform is added');
SELECT public.join_waitlist('ig2@test.local', NULL, 'web', 'instagram', 'launch');
SELECT public.join_waitlist('x1@test.local', NULL, 'web', 'x');
SELECT public.join_waitlist('plain@test.local');

SELECT pg_temp.check((SELECT platform = 'instagram' AND campaign = 'launch' AND referrer_host = 'l.instagram.com' FROM public.waitlist WHERE email = 'ig1@test.local'), 'platform and campaign saved, lower-cased');
SELECT pg_temp.check((SELECT platform IS NULL FROM public.waitlist WHERE email = 'plain@test.local'), 'no platform when none was sent');
SELECT pg_temp.check(EXISTS (SELECT 1 FROM jsonb_array_elements(public.admin_overview() -> 'waitlist' -> 'platforms') p
                              WHERE p ->> 'name' = 'instagram' AND (p ->> 'count')::int >= 2), 'overview counts sign-ups by platform');
SELECT pg_temp.check(EXISTS (SELECT 1 FROM jsonb_array_elements(public.admin_overview() -> 'waitlist' -> 'campaigns') c
                              WHERE c ->> 'name' = 'launch' AND (c ->> 'count')::int >= 2), 'and by campaign');
SELECT pg_temp.check(NOT has_function_privilege('anon', 'public.join_waitlist(text, text, text, text, text, text, text)', 'EXECUTE'), 'visitors cannot call it directly');
ROLLBACK;
