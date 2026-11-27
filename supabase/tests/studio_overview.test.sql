-- Studio overview (015_studio_overview): the admin's numbers, and only the server can read them.
\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.check(ok boolean, what text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAILED: %', what; END IF; RAISE NOTICE 'ok  %', what; END $$;

INSERT INTO public.waitlist (email, city, source) VALUES
  ('a@test.local', 'bangalore', 'web'), ('b@test.local', 'Bangalore ', 'web'), ('c@test.local', NULL, 'instagram');

SELECT pg_temp.check((public.admin_overview() -> 'waitlist' ->> 'total')::int >= 3, 'waitlist total counts sign-ups');
SELECT pg_temp.check((public.admin_overview() -> 'waitlist' ->> 'today')::int >= 3, 'today counts them in India time');
SELECT pg_temp.check(jsonb_array_length(public.admin_overview() -> 'waitlist' -> 'daily') = 30, 'thirty days of history');
SELECT pg_temp.check(EXISTS (SELECT 1 FROM jsonb_array_elements(public.admin_overview() -> 'waitlist' -> 'cities') c
                              WHERE c ->> 'name' = 'Bangalore' AND (c ->> 'count')::int >= 2), 'city spellings are merged');
SELECT pg_temp.check(public.admin_overview() ? 'runners' AND public.admin_overview() ? 'runs'
                     AND public.admin_overview() ? 'territory' AND public.admin_overview() ? 'partners', 'every block is there');

SELECT pg_temp.check(NOT has_function_privilege('authenticated', 'public.admin_overview()', 'EXECUTE'), 'runners cannot read it');
SELECT pg_temp.check(NOT has_function_privilege('anon', 'public.admin_overview()', 'EXECUTE'), 'visitors cannot read it');
SELECT pg_temp.check(has_function_privilege('service_role', 'public.admin_overview()', 'EXECUTE'), 'the server can');
ROLLBACK;
