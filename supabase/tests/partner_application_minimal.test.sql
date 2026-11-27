-- The short partner form: company, contact name, email and website are enough.
-- No offer, category, stock or cities are required; a bad category or oversize offer is still refused.
\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.check(ok boolean, what text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAILED: %', what; END IF; RAISE NOTICE 'ok  %', what; END $$;

SELECT set_config('test.uid', '', true), set_config('test.role', 'service_role', true);

CREATE TEMP TABLE app AS SELECT public.submit_partner_application(
  'Stridewell', NULL, 'Asha', ' Hello@Stridewell.example ', 'stridewell.example', NULL, NULL, NULL, NULL) AS id;
SELECT pg_temp.check((SELECT status || '|' || category || '|' || contact_email || '|' || COALESCE(offer, 'none')
                        FROM public.partners WHERE id = (SELECT id FROM app))
  = 'applied|other|hello@stridewell.example|none', 'a short application lands as applied, category other, no offer');

SELECT pg_temp.check((SELECT public.submit_partner_application('Second Co', 'shoes', NULL, 'two@example.com', NULL, NULL, NULL, '20% off', 100)) IS NOT NULL,
  'a full application still works');

DO $$ BEGIN
  PERFORM public.submit_partner_application('X Co', 'crypto', NULL, 'x@example.com', NULL, NULL, NULL, NULL, NULL);
  RAISE EXCEPTION 'FAILED: a bad category was accepted';
EXCEPTION WHEN others THEN IF SQLERRM LIKE 'FAILED%' THEN RAISE; END IF; RAISE NOTICE 'ok  a bad category is still refused'; END $$;

DO $$ BEGIN
  PERFORM public.submit_partner_application('X Co', NULL, NULL, 'not-an-email', NULL, NULL, NULL, NULL, NULL);
  RAISE EXCEPTION 'FAILED: a bad email was accepted';
EXCEPTION WHEN others THEN IF SQLERRM LIKE 'FAILED%' THEN RAISE; END IF; RAISE NOTICE 'ok  a bad email is refused'; END $$;

DO $$ BEGIN
  PERFORM public.submit_partner_application('X', NULL, NULL, 'x@example.com', NULL, NULL, NULL, NULL, NULL);
  RAISE EXCEPTION 'FAILED: a one-letter company name was accepted';
EXCEPTION WHEN others THEN IF SQLERRM LIKE 'FAILED%' THEN RAISE; END IF; RAISE NOTICE 'ok  a one-letter name is refused'; END $$;

DO $$ BEGIN
  PERFORM public.submit_partner_application('Long Offer Co', NULL, NULL, 'long@example.com', NULL, NULL, NULL, repeat('x', 1001), NULL);
  RAISE EXCEPTION 'FAILED: an oversize offer was accepted';
EXCEPTION WHEN others THEN IF SQLERRM LIKE 'FAILED%' THEN RAISE; END IF; RAISE NOTICE 'ok  an oversize offer is refused'; END $$;

SELECT set_config('test.role', 'authenticated', true);
DO $$ BEGIN
  PERFORM public.submit_partner_application('Nope Co', NULL, NULL, 'nope@example.com', NULL, NULL, NULL, NULL, NULL);
  RAISE EXCEPTION 'FAILED: a signed-in user could apply directly';
EXCEPTION WHEN others THEN IF SQLERRM LIKE 'FAILED%' THEN RAISE; END IF; RAISE NOTICE 'ok  applications stay server only'; END $$;
ROLLBACK;
