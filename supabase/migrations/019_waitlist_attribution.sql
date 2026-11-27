-- Where waitlist sign-ups come from (Admin PRD, phase 5: social traction).
--
-- The website remembers, for the visit, the tagged link or site that brought someone
-- (utm_source / utm_medium / utm_campaign, or the referring site) and sends it with the
-- sign-up. The server turns it into a platform: instagram, x, linkedin, whatsapp, ...
-- or direct. No cookies: the website keeps it in the tab's session storage only.
-- The Overview groups sign-ups by platform (all time and 7 days) and by campaign.

ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS platform      text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS campaign      text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS medium        text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS referrer_host text;
ALTER TABLE public.waitlist DROP CONSTRAINT IF EXISTS waitlist_attribution_len;
ALTER TABLE public.waitlist ADD CONSTRAINT waitlist_attribution_len CHECK (
  (platform IS NULL OR length(platform) BETWEEN 1 AND 30) AND (campaign IS NULL OR length(campaign) BETWEEN 1 AND 60)
  AND (medium IS NULL OR length(medium) BETWEEN 1 AND 30) AND (referrer_host IS NULL OR length(referrer_host) BETWEEN 1 AND 100));
CREATE INDEX IF NOT EXISTS waitlist_platform_idx ON public.waitlist (platform);

-- A new signature (extra optional arguments) is a new function, so the old one goes first.
DROP FUNCTION IF EXISTS public.join_waitlist(text, text, text);
CREATE FUNCTION public.join_waitlist(p_email text, p_city text DEFAULT NULL, p_source text DEFAULT 'web',
  p_platform text DEFAULT NULL, p_campaign text DEFAULT NULL, p_medium text DEFAULT NULL, p_referrer text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text := lower(btrim(p_email));
  v_city  text := NULLIF(btrim(COALESCE(p_city, '')), '');
  v_src   text := COALESCE(NULLIF(btrim(COALESCE(p_source, '')), ''), 'web');
  v_plat  text := left(NULLIF(lower(btrim(COALESCE(p_platform, ''))), ''), 30);
  v_camp  text := left(NULLIF(lower(btrim(COALESCE(p_campaign, ''))), ''), 60);
  v_med   text := left(NULLIF(lower(btrim(COALESCE(p_medium, ''))), ''), 30);
  v_ref   text := left(NULLIF(lower(btrim(COALESCE(p_referrer, ''))), ''), 100);
  v_rows  integer;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'join_waitlist is service_role only';
  END IF;

  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email) > 200
     OR (v_city IS NOT NULL AND length(v_city) > 80)
     OR length(v_src) > 40 THEN
    RAISE EXCEPTION 'invalid' USING ERRCODE = '22023';
  END IF;

  -- Flood guard behind the per-IP limit in the route: at most 300 new sign-ups an hour.
  IF (SELECT count(*) FROM waitlist WHERE created_at > now() - interval '1 hour') >= 300 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO waitlist (email, city, source, platform, campaign, medium, referrer_host)
  VALUES (v_email, v_city, v_src, v_plat, v_camp, v_med, v_ref)
  ON CONFLICT (email) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.join_waitlist(text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_waitlist(text, text, text, text, text, text, text) TO service_role;

-- Overview: sign-ups by platform and campaign.
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
                      FROM (SELECT source, count(*) AS n FROM waitlist GROUP BY source ORDER BY n DESC LIMIT 6) s),
      'platforms', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', platform, 'count', n) ORDER BY n DESC), '[]')
                      FROM (SELECT COALESCE(platform, 'unknown') AS platform, count(*) AS n FROM waitlist GROUP BY 1 ORDER BY n DESC LIMIT 8) pl),
      'platforms_7d', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', platform, 'count', n) ORDER BY n DESC), '[]')
                      FROM (SELECT COALESCE(platform, 'unknown') AS platform, count(*) AS n FROM waitlist
                             WHERE created_at > now() - interval '7 days' GROUP BY 1 ORDER BY n DESC LIMIT 8) pl7),
      'campaigns', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', campaign, 'platform', platform, 'count', n) ORDER BY n DESC), '[]')
                      FROM (SELECT campaign, max(platform) AS platform, count(*) AS n FROM waitlist
                             WHERE campaign IS NOT NULL GROUP BY campaign ORDER BY n DESC LIMIT 8) ca)
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
