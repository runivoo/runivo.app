-- Studio overview (runivo.in/admin): the numbers on the admin's first page, in one call.
-- Only the server calls this, after checking the caller is an admin (lib/adminServer.ts);
-- runners can't execute it. Days are counted in India time.
--
-- Also: the scheduled jobs. 002, 005, 009 and 012 schedule them only when pg_cron is
-- installed, and new Supabase projects start without it, so on the new project none
-- were scheduled. With pg_cron enabled (Database → Extensions), this schedules all four;
-- cron.schedule with an existing name just updates that job.

CREATE OR REPLACE FUNCTION public.admin_overview() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH ist AS (SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date AS today),
  days AS (
    SELECT generate_series((SELECT today FROM ist) - 29, (SELECT today FROM ist), interval '1 day')::date AS d
  ),
  runs_ok AS (
    SELECT user_id, distance_m, started_at FROM runs WHERE NOT excluded AND integrity_status = 'ok'
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'waitlist', jsonb_build_object(
      'total',     (SELECT count(*) FROM waitlist),
      'today',     (SELECT count(*) FROM waitlist WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date = (SELECT today FROM ist)),
      'last_7d',   (SELECT count(*) FROM waitlist WHERE created_at > now() - interval '7 days'),
      'daily',     (SELECT jsonb_agg(jsonb_build_object('day', d, 'count',
                      (SELECT count(*) FROM waitlist w WHERE (w.created_at AT TIME ZONE 'Asia/Kolkata')::date = days.d)) ORDER BY d) FROM days),
      'cities',    (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', city, 'count', n) ORDER BY n DESC, city), '[]')
                      FROM (SELECT COALESCE(NULLIF(initcap(trim(city)), ''), 'Not given') AS city, count(*) AS n
                              FROM waitlist GROUP BY 1 ORDER BY n DESC LIMIT 8) c),
      'sources',   (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', source, 'count', n) ORDER BY n DESC), '[]')
                      FROM (SELECT source, count(*) AS n FROM waitlist GROUP BY source ORDER BY n DESC LIMIT 6) s)
    ),
    'runners', jsonb_build_object(
      'total',      (SELECT count(*) FROM profiles),
      'new_7d',     (SELECT count(*) FROM profiles WHERE created_at > now() - interval '7 days'),
      'active_7d',  (SELECT count(DISTINCT user_id) FROM runs_ok WHERE started_at > now() - interval '7 days'),
      'daily_new',  (SELECT jsonb_agg(jsonb_build_object('day', d, 'count',
                      (SELECT count(*) FROM profiles p WHERE (p.created_at AT TIME ZONE 'Asia/Kolkata')::date = days.d)) ORDER BY d) FROM days)
    ),
    'runs', jsonb_build_object(
      'total',      (SELECT count(*) FROM runs_ok),
      'last_7d',    (SELECT count(*) FROM runs_ok WHERE started_at > now() - interval '7 days'),
      'km_7d',      (SELECT round(COALESCE(sum(distance_m), 0) / 1000.0, 1) FROM runs_ok WHERE started_at > now() - interval '7 days'),
      'km_total',   (SELECT round(COALESCE(sum(distance_m), 0) / 1000.0, 1) FROM runs_ok)
    ),
    'territory', jsonb_build_object(
      'zones',      (SELECT count(*) FROM territory_polygons WHERE owner_id IS NOT NULL),
      'claimed_7d', (SELECT count(*) FROM territory_polygons WHERE claimed_at > now() - interval '7 days')
    ),
    'partners', jsonb_build_object(
      'waiting',    (SELECT count(*) FROM partners WHERE status = 'applied'),
      'live',       (SELECT count(*) FROM partners WHERE status = 'active'),
      'redeemed_30d', (SELECT count(*) FROM pace_redemptions WHERE created_at > now() - interval '30 days')
    )
  );
$$;
REVOKE ALL ON FUNCTION public.admin_overview() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO service_role;


-- ── Scheduled jobs ────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('expire-lapsed-subscriptions', '17 3 * * *', $cmd$SELECT public.expire_lapsed_subscriptions()$cmd$);
    PERFORM cron.schedule('refresh-territory-scores',    '5 0 * * *',  $cmd$SELECT public.refresh_all_territory_scores()$cmd$);
    PERFORM cron.schedule('notifications-hourly',        '2 * * * *',  $cmd$SELECT public.run_hourly_notifications()$cmd$);
    PERFORM cron.schedule('advance-training-plan-week',  '0 6 * * 1',  $cmd$SELECT public.advance_training_plan_week()$cmd$);
  ELSE
    RAISE WARNING 'pg_cron is not enabled: scheduled jobs (notifications, campaigns, subscriptions, territory scores, training weeks) will not run. Enable it in Database → Extensions and run supabase db push again.';
  END IF;
END $$;
