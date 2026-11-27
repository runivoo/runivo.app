-- Sponsored challenges follow their brand's status, like rewards do
-- (024_partner_status_gate). Pausing, ending or rejecting a partner in
-- the admin used to leave its challenges live: runners could still join them and
-- claim a code the brand had stopped honouring. Runners who already hold a code
-- still see it.

CREATE OR REPLACE FUNCTION public.list_sponsored_challenges()
 RETURNS TABLE(id uuid, brand text, brand_color text, title text, description text, metric text, target numeric, starts_at timestamp with time zone, ends_at timestamp with time zone, reward_title text, reward_value text, joined boolean, progress numeric, completed boolean, code text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.id, c.brand, c.brand_color, c.title, c.description, c.metric, c.target, c.starts_at, c.ends_at,
         r.title, r.value_label,
         e.user_id IS NOT NULL, CASE WHEN e.user_id IS NULL THEN 0 ELSE sponsored_progress(c.id, auth.uid()) END,
         e.completed_at IS NOT NULL, e.code
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

CREATE OR REPLACE FUNCTION public.join_sponsored_challenge(p_challenge uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  INSERT INTO sponsored_challenge_entries (challenge_id, user_id)
  SELECT id, auth.uid() FROM sponsored_challenges
   WHERE id = p_challenge AND status = 'live' AND ends_at > now()
     AND public.reward_partner_live(partner_id)
  ON CONFLICT DO NOTHING;
$function$;

CREATE OR REPLACE FUNCTION public.claim_sponsored_reward(p_challenge uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c sponsored_challenges%ROWTYPE;
  e sponsored_challenge_entries%ROWTYPE;
  v_code text;
BEGIN
  SELECT * INTO c FROM sponsored_challenges WHERE id = p_challenge;
  SELECT * INTO e FROM sponsored_challenge_entries WHERE challenge_id = p_challenge AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'join the challenge first'; END IF;
  IF e.code IS NOT NULL THEN RETURN e.code; END IF;
  IF NOT public.reward_partner_live(c.partner_id) THEN RAISE EXCEPTION 'this offer has ended'; END IF;
  IF sponsored_progress(p_challenge, auth.uid()) < c.target THEN RAISE EXCEPTION 'not finished yet'; END IF;
  UPDATE reward_codes SET assigned_to = auth.uid(), assigned_at = now()
   WHERE id = (SELECT id FROM reward_codes WHERE reward_id = c.reward_id AND assigned_to IS NULL LIMIT 1 FOR UPDATE SKIP LOCKED)
  RETURNING code INTO v_code;
  IF v_code IS NULL THEN
    SELECT static_code INTO v_code FROM pace_store_rewards WHERE id = c.reward_id AND code_mode = 'static';
  END IF;
  IF v_code IS NULL THEN RAISE EXCEPTION 'the brand has run out of codes; we''ll let you know'; END IF;
  UPDATE sponsored_challenge_entries SET completed_at = now(), code = v_code WHERE challenge_id = p_challenge AND user_id = auth.uid();
  RETURN v_code;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_sponsored_challenges() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_sponsored_challenges() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.join_sponsored_challenge(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_sponsored_challenge(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.claim_sponsored_reward(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_sponsored_reward(uuid) TO authenticated, service_role;
