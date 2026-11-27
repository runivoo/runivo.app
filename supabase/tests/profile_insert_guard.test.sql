-- Profile insert guard (migration 029): a runner can't create their own profile as admin.
\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.check(ok boolean, what text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAILED: %', what; END IF; RAISE NOTICE 'ok  %', what; END $$;

-- A user whose profile row is missing (signup trigger failed or was removed).
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000a1', 'guard@test.local');
DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000a1';

SELECT set_config('test.uid', '00000000-0000-0000-0000-0000000000a1', true);
SET LOCAL ROLE authenticated;
INSERT INTO public.profiles (id, username, subscription_tier, coins, xp, level, runner_rank, total_runs)
VALUES ('00000000-0000-0000-0000-0000000000a1', 'guardtest', 'admin', 999999, 50000, 40, 'sovereign', 500);
RESET ROLE;

SELECT pg_temp.check((SELECT subscription_tier FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000a1') = 'free',
  'a runner inserting their own profile as admin gets free');
SELECT pg_temp.check((SELECT coins = 100 AND xp = 0 AND level = 1 AND runner_rank = 'pacer' AND total_runs = 0
                        FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000a1'),
  'and starting stats, not the ones sent');
SELECT pg_temp.check((SELECT username FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000a1') IS NOT NULL,
  'the fields a runner owns are kept');

-- The dashboard (owner) can still make an admin.
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000a2', 'owner@test.local');
DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000a2';
INSERT INTO public.profiles (id, username, subscription_tier) VALUES ('00000000-0000-0000-0000-0000000000a2', 'ownertest', 'admin');
SELECT pg_temp.check((SELECT subscription_tier FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000a2') = 'admin',
  'an insert by the owner keeps what it sets');
ROLLBACK;
