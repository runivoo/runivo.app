-- A profile a runner creates starts like any other (002_accounts, protect_profile_columns
-- guards updates only). Signup makes the row (handle_new_user), but if that ever failed
-- the app's profile sync would insert it, and the runner could send subscription_tier
-- 'admin', coins, rank or stats with it. A client insert now gets the column defaults
-- for everything the server owns.

CREATE OR REPLACE FUNCTION public.guard_profile_insert() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Not SECURITY DEFINER: current_user is the caller. handle_new_user and other
  -- SECURITY DEFINER code insert as the owner, so they keep what they set.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  NEW.subscription_tier         := 'free';
  NEW.subscription_expires_at   := NULL;
  NEW.subscription_event_at     := NULL;
  NEW.pace_balance              := 0;
  NEW.pace_total_earned         := 0;
  NEW.pace_weekly_earned        := 0;
  NEW.pace_weekly_reset_at      := now();
  NEW.runner_rank               := 'pacer';
  NEW.territory_score           := 0;
  NEW.follower_count            := 0;
  NEW.following_count           := 0;
  NEW.streak_days               := 0;
  NEW.last_run_date             := NULL;
  NEW.total_distance_km         := 0;
  NEW.total_runs                := 0;
  NEW.level                     := 1;
  NEW.xp                        := 0;
  NEW.coins                     := 100;
  NEW.energy                    := 10;
  NEW.unlocked_achievements     := '{}';
  NEW.total_territories_claimed := 0;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_profile_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_guard_insert ON public.profiles;
CREATE TRIGGER profiles_guard_insert BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_insert();
