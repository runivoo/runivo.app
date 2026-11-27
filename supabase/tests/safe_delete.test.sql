-- Safe delete (016_safe_delete): impact counts, events keep their races, the log is server-only.
\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.check(ok boolean, what text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAILED: %', what; END IF; RAISE NOTICE 'ok  %', what; END $$;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'r1@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'r2@test.local');

-- A reward with codes and one redemption.
INSERT INTO public.pace_store_rewards (id, brand, title, description, pace_cost, value_label, code_mode)
VALUES ('00000000-0000-0000-0000-00000000aa01', 'Brand', 'Socks', 'Run socks', 100, '1 pair', 'pool');
INSERT INTO public.reward_codes (reward_id, code, assigned_to) VALUES
  ('00000000-0000-0000-0000-00000000aa01', 'A1', '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-00000000aa01', 'A2', NULL),
  ('00000000-0000-0000-0000-00000000aa01', 'A3', NULL);
INSERT INTO public.pace_redemptions (user_id, reward_id, pace_spent)
VALUES ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000aa01', 100);

SELECT pg_temp.check((public.admin_impact('reward', '00000000-0000-0000-0000-00000000aa01') ->> 'redeemed_by')::int = 1, 'reward: runners who claimed it');
SELECT pg_temp.check((public.admin_impact('reward', '00000000-0000-0000-0000-00000000aa01') ->> 'codes_unused')::int = 2, 'reward: unused codes');
SELECT pg_temp.check((public.admin_impact('reward', '00000000-0000-0000-0000-00000000aa01') ->> 'label') = 'Socks', 'reward: its name');
SELECT pg_temp.check((public.admin_impact('reward', '00000000-0000-0000-0000-00000000dead') ->> 'exists')::boolean = false, 'a missing item says so');

-- An event with a runner going and a race attached.
INSERT INTO public.events (id, title, event_type, starts_at, ends_at)
VALUES ('00000000-0000-0000-0000-00000000ee01', 'Sunday 10K', 'race', now() + interval '3 days', now() + interval '3 days 2 hours');
INSERT INTO public.event_participants (event_id, user_id) VALUES ('00000000-0000-0000-0000-00000000ee01', '00000000-0000-0000-0000-0000000000b2');
SELECT pg_temp.check((public.admin_impact('event', '00000000-0000-0000-0000-00000000ee01') ->> 'going')::int = 1, 'event: runners going');

-- Deleting an event keeps its races (the link is cleared).
SELECT pg_temp.check((SELECT confdeltype FROM pg_constraint WHERE conname = 'races_event_id_fkey') = 'n', 'event delete keeps races (SET NULL)');

SELECT pg_temp.check(NOT has_function_privilege('authenticated', 'public.admin_impact(text, uuid)', 'EXECUTE'), 'runners cannot read impact');
SELECT pg_temp.check(has_function_privilege('service_role', 'public.admin_impact(text, uuid)', 'EXECUTE'), 'the server can');
SELECT pg_temp.check(NOT has_table_privilege('authenticated', 'public.admin_actions', 'SELECT'), 'runners cannot read the activity log');
SELECT pg_temp.check(NOT has_table_privilege('anon', 'public.admin_actions', 'INSERT'), 'visitors cannot write the activity log');
ROLLBACK;
