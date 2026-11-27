-- People (017_admin_people): emails for Studio, and nobody else can read them.
\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.check(ok boolean, what text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAILED: %', what; END IF; RAISE NOTICE 'ok  %', what; END $$;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'asha.runner@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'ravi@test.local');

SELECT pg_temp.check((public.admin_people() ->> 'total')::int >= 2, 'lists accounts');
SELECT pg_temp.check((public.admin_people('asha') -> 'people' -> 0 ->> 'email') = 'asha.runner@test.local', 'finds by email');
SELECT pg_temp.check((public.admin_people('ASHA') ->> 'total')::int = 1, 'search ignores case');
SELECT pg_temp.check(jsonb_array_length(public.admin_people(NULL, 1, 0) -> 'people') = 1, 'pages');
SELECT pg_temp.check((public.admin_people('asha') -> 'people' -> 0 ->> 'runs')::int = 0, 'counts runs');

SELECT pg_temp.check(NOT has_function_privilege('authenticated', 'public.admin_people(text, int, int)', 'EXECUTE'), 'runners cannot list people');
SELECT pg_temp.check(NOT has_function_privilege('anon', 'public.admin_people(text, int, int)', 'EXECUTE'), 'visitors cannot list people');
SELECT pg_temp.check(has_function_privilege('service_role', 'public.admin_people(text, int, int)', 'EXECUTE'), 'the server can');
ROLLBACK;
