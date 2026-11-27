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
