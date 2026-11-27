-- Pre-launch waitlist: only the server can add to it, emails are normalised and
-- de-duplicated, bad input is refused, and nobody else can read it.
\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.check(ok boolean, what text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAILED: %', what; END IF; RAISE NOTICE 'ok  %', what; END $$;

-- 1. A signed-in runner cannot call it.
SELECT set_config('test.uid', 'b2200000-0000-4000-8000-000000000001', true), set_config('test.role', 'authenticated', true);
DO $$ BEGIN
  PERFORM public.join_waitlist('a@b.co');
  RAISE EXCEPTION 'FAILED: a runner could join the waitlist directly';
EXCEPTION WHEN others THEN IF SQLERRM LIKE 'FAILED%' THEN RAISE; END IF; RAISE NOTICE 'ok  joining is server only'; END $$;

-- 2. The server adds an email; it is lower-cased and trimmed.
SET LOCAL test.role = 'service_role';
SELECT pg_temp.check(public.join_waitlist('  Runner@Example.COM ', ' Pune ', 'web') IS TRUE, 'a new email is added');
SELECT pg_temp.check((SELECT email || '|' || city FROM public.waitlist) = 'runner@example.com|Pune', 'email lower-cased, city trimmed');

-- 3. The same email again does nothing and says so.
SELECT pg_temp.check(public.join_waitlist('runner@example.com', 'Delhi') IS FALSE, 'a repeat email returns false');
SELECT pg_temp.check((SELECT count(*) FROM public.waitlist) = 1 AND (SELECT city FROM public.waitlist) = 'Pune', 'a repeat adds no row and keeps the first city');

-- 4. Bad input is refused.
DO $$ BEGIN
  PERFORM public.join_waitlist('not-an-email');
  RAISE EXCEPTION 'FAILED: a bad email was accepted';
EXCEPTION WHEN others THEN IF SQLERRM LIKE 'FAILED%' THEN RAISE; END IF; RAISE NOTICE 'ok  a bad email is refused'; END $$;
DO $$ BEGIN
  PERFORM public.join_waitlist('ok@example.com', repeat('x', 81));
  RAISE EXCEPTION 'FAILED: a 81-character city was accepted';
EXCEPTION WHEN others THEN IF SQLERRM LIKE 'FAILED%' THEN RAISE; END IF; RAISE NOTICE 'ok  an over-long city is refused'; END $$;

-- 5. The flood guard stops a burst.
INSERT INTO public.waitlist (email) SELECT 'bot' || g || '@example.com' FROM generate_series(1, 300) g;
DO $$ BEGIN
  PERFORM public.join_waitlist('late@example.com');
  RAISE EXCEPTION 'FAILED: sign-ups kept going past the hourly cap';
EXCEPTION WHEN others THEN IF SQLERRM LIKE 'FAILED%' THEN RAISE; END IF; RAISE NOTICE 'ok  the hourly cap holds'; END $$;

-- 6. Clients cannot read the table.
SELECT pg_temp.check(NOT has_table_privilege('anon', 'public.waitlist', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.waitlist', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.waitlist', 'INSERT'), 'anon and signed-in users have no table access');
SELECT pg_temp.check(NOT has_function_privilege('anon', 'public.join_waitlist(text,text,text)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.join_waitlist(text,text,text)', 'EXECUTE'), 'clients cannot execute join_waitlist');
ROLLBACK;
