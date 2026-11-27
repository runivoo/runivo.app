-- Partner applications on runivo.in/partners are now a short contact form: company,
-- contact name, work email and website. The team contacts the brand and works out the
-- category, offer, stock and cities with them (the Partners tab in /admin edits all of it).
-- So submit_partner_application no longer needs an offer, and a missing category becomes 'other'.
-- Same signature as before, so the grants and callers are unchanged. When they are given,
-- the category and offer are still validated.

CREATE OR REPLACE FUNCTION public.submit_partner_application(p_name text, p_category text, p_contact_name text, p_contact_email text, p_website text, p_countries text[], p_cities text[], p_offer text, p_estimated_stock integer) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_email text := lower(btrim(p_contact_email));
  v_offer text := NULLIF(btrim(COALESCE(p_offer, '')), '');
  v_id    uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'submit_partner_application is service_role only';
  END IF;

  IF length(btrim(COALESCE(p_name, ''))) NOT BETWEEN 2 AND 120
     OR v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email) > 200
     OR (v_offer IS NOT NULL AND length(v_offer) > 1000)
     OR (p_category IS NOT NULL AND p_category NOT IN ('shoes', 'apparel', 'gear', 'nutrition', 'cafe', 'physio', 'races', 'gym', 'insurance', 'tech', 'other'))
     OR (p_estimated_stock IS NOT NULL AND (p_estimated_stock < 0 OR p_estimated_stock > 1000000)) THEN
    RAISE EXCEPTION 'invalid' USING ERRCODE = '22023';
  END IF;

  -- At most 3 applications per email per day.
  IF (SELECT count(*) FROM partners
       WHERE status = 'applied' AND lower(contact_email) = v_email
         AND applied_at > now() - interval '1 day') >= 3 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO partners (name, category, contact_name, contact_email, website, countries, cities,
                        offer, estimated_stock, status, applied_at)
  VALUES (btrim(p_name), COALESCE(p_category, 'other'), NULLIF(btrim(COALESCE(p_contact_name, '')), ''), v_email,
          NULLIF(btrim(COALESCE(p_website, '')), ''),
          CASE WHEN cardinality(p_countries) > 0 THEN p_countries[1:20] END,
          CASE WHEN cardinality(p_cities) > 0 THEN p_cities[1:50] END,
          v_offer, p_estimated_stock, 'applied', now())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$_$;

REVOKE ALL ON FUNCTION public.submit_partner_application(p_name text, p_category text, p_contact_name text, p_contact_email text, p_website text, p_countries text[], p_cities text[], p_offer text, p_estimated_stock integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_partner_application(p_name text, p_category text, p_contact_name text, p_contact_email text, p_website text, p_countries text[], p_cities text[], p_offer text, p_estimated_stock integer) TO service_role;
