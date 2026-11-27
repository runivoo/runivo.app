-- ========================================================================
-- Runivo Studio
-- ========================================================================
-- The admin (runivo.in/admin): Overview numbers, safe delete and the activity log,
-- People, images for brands, rewards, challenges and events, and where waitlist
-- sign-ups come from. These were files 015-019; merged here unchanged and in order.


-- ════════════════════════════════════════════════════════════════════════
-- 015_studio_overview
-- ════════════════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════════════════
-- 016_safe_delete
-- ════════════════════════════════════════════════════════════════════════

-- Safe delete in Runivo Studio (docs: Admin PRD, "Safe delete").
--
-- 1. admin_impact(kind, id): what removing an item would touch, as counts, so Studio
--    can show "15 runners claimed this" before anything is deleted. Server only.
-- 2. Deleting an event no longer deletes the races attached to it: the race stays and
--    simply loses its event link (it was ON DELETE CASCADE).
-- 3. admin_actions: a record of every admin change (who, what, which item, the counts
--    shown when it was confirmed). Written and read by the server only.

-- ── 1. Impact ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_impact(p_kind text, p_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v jsonb;
BEGIN
  IF p_kind = 'reward' THEN
    SELECT jsonb_build_object(
      'exists',          EXISTS (SELECT 1 FROM pace_store_rewards WHERE id = p_id),
      'label',           (SELECT title FROM pace_store_rewards WHERE id = p_id),
      'status',          (SELECT status FROM pace_store_rewards WHERE id = p_id),
      'redeemed_by',     (SELECT count(DISTINCT user_id) FROM pace_redemptions WHERE reward_id = p_id),
      'redemptions',     (SELECT count(*) FROM pace_redemptions WHERE reward_id = p_id),
      'codes_unused',    (SELECT count(*) FROM reward_codes WHERE reward_id = p_id AND assigned_to IS NULL),
      'codes_assigned',  (SELECT count(*) FROM reward_codes WHERE reward_id = p_id AND assigned_to IS NOT NULL),
      'views',           (SELECT count(*) FROM reward_events WHERE reward_id = p_id AND event = 'view'),
      'challenges',      (SELECT count(*) FROM sponsored_challenges WHERE reward_id = p_id)
    ) INTO v;
  ELSIF p_kind = 'event' THEN
    SELECT jsonb_build_object(
      'exists',          EXISTS (SELECT 1 FROM events WHERE id = p_id),
      'label',           (SELECT title FROM events WHERE id = p_id),
      'active',          (SELECT is_active FROM events WHERE id = p_id),
      'starts_at',       (SELECT starts_at FROM events WHERE id = p_id),
      'going',           (SELECT count(*) FROM event_participants WHERE event_id = p_id),
      'bookmarked',      (SELECT count(*) FROM event_bookmarks WHERE event_id = p_id),
      'finished',        (SELECT count(*) FROM event_finishers WHERE event_id = p_id),
      'races',           (SELECT count(*) FROM races WHERE event_id = p_id)
    ) INTO v;
  ELSIF p_kind = 'partner' THEN
    SELECT jsonb_build_object(
      'exists',          EXISTS (SELECT 1 FROM partners WHERE id = p_id),
      'label',           (SELECT name FROM partners WHERE id = p_id),
      'status',          (SELECT status FROM partners WHERE id = p_id),
      'rewards',         (SELECT count(*) FROM pace_store_rewards WHERE partner_id = p_id),
      'rewards_live',    (SELECT count(*) FROM pace_store_rewards WHERE partner_id = p_id AND status = 'available'),
      'challenges',      (SELECT count(*) FROM sponsored_challenges WHERE partner_id = p_id),
      'redeemed_by',     (SELECT count(DISTINCT r.user_id) FROM pace_redemptions r
                            JOIN pace_store_rewards w ON w.id = r.reward_id WHERE w.partner_id = p_id)
    ) INTO v;
  ELSIF p_kind = 'challenge' THEN
    SELECT jsonb_build_object(
      'exists',          EXISTS (SELECT 1 FROM sponsored_challenges WHERE id = p_id),
      'label',           (SELECT title FROM sponsored_challenges WHERE id = p_id),
      'joined',          (SELECT count(*) FROM sponsored_challenge_entries WHERE challenge_id = p_id),
      'completed',       (SELECT count(*) FROM sponsored_challenge_entries WHERE challenge_id = p_id AND completed_at IS NOT NULL),
      'codes_won',       (SELECT count(*) FROM sponsored_challenge_entries WHERE challenge_id = p_id AND code IS NOT NULL)
    ) INTO v;
  ELSE
    RAISE EXCEPTION 'unknown kind %', p_kind USING ERRCODE = '22023';
  END IF;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_impact(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_impact(text, uuid) TO service_role;


-- ── 2. Deleting an event keeps its races ──────────────────────────────

ALTER TABLE public.races DROP CONSTRAINT IF EXISTS races_event_id_fkey;
ALTER TABLE public.races ADD CONSTRAINT races_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


-- ── 3. Activity log ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id    uuid NOT NULL,
  action      text NOT NULL,                -- 'delete', 'archive', 'status', 'create', 'update', ...
  item_kind   text NOT NULL,                -- 'reward', 'event', 'partner', 'campaign', 'report', ...
  item_id     text,
  item_label  text,
  details     jsonb NOT NULL DEFAULT '{}',  -- e.g. the impact counts shown when it was confirmed
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_actions_action_len CHECK (length(action) BETWEEN 1 AND 40),
  CONSTRAINT admin_actions_kind_len   CHECK (length(item_kind) BETWEEN 1 AND 40),
  CONSTRAINT admin_actions_label_len  CHECK (item_label IS NULL OR length(item_label) <= 200)
);
CREATE INDEX IF NOT EXISTS admin_actions_created_idx ON public.admin_actions (created_at DESC);
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;   -- no policies: the server (service role) only
REVOKE ALL ON TABLE public.admin_actions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.admin_actions TO service_role;


-- ════════════════════════════════════════════════════════════════════════
-- 017_admin_people
-- ════════════════════════════════════════════════════════════════════════

-- People in Runivo Studio: every account with its email, for support and launch outreach.
-- Emails live in auth.users, which the app's roles can't read. This function is the only
-- way Studio reaches them, and only the server (service role) can run it, after the API
-- route has checked the caller is an admin (lib/adminServer.ts).

CREATE OR REPLACE FUNCTION public.admin_people(p_query text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH q AS (SELECT NULLIF(lower(trim(p_query)), '') AS s),
  people AS (
    SELECT u.id, u.email::text AS email, u.phone::text AS phone, u.created_at, u.last_sign_in_at,
           u.email_confirmed_at IS NOT NULL AS email_confirmed,
           p.username, p.display_name, p.subscription_tier AS tier, p.location AS city,
           EXISTS (SELECT 1 FROM user_bans b WHERE b.user_id = u.id) AS banned
      FROM auth.users u
      LEFT JOIN profiles p ON p.id = u.id
     WHERE (SELECT s FROM q) IS NULL
        OR lower(coalesce(u.email, '')) LIKE '%' || (SELECT s FROM q) || '%'
        OR lower(coalesce(p.username, '')) LIKE '%' || (SELECT s FROM q) || '%'
        OR lower(coalesce(p.display_name, '')) LIKE '%' || (SELECT s FROM q) || '%'
        OR coalesce(u.phone, '') LIKE '%' || (SELECT s FROM q) || '%'
  ),
  page AS (
    SELECT * FROM people ORDER BY created_at DESC
     LIMIT least(greatest(p_limit, 1), 500) OFFSET greatest(p_offset, 0)
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM people),
    'people', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', pg.id, 'email', pg.email, 'phone', pg.phone, 'username', pg.username,
        'display_name', pg.display_name, 'tier', COALESCE(pg.tier, 'free'), 'city', pg.city,
        'banned', pg.banned, 'email_confirmed', pg.email_confirmed,
        'joined_at', pg.created_at, 'last_sign_in_at', pg.last_sign_in_at,
        'runs', (SELECT count(*) FROM runs r WHERE r.user_id = pg.id AND NOT r.excluded),
        'last_run_at', (SELECT max(r.started_at) FROM runs r WHERE r.user_id = pg.id AND NOT r.excluded)
      ) ORDER BY pg.created_at DESC) FROM page pg), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.admin_people(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_people(text, int, int) TO service_role;


-- ════════════════════════════════════════════════════════════════════════
-- 018_studio_images
-- ════════════════════════════════════════════════════════════════════════

-- Images from Runivo Studio, and the app getting them (Admin PRD, phase 2).
--
-- 1. studio-media: a public bucket for brand logos, reward images, challenge banners and
--    event covers. Anyone can view; nobody can write from the app or the browser: Studio
--    uploads through its server route (service role) after checking the admin.
-- 2. Image columns: partners.logo_url, pace_store_rewards.image_url,
--    sponsored_challenges.image_url (events.image_url already exists).
-- 3. store_catalog and list_sponsored_challenges also return image_url: the item's own image,
--    else its brand's logo. A new column changes their return type, so they're recreated.
-- 4. admin_impact also reports a challenge's status (so "End it early" isn't offered twice).

