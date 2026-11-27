-- Broadcasts (016_broadcasts): Studio's record of email broadcasts, server only.
\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.check(ok boolean, what text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAILED: %', what; END IF; RAISE NOTICE 'ok  %', what; END $$;

INSERT INTO public.broadcasts (name, subject, heading, body) VALUES ('Launch', 'Runivo is live', 'We’re live.', 'Hello');
SELECT pg_temp.check((SELECT status = 'draft' AND audience ->> 'kind' = 'waitlist' FROM public.broadcasts WHERE name = 'Launch'), 'a new broadcast is a draft to the waitlist');
DO $$ BEGIN
  INSERT INTO public.broadcasts (name, subject, heading, body, button_url) VALUES ('x', 'x', 'x', 'x', 'javascript:alert(1)');
  RAISE EXCEPTION 'FAILED: a non-https button was accepted';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok  buttons link to https only'; END $$;
SELECT pg_temp.check(NOT has_table_privilege('authenticated', 'public.broadcasts', 'SELECT'), 'runners cannot read broadcasts');
SELECT pg_temp.check(NOT has_table_privilege('anon', 'public.broadcasts', 'INSERT'), 'visitors cannot write them');
ROLLBACK;
