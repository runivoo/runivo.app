-- Pre-launch waitlist (runivo.in). People leave an email (and optionally a city)
-- before the app is on the App Store. Nobody reads or writes the table from a
-- client: the website's /api/waitlist route calls join_waitlist with the service
-- role, and the admin app lists it through /api/admin/waitlist.

CREATE TABLE public.waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  city       text,
  source     text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_email_format CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 200 AND email = lower(email)),
  CONSTRAINT waitlist_city_len     CHECK (city IS NULL OR length(city) BETWEEN 1 AND 80),
  CONSTRAINT waitlist_source_len   CHECK (length(source) BETWEEN 1 AND 40)
);

CREATE UNIQUE INDEX waitlist_email_key ON public.waitlist (email);
CREATE INDEX waitlist_created_at_idx ON public.waitlist (created_at DESC);

-- RLS on with no policies: only the service role (which bypasses RLS) can touch it.
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.waitlist FROM PUBLIC, anon, authenticated;

-- Adds an email to the waitlist. Returns true when it is new, false when it was
-- already there (the same answer to the person either way, so the form cannot be
-- used to find out who has signed up).
CREATE FUNCTION public.join_waitlist(p_email text, p_city text DEFAULT NULL, p_source text DEFAULT 'web')
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text := lower(btrim(p_email));
  v_city  text := NULLIF(btrim(COALESCE(p_city, '')), '');
  v_src   text := COALESCE(NULLIF(btrim(COALESCE(p_source, '')), ''), 'web');
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

  INSERT INTO waitlist (email, city, source) VALUES (v_email, v_city, v_src)
  ON CONFLICT (email) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.join_waitlist(p_email text, p_city text, p_source text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_waitlist(p_email text, p_city text, p_source text) TO service_role;