-- ── 1. Bucket ─────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('studio-media', 'studio-media', true, 2097152, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── 2. Columns ────────────────────────────────────────────────────────

ALTER TABLE public.partners             ADD COLUMN IF NOT EXISTS logo_url  text;
ALTER TABLE public.pace_store_rewards   ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.sponsored_challenges ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.partners             DROP CONSTRAINT IF EXISTS partners_logo_url_https;
ALTER TABLE public.partners             ADD CONSTRAINT partners_logo_url_https CHECK (logo_url IS NULL OR logo_url ~ '^https://');
ALTER TABLE public.pace_store_rewards   DROP CONSTRAINT IF EXISTS rewards_image_url_https;
ALTER TABLE public.pace_store_rewards   ADD CONSTRAINT rewards_image_url_https CHECK (image_url IS NULL OR image_url ~ '^https://');
ALTER TABLE public.sponsored_challenges DROP CONSTRAINT IF EXISTS challenges_image_url_https;
ALTER TABLE public.sponsored_challenges ADD CONSTRAINT challenges_image_url_https CHECK (image_url IS NULL OR image_url ~ '^https://');

-- ── 3. The app's lists carry the image ────────────────────────────────

DROP FUNCTION IF EXISTS public.store_catalog(double precision, double precision);
CREATE OR REPLACE FUNCTION public.store_catalog(p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision)
 RETURNS TABLE(id uuid, brand text, title text, description text, pace_cost integer, tier text, brand_color text, brand_initial text, value_label text, category text, status text, sort_order integer, starts_at timestamp with time zone, expires_at timestamp with time zone, plus_only boolean, min_rank text, stock_left integer, lock_reason text, redeemed boolean, my_code text, how_to_use text, image_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid     uuid := auth.uid();
  v_point   geometry := point_from_latlng(p_lat, p_lng);
  v_country text;
  v_city    text;
BEGIN
  SELECT pr.country, city_for_point(COALESCE(v_point, pr.last_known_location)) INTO v_country, v_city
    FROM profiles pr WHERE pr.id = v_uid;

  RETURN QUERY
  SELECT r.id, r.brand, r.title, r.description, r.pace_cost, r.tier,
         r.brand_color, r.brand_initial, r.value_label, r.category, r.status,
         r.sort_order, r.starts_at, r.expires_at, r.plus_only, r.min_rank,
         CASE WHEN r.code_mode = 'pool'
              THEN (SELECT count(*)::int FROM reward_codes c WHERE c.reward_id = r.id AND c.assigned_to IS NULL)
              ELSE r.stock END,
         CASE WHEN v_uid IS NULL THEN 'signed_out' ELSE reward_block_reason(r.id, v_uid, true, now(), v_point) END,
         (red.id IS NOT NULL),
         red.fulfillment_code,
         CASE WHEN red.id IS NOT NULL THEN r.how_to_use END,
         COALESCE(r.image_url, (SELECT pa.logo_url FROM partners pa WHERE pa.id = r.partner_id))
    FROM pace_store_rewards r
    LEFT JOIN pace_redemptions red ON red.reward_id = r.id AND red.user_id = v_uid
   WHERE r.status <> 'hidden'
     -- A brand that isn't active shows nothing, except codes runners already have.
     AND (public.reward_partner_live(r.partner_id) OR red.id IS NOT NULL)
     -- Keep finished rewards visible only to people who redeemed them.
     AND (r.expires_at IS NULL OR r.expires_at > now() - interval '7 days' OR red.id IS NOT NULL)
     -- Other countries' and cities' rewards aren't shown at all.
     AND (r.countries IS NULL OR cardinality(r.countries) = 0 OR v_country = ANY (r.countries))
     AND (r.cities IS NULL OR cardinality(r.cities) = 0 OR v_city = ANY (r.cities))
   ORDER BY r.sort_order, r.created_at;
END;
$function$;
REVOKE ALL ON FUNCTION public.store_catalog(double precision, double precision) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.store_catalog(double precision, double precision) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.list_sponsored_challenges();
CREATE OR REPLACE FUNCTION public.list_sponsored_challenges()
 RETURNS TABLE(id uuid, brand text, brand_color text, title text, description text, metric text, target numeric, starts_at timestamp with time zone, ends_at timestamp with time zone, reward_title text, reward_value text, joined boolean, progress numeric, completed boolean, code text, image_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.id, c.brand, c.brand_color, c.title, c.description, c.metric, c.target, c.starts_at, c.ends_at,
         r.title, r.value_label,
         e.user_id IS NOT NULL, CASE WHEN e.user_id IS NULL THEN 0 ELSE sponsored_progress(c.id, auth.uid()) END,
         e.completed_at IS NOT NULL, e.code,
         COALESCE(c.image_url, (SELECT pa.logo_url FROM partners pa WHERE pa.id = c.partner_id))
    FROM sponsored_challenges c
    JOIN pace_store_rewards r ON r.id = c.reward_id
    LEFT JOIN sponsored_challenge_entries e ON e.challenge_id = c.id AND e.user_id = auth.uid()
    JOIN profiles p ON p.id = auth.uid()
   WHERE c.status = 'live' AND c.ends_at > now() - interval '7 days'
     AND (c.countries IS NULL OR p.country = ANY (c.countries))
     -- A brand that isn't active shows nothing, except codes runners already have.
     AND (public.reward_partner_live(c.partner_id) OR e.code IS NOT NULL)
   ORDER BY (e.completed_at IS NOT NULL), c.ends_at;
$function$;
REVOKE ALL ON FUNCTION public.list_sponsored_challenges() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_sponsored_challenges() TO authenticated, service_role;

-- ── 4. Impact: challenge status ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_impact(p_kind text, p_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v jsonb;
BEGIN
  IF p_kind = 'reward' THEN
    SELECT jsonb_build_object(
      'exists',          EXISTS (SELECT 1 FROM pace_store_rewards WHERE id = p_id),
      'label',           (SELECT title FROM pace_store_rewards WHERE id = p_id),
      'status',          (SELECT status FROM pace_store_rewards WHERE id = p_id),
      'redeemed_by',     (SELECT count(DISTINCT user_id) FROM pace_redemptions WHERE reward_id = p_id),
      'redemptions',     (SELECT count(*) FROM pace_redemptions WHERE reward_id = p_id),
      'codes_unused',    (SELECT count(*) FROM reward_codes WHERE reward_id = p_id AND assigned_to IS NULL),
      'codes_assigned',  (SELECT count(*) FROM reward_codes WHERE reward_id = p_id AND assigned_to IS NOT NULL),
      'views',           (SELECT count(*) FROM reward_events WHERE reward_id = p_id AND event = 'view'),
      'challenges',      (SELECT count(*) FROM sponsored_challenges WHERE reward_id = p_id)
    ) INTO v;
  ELSIF p_kind = 'event' THEN
    SELECT jsonb_build_object(
      'exists',          EXISTS (SELECT 1 FROM events WHERE id = p_id),
      'label',           (SELECT title FROM events WHERE id = p_id),
      'active',          (SELECT is_active FROM events WHERE id = p_id),
      'starts_at',       (SELECT starts_at FROM events WHERE id = p_id),
      'going',           (SELECT count(*) FROM event_participants WHERE event_id = p_id),
      'bookmarked',      (SELECT count(*) FROM event_bookmarks WHERE event_id = p_id),
      'finished',        (SELECT count(*) FROM event_finishers WHERE event_id = p_id),
      'races',           (SELECT count(*) FROM races WHERE event_id = p_id)
    ) INTO v;
  ELSIF p_kind = 'partner' THEN
    SELECT jsonb_build_object(
      'exists',          EXISTS (SELECT 1 FROM partners WHERE id = p_id),
      'label',           (SELECT name FROM partners WHERE id = p_id),
      'status',          (SELECT status FROM partners WHERE id = p_id),
      'rewards',         (SELECT count(*) FROM pace_store_rewards WHERE partner_id = p_id),
      'rewards_live',    (SELECT count(*) FROM pace_store_rewards WHERE partner_id = p_id AND status = 'available'),
      'challenges',      (SELECT count(*) FROM sponsored_challenges WHERE partner_id = p_id),
      'redeemed_by',     (SELECT count(DISTINCT r.user_id) FROM pace_redemptions r
                            JOIN pace_store_rewards w ON w.id = r.reward_id WHERE w.partner_id = p_id)
    ) INTO v;
  ELSIF p_kind = 'challenge' THEN
    SELECT jsonb_build_object(
      'exists',          EXISTS (SELECT 1 FROM sponsored_challenges WHERE id = p_id),
      'label',           (SELECT title FROM sponsored_challenges WHERE id = p_id),
      'status',          (SELECT status FROM sponsored_challenges WHERE id = p_id),
      'joined',          (SELECT count(*) FROM sponsored_challenge_entries WHERE challenge_id = p_id),
      'completed',       (SELECT count(*) FROM sponsored_challenge_entries WHERE challenge_id = p_id AND completed_at IS NOT NULL),
      'codes_won',       (SELECT count(*) FROM sponsored_challenge_entries WHERE challenge_id = p_id AND code IS NOT NULL)
    ) INTO v;
  ELSE
    RAISE EXCEPTION 'unknown kind %', p_kind USING ERRCODE = '22023';
  END IF;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_impact(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_impact(text, uuid) TO service_role;


-- ════════════════════════════════════════════════════════════════════════
-- 019_waitlist_attribution
-- ════════════════════════════════════════════════════════════════════════

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
