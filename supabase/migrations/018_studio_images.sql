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
