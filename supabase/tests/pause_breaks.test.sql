-- Pause breaks (migration 027): the stretch into a "brk" point is never judged.
\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.check(ok boolean, what text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAILED: %', what; END IF; RAISE NOTICE 'ok  %', what; END $$;
-- 2.2 km in 4 minutes: a ride.
SELECT pg_temp.check(public.run_integrity_reason(
  '[{"lat":12.97,"lng":77.59,"timestamp":0},{"lat":12.97,"lng":77.61,"timestamp":240000}]', 'run') = 'vehicle',
  'a ride inside a run is still flagged');
SELECT pg_temp.check(public.run_integrity_reason(
  '[{"lat":12.97,"lng":77.59,"timestamp":0},{"lat":12.97,"lng":77.61,"timestamp":240000,"brk":true}]', 'run') IS NULL,
  'the same ride across a pause is not');
SELECT pg_temp.check(public.run_integrity_reason(
  '[{"lat":12.97,"lng":77.59,"timestamp":0},{"lat":12.97,"lng":77.61,"timestamp":240000,"brk":true},{"lat":12.97,"lng":77.63,"timestamp":480000}]', 'run') = 'vehicle',
  'riding after the pause is flagged again');
ROLLBACK;
