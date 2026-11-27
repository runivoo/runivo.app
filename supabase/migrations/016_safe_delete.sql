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
