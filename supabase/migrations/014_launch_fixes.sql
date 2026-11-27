-- ========================================================================
-- Launch fixes
-- ========================================================================
-- Everything changed after the 13 feature files (001-013), in the order it was
-- written: security, privacy, social and territory fixes from the pre-launch
-- reviews, the waitlist, partner gates, pause breaks and the profile insert guard.
-- These were files 014-029; they are merged here unchanged and in the same order,
-- and a database built from 001-014 matches one built from those exactly.
--
-- New changes: add 015_<name>.sql, one file per change.


-- ════════════════════════════════════════════════════════════════════════
-- 014_security_definer_search_path
-- ════════════════════════════════════════════════════════════════════════

-- ============================================================
-- Security: fix the search path of older privileged functions
-- ============================================================
-- SECURITY DEFINER functions run with the owner's rights. Without a fixed
-- search_path, a caller who can create objects in a schema earlier on their
-- search_path could make such a function call their own same-named function
-- or table. Every privileged function written since November sets one; these
-- older ones didn't (found by scripts/lint-migrations.mjs once the history was
-- consolidated). 'extensions' is included so PostGIS calls keep working
-- wherever the extension is installed. Behaviour is otherwise unchanged.

ALTER FUNCTION public.accept_club_join_request(request_id uuid) SET search_path = public, extensions;
ALTER FUNCTION public.add_comment(p_post_id uuid, p_content text) SET search_path = public, extensions;
ALTER FUNCTION public.apply_pace_adjustment(p_user_id uuid, p_pace_delta integer) SET search_path = public, extensions;
ALTER FUNCTION public.count_defendable_stale_zones(p_wkt text, p_owner_id uuid, p_stale_at smallint) SET search_path = public, extensions;
ALTER FUNCTION public.defend_own_territories(p_wkt text, p_owner_id uuid) SET search_path = public, extensions;
ALTER FUNCTION public.diagnose_pace_ledger() SET search_path = public, extensions;
ALTER FUNCTION public.find_routes_nearby(p_lng double precision, p_lat double precision, p_radius_m double precision) SET search_path = public, extensions;
ALTER FUNCTION public.get_post_likers(p_post_id uuid, lim integer) SET search_path = public, extensions;
ALTER FUNCTION public.grant_award(p_user_id uuid, p_award_id text) SET search_path = public, extensions;
ALTER FUNCTION public.log_club_activity_on_join() SET search_path = public, extensions;
ALTER FUNCTION public.mark_notifications_read() SET search_path = public, extensions;
ALTER FUNCTION public.notify_comment() SET search_path = public, extensions;
ALTER FUNCTION public.notify_follow() SET search_path = public, extensions;
ALTER FUNCTION public.notify_push_on_notification() SET search_path = public, extensions;
ALTER FUNCTION public.report_post(p_post_id uuid, p_reason text) SET search_path = public, extensions;
ALTER FUNCTION public.run_kudos_count(run_id uuid) SET search_path = public, extensions;
ALTER FUNCTION public.send_run_reminders() SET search_path = public, extensions;
ALTER FUNCTION public.send_weekly_summaries() SET search_path = public, extensions;
ALTER FUNCTION public.sync_club_member_count() SET search_path = public, extensions;
ALTER FUNCTION public.sync_comment_count() SET search_path = public, extensions;
ALTER FUNCTION public.sync_event_participant_count() SET search_path = public, extensions;
ALTER FUNCTION public.sync_follow_counts() SET search_path = public, extensions;
ALTER FUNCTION public.sync_profile_run_stats() SET search_path = public, extensions;
ALTER FUNCTION public.sync_territory_score(p_user_id uuid) SET search_path = public, extensions;
ALTER FUNCTION public.sync_user_awards(p_user_id uuid) SET search_path = public, extensions;
ALTER FUNCTION public.territory_polygons_sync_score() SET search_path = public, extensions;
ALTER FUNCTION public.toggle_follow(target_id uuid) SET search_path = public, extensions;
ALTER FUNCTION public.toggle_like(p_post_id uuid) SET search_path = public, extensions;
ALTER FUNCTION public.unread_notification_count() SET search_path = public, extensions;


-- ════════════════════════════════════════════════════════════════════════
-- 015_runs_route_fractional_timestamps
-- ════════════════════════════════════════════════════════════════════════

-- Runs: accept GPS fix times with a fractional millisecond.
--
-- iOS reports location timestamps like 1795015014321.3967. derive_run_route()
-- ordered the points by (timestamp)::bigint, which raised 22P02 "invalid input
-- syntax for type bigint" and rejected the whole run upload. The app now rounds
-- times before upload; ordering by numeric keeps the server safe for any older
-- build or recovered run that still sends a fraction.
SET check_function_bodies = false;
SET client_min_messages = warning;
SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION public.derive_run_route() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  coords text;
begin
  if new.gps_points is null or jsonb_array_length(new.gps_points) < 2 then
    return new;
  end if;

  select string_agg(
    (p->>'lng') || ' ' || (p->>'lat'),
    ','
    order by (p->>'timestamp')::numeric
  )
  into coords
  from jsonb_array_elements(new.gps_points) as p;

  new.route := st_geomfromtext('LINESTRING(' || coords || ')', 4326);
  return new;
end;
$$;


-- ════════════════════════════════════════════════════════════════════════
-- 016_pace_invite_code_search_path
-- ════════════════════════════════════════════════════════════════════════

-- PACE: invite codes ("Invite friends · get 50 PACE each") failed for everyone.
--
-- my_referral_code() calls gen_random_bytes(), which lives in the pgcrypto
-- extension. On Supabase that is installed in the `extensions` schema, but the
-- function's search_path was only 'public', so it raised "function
-- gen_random_bytes(integer) does not exist" and the app showed "Couldn't get
-- your invite code". Same path as every other SECURITY DEFINER function (0014).
SET check_function_bodies = false;
SET client_min_messages = warning;
SET search_path = public, extensions;

ALTER FUNCTION public.my_referral_code() SET search_path = public, extensions;


-- ════════════════════════════════════════════════════════════════════════
-- 017_launch_fixes
-- ════════════════════════════════════════════════════════════════════════

-- Launch fixes found in the pre-submission review (23 Nov 2026).
--
-- 1. Account deletion (App Store 5.1.1(v)) failed for anyone who had stolen or
--    lost a zone: feed_posts.stolen_from_user_id pointed at profiles with no
--    ON DELETE rule, so deleting the user hit a foreign-key violation.
-- 2. The word filter (App Store 1.2) had an empty list unless a seed was run by
--    hand. The list now ships with the schema.
-- 3. Post titles and text, run titles and descriptions, and usernames skipped the
--    filter. New rows are cleaned (the offending field is cleared, so a run upload
--    or sign-up never fails over a word); edits are refused with content_not_allowed.

-- ── 1. Deleting a runner keeps the zone-steal posts, without the link ──────────
ALTER TABLE public.feed_posts DROP CONSTRAINT feed_posts_stolen_from_user_id_fkey;
ALTER TABLE public.feed_posts
  ADD CONSTRAINT feed_posts_stolen_from_user_id_fkey
  FOREIGN KEY (stolen_from_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ── 2. Blocked words ─────────────────────────────────────────────────────────
-- Single lowercase words, matched whole-word after folding 0/1/3/4/@/$/5/! to
-- letters (contains_blocked_term). Built from the "List of Dirty, Naughty, Obscene,
-- and Otherwise Bad Words" (github.com/LDNOOBW, CC BY 4.0), English and Hindi,
-- with words runners use innocently removed (e.g. nipple, butt kicks, domination,
-- snatch, hardcore, suck, chakke). Moderators can add more rows at any time.
INSERT INTO public.blocked_terms (term) VALUES
 ('2g1c'), ('aand'), ('aandu'), ('acrotomophilia'), ('anal'), ('anilingus'), ('anus'),
 ('apeshit'), ('arsehole'), ('ass'), ('asshole'), ('assmunch'), ('autoerotic'), ('babeland'),
 ('balatkar'), ('balatkari'), ('bangbros'), ('bangbus'), ('bareback'), ('barenaked'),
 ('bastard'), ('bastardo'), ('bastinado'), ('bbw'), ('bdsm'), ('beaner'), ('beaners'),
 ('beastiality'), ('bestiality'), ('bhadva'), ('bhadve'), ('bhandve'), ('bhangi'), ('bhosad'),
 ('bimbos'), ('birdlock'), ('bitch'), ('bitches'), ('blowjob'), ('blumpkin'), ('bollocks'),
 ('bondage'), ('boner'), ('boob'), ('boobe'), ('boobs'), ('bukkake'), ('bulldyke'),
 ('bullshit'), ('bunghole'), ('busty'), ('butthole'), ('camgirl'), ('camslut'), ('camwhore'),
 ('carpetmuncher'), ('chinaal'), ('chinki'), ('chod'), ('chodu'), ('chooche'), ('choochi'),
 ('choope'), ('choot'), ('chootia'), ('chootiya'), ('chuche'), ('chuchi'), ('chudaap'),
 ('chude'), ('chut'), ('chutad'), ('chutadd'), ('chutan'), ('chutia'), ('chutiya'), ('cialis'),
 ('circlejerk'), ('clit'), ('clitoris'), ('clusterfuck'), ('cock'), ('cocks'), ('coon'),
 ('coons'), ('coprolagnia'), ('coprophilia'), ('cornhole'), ('creampie'), ('cum'), ('cumming'),
 ('cumshot'), ('cumshots'), ('cunnilingus'), ('cunt'), ('darkie'), ('daterape'),
 ('deepthroat'), ('dendrophilia'), ('dick'), ('dickhead'), ('dildo'), ('dingleberries'),
 ('dingleberry'), ('doggiestyle'), ('doggystyle'), ('dolcett'), ('dominatrix'), ('dommes'),
 ('dvda'), ('ecchi'), ('ejaculation'), ('erotic'), ('fag'), ('faggot'), ('fecal'), ('felch'),
 ('fellatio'), ('feltch'), ('femdom'), ('figging'), ('fingerbang'), ('fingering'), ('fisting'),
 ('footjob'), ('frotting'), ('fuck'), ('fucker'), ('fuckin'), ('fucking'), ('fucktards'),
 ('fudgepacker'), ('futanari'), ('gaand'), ('gaandfat'), ('gaandmasti'), ('gaandufad'),
 ('gandfattu'), ('gandu'), ('gangbang'), ('gashti'), ('gasti'), ('genitals'), ('ghasti'),
 ('goatcx'), ('goatse'), ('gokkun'), ('goregasm'), ('grope'), ('guro'), ('handjob'),
 ('haramzade'), ('hentai'), ('homoerotic'), ('honkey'), ('horny'), ('humping'), ('incest'),
 ('jailbait'), ('jhant'), ('jhantu'), ('jigaboo'), ('jiggaboo'), ('jiggerboo'), ('jizz'),
 ('juggs'), ('kanjar'), ('kike'), ('kinbaku'), ('kinkster'), ('kinky'), ('knobbing'),
 ('kuttiya'), ('kys'), ('livesex'), ('loda'), ('lodu'), ('lolita'), ('lovemaking'), ('lund'),
 ('lundtopi'), ('lundure'), ('madarchod'), ('madhavchod'), ('masturbate'), ('masturbating'),
 ('masturbation'), ('milf'), ('motherfucker'), ('muffdiving'), ('mutth'), ('mutthal'),
 ('nambla'), ('nawashi'), ('negro'), ('neonazi'), ('nigga'), ('nigger'), ('nimphomania'),
 ('nsfw'), ('nude'), ('nudity'), ('nutten'), ('nympho'), ('nymphomania'), ('octopussy'),
 ('omorashi'), ('orgasm'), ('orgy'), ('paedophile'), ('paki'), ('panties'), ('panty'),
 ('pedobear'), ('pedophile'), ('pegging'), ('penis'), ('pikey'), ('pissing'), ('pisspig'),
 ('playboy'), ('ponyplay'), ('poof'), ('poon'), ('poontang'), ('poopchute'), ('porn'),
 ('porno'), ('pornography'), ('pthc'), ('pubes'), ('punany'), ('pussy'), ('queaf'), ('queef'),
 ('quim'), ('raand'), ('raghead'), ('randaap'), ('randi'), ('rape'), ('raping'), ('rapist'),
 ('rectum'), ('rimjob'), ('rimming'), ('sadism'), ('santorum'), ('schlong'), ('semen'),
 ('sexcam'), ('sexo'), ('sexy'), ('shemale'), ('shibari'), ('shit'), ('shitblimp'), ('shitty'),
 ('shota'), ('slanteye'), ('slut'), ('smut'), ('sodomize'), ('sodomy'), ('spastic'), ('spic'),
 ('splooge'), ('spooge'), ('strapon'), ('strappado'), ('swastika'), ('swinger'), ('tatte'),
 ('tharak'), ('tharki'), ('threesome'), ('throating'), ('thumbzilla'), ('tits'), ('titties'),
 ('titty'), ('tosser'), ('towelhead'), ('tranny'), ('tribadism'), ('tubgirl'), ('tushy'),
 ('twat'), ('upskirt'), ('urophilia'), ('vagina'), ('viagra'), ('vibrator'), ('vorarephilia'),
 ('voyeur'), ('voyeurweb'), ('voyuer'), ('vulva'), ('wank'), ('wanker'), ('wetback'),
 ('whore'), ('worldsex'), ('xxx'), ('yaoi'), ('yiffy'), ('zoophilia')
ON CONFLICT (term) DO NOTHING;

-- ── 3. Filter the remaining text fields ─────────────────────────────────────
-- Clears any named text column that holds a blocked word (for inserts that must
-- not fail: run uploads, posts written by sync, the profile made at sign-up).
-- SECURITY DEFINER like reject_blocked_text: contains_blocked_term (and the word
-- list) is not executable by runners, and these run inside their inserts.
CREATE OR REPLACE FUNCTION public.clear_blocked_text() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  col text;
BEGIN
  FOREACH col IN ARRAY TG_ARGV LOOP
    IF public.contains_blocked_term(to_jsonb(NEW) ->> col) THEN
      NEW := jsonb_populate_record(NEW, jsonb_build_object(col, NULL));
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

-- A username can't be cleared (NOT NULL, unique): swap in a neutral one.
CREATE OR REPLACE FUNCTION public.replace_blocked_username() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF public.contains_blocked_term(NEW.username) THEN
    NEW.username := 'runner_' || substr(md5(NEW.id::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_blocked_text() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.replace_blocked_username() FROM PUBLIC, anon, authenticated;

-- Posts
CREATE TRIGGER trg_clear_posts BEFORE INSERT ON public.feed_posts
  FOR EACH ROW EXECUTE FUNCTION public.clear_blocked_text('title', 'content');
CREATE TRIGGER trg_filter_posts BEFORE UPDATE OF title, content ON public.feed_posts
  FOR EACH ROW WHEN ((new.title IS DISTINCT FROM old.title) OR (new.content IS DISTINCT FROM old.content))
  EXECUTE FUNCTION public.reject_blocked_text('title', 'content');

-- Runs (title and description show on the feed post)
CREATE TRIGGER trg_clear_runs BEFORE INSERT ON public.runs
  FOR EACH ROW EXECUTE FUNCTION public.clear_blocked_text('title', 'description');
CREATE TRIGGER trg_filter_runs BEFORE UPDATE OF title, description ON public.runs
  FOR EACH ROW WHEN ((new.title IS DISTINCT FROM old.title) OR (new.description IS DISTINCT FROM old.description))
  EXECUTE FUNCTION public.reject_blocked_text('title', 'description');

-- Usernames: a new profile gets a neutral name; a rename is refused.
CREATE TRIGGER trg_clear_profile_username BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.replace_blocked_username();
DROP TRIGGER trg_filter_profiles ON public.profiles;
CREATE TRIGGER trg_filter_profiles BEFORE UPDATE OF bio, display_name, username ON public.profiles
  FOR EACH ROW WHEN ((new.bio IS DISTINCT FROM old.bio) OR (new.display_name IS DISTINCT FROM old.display_name) OR (new.username IS DISTINCT FROM old.username))
  EXECUTE FUNCTION public.reject_blocked_text('bio', 'display_name', 'username');

-- ── 4. Deleting a club owner ────────────────────────────────────────────────
-- prevent_orphaned_club refused to drop the last owner, so deleting the account
-- of anyone who owned a club failed. delete-account now calls this first: the
-- club passes to its longest-standing admin (else member); a club with nobody
-- else in it is deleted.
CREATE OR REPLACE FUNCTION public.release_owned_clubs(p_user uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  c record;
  v_heir uuid;
BEGIN
  FOR c IN SELECT id FROM public.clubs WHERE owner_id = p_user LOOP
    SELECT user_id INTO v_heir
      FROM public.club_members
     WHERE club_id = c.id AND user_id <> p_user
     ORDER BY (role = 'admin') DESC, joined_at ASC
     LIMIT 1;
    IF v_heir IS NULL THEN
      DELETE FROM public.clubs WHERE id = c.id;
    ELSE
      UPDATE public.club_members SET role = 'owner' WHERE club_id = c.id AND user_id = v_heir;
      UPDATE public.clubs SET owner_id = v_heir WHERE id = c.id;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.release_owned_clubs(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_owned_clubs(uuid) TO service_role;

-- ── 5. Push delivery settings from Vault ────────────────────────────────────
-- The push trigger read app.edge_function_url / app.service_role_key, which a
-- hosted Supabase project often won't let you set (ALTER DATABASE ... SET is
-- refused). It now reads Vault secrets of the same names first, falling back to
-- the old settings. Set them once in the SQL editor:
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1', 'edge_function_url');
--   select vault.create_secret('<service_role key>', 'service_role_key');
CREATE OR REPLACE FUNCTION public.notify_push_on_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  edge_url text;
  svc_key  text;
BEGIN
  IF NEW.silent THEN RETURN NEW; END IF;
  BEGIN
    SELECT decrypted_secret INTO edge_url FROM vault.decrypted_secrets WHERE name = 'edge_function_url' LIMIT 1;
    SELECT decrypted_secret INTO svc_key  FROM vault.decrypted_secrets WHERE name = 'service_role_key'  LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    edge_url := NULL; svc_key := NULL;   -- no Vault: use the settings below
  END;
  edge_url := COALESCE(NULLIF(edge_url, ''), current_setting('app.edge_function_url', true));
  svc_key  := COALESCE(NULLIF(svc_key, ''),  current_setting('app.service_role_key', true));
  IF edge_url IS NULL OR edge_url = '' OR svc_key IS NULL OR svc_key = '' THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url     := rtrim(edge_url, '/') || '/send-push-notification',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || svc_key
               ),
    body    := jsonb_build_object(
                 'user_id',    NEW.user_id,
                 'title',      NEW.title,
                 'body',       COALESCE(NEW.body, ''),
                 'action_url', COALESCE(NEW.action_url, '/'),
                 'type',       NEW.type
               )::text
  );
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.notify_push_on_notification() FROM PUBLIC, anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════
-- 018_territory_fixes
-- ════════════════════════════════════════════════════════════════════════

-- ========================================================================
-- Territory fixes (pre-launch audit, docs: /home/claude/audit/territory.md)
-- ========================================================================
-- T1-T3  A zone's geom is rebuilt from polygon_coords, which holds only the
--        outer ring. Any piece with a hole (a big loop run as a strip, a steal
--        through the middle of a zone, a loop around someone else's zone) was
--        stored solid: the runner silently owned the hole too. Pieces are now
--        cut into hole-free parts before they are stored.
-- T11    "Stale" for defending used the stored freshness, which never decays.
-- T12    Defending fully refreshes a zone (it used to add 10 to the stored,
--        undecayed value, which favoured long-abandoned zones).
-- T13    Two runs finishing over the same free ground could both claim it.
--        Claims and steals now take one transaction-level advisory lock.
-- T14    process-run-territory did each step in its own transaction, so a
--        failure halfway left steals and the streak written while the retry
--        lost the PACE for them. apply_run_territory does every territory
--        write in one transaction and records the outcome on run_processing,
--        so a retry reuses it.
-- T21    The map returned an arbitrary 500 zones; it now returns the largest.
-- T27    total_territories_claimed is server-owned (counted here), not pushed
--        by the app; runs.territories_claimed is written from the verdict.

SET check_function_bodies = false;
SET client_min_messages = warning;
SET search_path = public, extensions;

-- ── Stage of an interrupted processing attempt (T14) ─────────────────────

ALTER TABLE public.run_processing ADD COLUMN IF NOT EXISTS stage jsonb;

-- ── Hole-free parts (T1-T3) ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hole_free_parts(g geometry, depth integer DEFAULT 0) RETURNS SETOF geometry
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  p     geometry;
  x     float8;
  b     box2d;
  blade geometry;
BEGIN
  IF g IS NULL OR ST_IsEmpty(g) THEN RETURN; END IF;
  FOR p IN SELECT (ST_Dump(ST_CollectionExtract(ST_MakeValid(g), 3))).geom LOOP
    IF ST_NumInteriorRings(p) = 0 OR depth >= 24 THEN
      RETURN NEXT p;
      CONTINUE;
    END IF;
    -- Cut north-south through the first hole: the hole opens up into the
    -- outline of the pieces on either side.
    x := ST_X(ST_Centroid(ST_InteriorRingN(p, 1)));
    b := p::box2d;
    blade := ST_SetSRID(ST_MakeLine(ST_MakePoint(x, ST_YMin(b) - 1), ST_MakePoint(x, ST_YMax(b) + 1)), ST_SRID(p));
    RETURN QUERY
      SELECT h FROM ST_Dump(ST_Split(p, blade)) d, public.hole_free_parts(d.geom, depth + 1) h;
  END LOOP;
END;
$$;

-- ── Claim free ground (T1, T3, T13) ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_unclaimed_area(p_wkt text, p_owner_id uuid, p_run_id uuid, p_is_loop boolean DEFAULT false) RETURNS TABLE(pieces integer, area_m2 double precision)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
#variable_conflict use_column
DECLARE
  v_run      geometry := ST_GeomFromText(p_wkt, 4326);
  v_existing geometry;
  v_free     geometry;
  v_part     geometry;
  v_area     float8;
  v_coords   jsonb;
  v_pieces   int := 0;
  v_total    float8 := 0;
BEGIN
  -- One claim or steal at a time: two runs over the same free ground used to
  -- both see it free and both claim it.
  PERFORM pg_advisory_xact_lock(hashtext('runivo_territory'));

  SELECT ST_Union(geom) INTO v_existing
  FROM public.territory_polygons
  WHERE geom IS NOT NULL AND ST_Intersects(geom, v_run);

  v_free := CASE WHEN v_existing IS NULL THEN v_run ELSE ST_Difference(v_run, v_existing) END;
  IF v_free IS NULL OR ST_IsEmpty(v_free) THEN
    pieces := 0; area_m2 := 0; RETURN NEXT; RETURN;
  END IF;

  FOR v_part IN
    SELECT h FROM public.hole_free_parts(v_free) h
    ORDER BY ST_Area(h::geography) DESC
  LOOP
    v_area := ST_Area(v_part::geography);
    CONTINUE WHEN v_area < 100;
    v_coords := (ST_AsGeoJSON(v_part)::jsonb -> 'coordinates' -> 0);
    CONTINUE WHEN v_coords IS NULL OR jsonb_array_length(v_coords) < 4;

    INSERT INTO public.territory_polygons (
      id, run_id, owner_id, polygon_coords, area_m2,
      freshness, last_defended_at, claimed_at, is_loop_fill, tier
    ) VALUES (
      gen_random_uuid(), p_run_id, p_owner_id, v_coords, v_area,
      100, now(), now(), p_is_loop,
      CASE
        WHEN v_area <   5000 THEN 'patch'
        WHEN v_area <  50000 THEN 'block'
        WHEN v_area < 200000 THEN 'district'
        WHEN v_area < 500000 THEN 'quarter'
        ELSE 'domain'
      END
    );
    v_pieces := v_pieces + 1;
    v_total  := v_total + v_area;
  END LOOP;

  pieces := v_pieces; area_m2 := v_total; RETURN NEXT;
END;
$$;

-- ── Steal part of a rival's zone (T2, T13) ───────────────────────────────

CREATE OR REPLACE FUNCTION public.steal_territory_portion(p_rival_id uuid, p_new_wkt text, p_new_owner uuid, p_run_id uuid) RETURNS double precision
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  rival_geom  geometry;
  run_geom    geometry;
  stolen_geom geometry;
  remain_geom geometry;
  part        geometry;
  part_area   float8;
  part_coords jsonb;
  is_first    boolean;
  v_taken     float8 := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('runivo_territory'));

  SELECT geom INTO rival_geom FROM public.territory_polygons WHERE id = p_rival_id FOR UPDATE;
  IF rival_geom IS NULL THEN RETURN 0; END IF;

  run_geom    := ST_GeomFromText(p_new_wkt, 4326);
  stolen_geom := ST_Intersection(rival_geom, run_geom);
  remain_geom := ST_Difference(rival_geom, run_geom);

  IF stolen_geom IS NULL OR ST_IsEmpty(stolen_geom) OR ST_Area(stolen_geom::geography) < 50 THEN
    RETURN 0;
  END IF;

  FOR part IN
    SELECT h FROM public.hole_free_parts(stolen_geom) h
    ORDER BY ST_Area(h::geography) DESC
  LOOP
    part_area := ST_Area(part::geography);
    CONTINUE WHEN part_area < 50;
    part_coords := (ST_AsGeoJSON(part)::jsonb -> 'coordinates' -> 0);
    CONTINUE WHEN part_coords IS NULL OR jsonb_array_length(part_coords) < 4;

    INSERT INTO public.territory_polygons (
      id, run_id, owner_id, polygon_coords, area_m2,
      freshness, last_defended_at, claimed_at, is_loop_fill, tier
    ) VALUES (
      gen_random_uuid(), p_run_id, p_new_owner, part_coords, part_area,
      100, now(), now(), false,
      CASE
        WHEN part_area <   5000 THEN 'patch'
        WHEN part_area <  50000 THEN 'block'
        WHEN part_area < 200000 THEN 'district'
        WHEN part_area < 500000 THEN 'quarter'
        ELSE 'domain'
      END
    );
    v_taken := v_taken + part_area;
  END LOOP;

  IF v_taken = 0 THEN
    RETURN 0;
  END IF;

  IF remain_geom IS NULL OR ST_IsEmpty(remain_geom) THEN
    DELETE FROM public.territory_polygons WHERE id = p_rival_id;
    RETURN v_taken;
  END IF;

  -- What the rival keeps, hole-free: a strip through the middle of a zone
  -- used to leave a hole that the stored outline filled straight back in.
  is_first := true;
  FOR part IN
    SELECT h FROM public.hole_free_parts(remain_geom) h
    ORDER BY ST_Area(h::geography) DESC
  LOOP
    part_area := ST_Area(part::geography);
    CONTINUE WHEN part_area < 100;
    part_coords := (ST_AsGeoJSON(part)::jsonb -> 'coordinates' -> 0);
    CONTINUE WHEN part_coords IS NULL OR jsonb_array_length(part_coords) < 4;

    IF is_first THEN
      UPDATE public.territory_polygons SET
        polygon_coords = part_coords,
        area_m2        = part_area,
        freshness      = GREATEST(0, freshness - 20),
        tier           = CASE
                           WHEN part_area <   5000 THEN 'patch'
                           WHEN part_area <  50000 THEN 'block'
                           WHEN part_area < 200000 THEN 'district'
                           WHEN part_area < 500000 THEN 'quarter'
                           ELSE 'domain'
                         END
      WHERE id = p_rival_id;
      is_first := false;
    ELSE
      INSERT INTO public.territory_polygons (
        id, run_id, owner_id, polygon_coords, area_m2,
        freshness, last_defended_at, claimed_at, is_loop_fill, tier
      )
      SELECT gen_random_uuid(), tp.run_id, tp.owner_id, part_coords, part_area,
             GREATEST(0, tp.freshness - 20), tp.last_defended_at, tp.claimed_at, tp.is_loop_fill,
             CASE
               WHEN part_area <   5000 THEN 'patch'
               WHEN part_area <  50000 THEN 'block'
               WHEN part_area < 200000 THEN 'district'
               WHEN part_area < 500000 THEN 'quarter'
               ELSE 'domain'
             END
      FROM public.territory_polygons tp WHERE tp.id = p_rival_id;
    END IF;
  END LOOP;

  IF is_first THEN
    DELETE FROM public.territory_polygons WHERE id = p_rival_id;
  END IF;

  RETURN v_taken;
END;
$$;

-- ── Defending (T11, T12) ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.count_defendable_stale_zones(p_wkt text, p_owner_id uuid, p_stale_at smallint) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
  SELECT COUNT(*)::INT FROM public.territory_polygons
  WHERE owner_id = p_owner_id
    AND geom IS NOT NULL
    AND GREATEST(0, floor(freshness - EXTRACT(EPOCH FROM (now() - last_defended_at)) / 86400 * 10)) < p_stale_at
    AND ST_Intersects(geom, ST_GeomFromText(p_wkt, 4326));
$$;

CREATE OR REPLACE FUNCTION public.defend_own_territories(p_wkt text, p_owner_id uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
  -- A run through your own zone fully refreshes it.
  UPDATE public.territory_polygons
  SET freshness        = 100,
      last_defended_at = now()
  WHERE owner_id = p_owner_id
    AND geom IS NOT NULL
    AND ST_Intersects(geom, ST_GeomFromText(p_wkt, 4326));
$$;

-- ── Every territory write of one run, in one transaction (T14) ───────────

CREATE OR REPLACE FUNCTION public.apply_run_territory(
  p_run_id uuid, p_owner_id uuid, p_wkt text, p_is_loop boolean, p_can_expand boolean,
  p_rival_ids uuid[], p_stale_at integer, p_streak_days integer, p_last_run_date date
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  v_rid     uuid;
  v_owner   uuid;
  v_taken   float8;
  v_stolen  jsonb := '[]'::jsonb;
  v_pieces  int := 0;
  v_claimed float8 := 0;
  v_stale   int := 0;
  v_tiers   text[] := '{}';
  v_result  jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('runivo_territory'));

  IF p_last_run_date IS NOT NULL THEN
    PERFORM set_config('runivo.trusted_writer', 'on', true);
    UPDATE public.profiles SET streak_days = p_streak_days, last_run_date = p_last_run_date WHERE id = p_owner_id;
    PERFORM set_config('runivo.trusted_writer', 'off', true);
  END IF;

  IF p_wkt IS NOT NULL THEN
    IF p_can_expand THEN
      FOREACH v_rid IN ARRAY COALESCE(p_rival_ids, '{}') LOOP
        SELECT owner_id INTO v_owner FROM public.territory_polygons WHERE id = v_rid;
        CONTINUE WHEN v_owner IS NULL OR v_owner = p_owner_id;
        v_taken := public.steal_territory_portion(v_rid, p_wkt, p_owner_id, p_run_id);
        IF v_taken > 0 THEN
          v_stolen := v_stolen || jsonb_build_object('territory_id', v_rid, 'owner_id', v_owner, 'area_m2', v_taken);
          v_tiers := v_tiers || CASE WHEN v_taken < 5000 THEN 'patch' WHEN v_taken < 50000 THEN 'block'
                                     WHEN v_taken < 200000 THEN 'district' WHEN v_taken < 500000 THEN 'quarter' ELSE 'domain' END;
        END IF;
      END LOOP;

      SELECT c.pieces, c.area_m2 INTO v_pieces, v_claimed
        FROM public.claim_unclaimed_area(p_wkt, p_owner_id, p_run_id, p_is_loop) c;
      IF COALESCE(v_pieces, 0) > 0 THEN
        v_tiers := v_tiers || CASE WHEN v_claimed < 5000 THEN 'patch' WHEN v_claimed < 50000 THEN 'block'
                                   WHEN v_claimed < 200000 THEN 'district' WHEN v_claimed < 500000 THEN 'quarter' ELSE 'domain' END;
      END IF;
    END IF;

    -- Counted before defending, so it reflects zones that were stale when the run passed.
    v_stale := public.count_defendable_stale_zones(p_wkt, p_owner_id, p_stale_at::smallint);
    PERFORM public.defend_own_territories(p_wkt, p_owner_id);
  END IF;

  -- Server-owned counters, written once with the verdict (T27).
  UPDATE public.runs SET territories_claimed = v_tiers WHERE id = p_run_id;
  IF cardinality(v_tiers) > 0 THEN
    PERFORM set_config('runivo.trusted_writer', 'on', true);
    UPDATE public.profiles SET total_territories_claimed = total_territories_claimed + cardinality(v_tiers) WHERE id = p_owner_id;
    PERFORM set_config('runivo.trusted_writer', 'off', true);
  END IF;

  v_result := jsonb_build_object(
    'stolen', v_stolen,
    'pieces', COALESCE(v_pieces, 0),
    'claimed_area_m2', COALESCE(v_claimed, 0),
    'defended_stale', COALESCE(v_stale, 0),
    'streak_advanced', p_last_run_date IS NOT NULL,
    'streak_days', p_streak_days
  );
  UPDATE public.run_processing SET stage = v_result WHERE run_id = p_run_id;
  RETURN v_result;
END;
$$;

-- ── Map: the largest zones first (T21) ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_map_polygons(min_lat double precision, min_lng double precision, max_lat double precision, max_lng double precision) RETURNS TABLE(id uuid, owner_id uuid, owner_name text, area_m2 double precision, freshness smallint, last_defended_at timestamp with time zone, is_loop_fill boolean, tier text, polygon_coords jsonb)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    tp.id,
    tp.owner_id,
    COALESCE(tp.owner_name, p.username) AS owner_name,
    tp.area_m2,
    tp.freshness,
    tp.last_defended_at,
    tp.is_loop_fill,
    tp.tier,
    tp.polygon_coords
  FROM territory_polygons tp
  JOIN profiles_public p ON p.id = tp.owner_id
  WHERE tp.geom IS NOT NULL
    AND tp.polygon_coords IS NOT NULL
    AND jsonb_array_length(tp.polygon_coords) >= 4
    AND ST_Intersects(
      tp.geom,
      ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    )
  ORDER BY tp.area_m2 DESC
  LIMIT 500;
$$;

-- ── total_territories_claimed is server-owned (T27) ──────────────────────

CREATE OR REPLACE FUNCTION public.protect_profile_columns() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.role() = 'service_role'
     OR current_setting('runivo.trusted_writer', true) = 'on' THEN
    RETURN NEW;
  END IF;

  NEW.subscription_tier       := OLD.subscription_tier;
  NEW.subscription_expires_at := OLD.subscription_expires_at;
  NEW.subscription_event_at   := OLD.subscription_event_at;
  NEW.pace_balance            := OLD.pace_balance;
  NEW.pace_total_earned       := OLD.pace_total_earned;
  NEW.pace_weekly_earned      := OLD.pace_weekly_earned;
  NEW.pace_weekly_reset_at    := OLD.pace_weekly_reset_at;
  NEW.runner_rank             := OLD.runner_rank;
  NEW.territory_score         := OLD.territory_score;
  NEW.follower_count          := OLD.follower_count;
  NEW.following_count         := OLD.following_count;
  NEW.streak_days             := OLD.streak_days;
  NEW.last_run_date           := OLD.last_run_date;
  NEW.total_distance_km       := OLD.total_distance_km;
  NEW.total_runs              := OLD.total_runs;
  NEW.total_territories_claimed := OLD.total_territories_claimed;

  RETURN NEW;
END;
$$;

-- ── Grants ───────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.hole_free_parts(geometry, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hole_free_parts(geometry, integer) TO service_role;

REVOKE ALL ON FUNCTION public.claim_unclaimed_area(text, uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_unclaimed_area(text, uuid, uuid, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.steal_territory_portion(uuid, text, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steal_territory_portion(uuid, text, uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.count_defendable_stale_zones(text, uuid, smallint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_defendable_stale_zones(text, uuid, smallint) TO service_role;

REVOKE ALL ON FUNCTION public.defend_own_territories(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.defend_own_territories(text, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.apply_run_territory(uuid, uuid, text, boolean, boolean, uuid[], integer, integer, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_run_territory(uuid, uuid, text, boolean, boolean, uuid[], integer, integer, date) TO service_role;

REVOKE ALL ON FUNCTION public.protect_profile_columns() FROM PUBLIC, anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════
-- 019_privacy_fixes
-- ════════════════════════════════════════════════════════════════════════

-- Privacy fixes from the pre-launch review (23 Nov 2026), bugs.md B02, B04, B11, B12.
--
-- 1. Runners aged 13 to 17 (age_range = 'under_18', set by the age screen) keep
--    a safe start on the SERVER (Followers: only runners they approve), whatever a client sends:
--    - the profile can't be made public (Everyone), and live run sharing stays off.
--      The app used to push its stale phone copy of these on any settings change,
--      which turned a teen's private profile public when they switched km to mi (B02);
--    - 'under_18' can't be cleared or overwritten by the client, and a confirmed age
--      can't be un-confirmed. Onboarding sent null here when "About you" was skipped,
--      so PaceX stopped knowing it was coaching a minor (B04).
-- 2. Comments: readable only by signed-in runners who may see the post, never from
--    someone either side has blocked, never hidden ones (except the author's own).
--    Two SELECT policies used USING (true) with no role, so anyone with the public
--    anon key could read every comment, on followers-only and private posts too (B11).
--    get_comments (SECURITY DEFINER, skips RLS) gets the same post-visibility check.
-- 3. run_territories: the pre-polygon table, read by nothing, readable by anon and
--    ignoring map hiding and private places. Migration 018 dropped its write
--    policies; the table itself goes (B12).

-- ── 1. Minors ────────────────────────────────────────────────────────────────
-- SECURITY INVOKER: it only edits NEW, needs no privileges of its own.
CREATE OR REPLACE FUNCTION public.guard_minor_profile() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    -- The minor flag and the age confirmation are one-way for clients.
    IF OLD.age_range = 'under_18' THEN
      NEW.age_range := OLD.age_range;
    END IF;
    IF OLD.age_confirmed_at IS NOT NULL AND NEW.age_confirmed_at IS NULL THEN
      NEW.age_confirmed_at := OLD.age_confirmed_at;
    END IF;
  END IF;

  IF NEW.age_range = 'under_18' THEN
    IF NEW.profile_visibility = 'public' THEN
      -- Asking for it outright is refused, so the app can say it didn't save.
      -- Becoming a minor on a public row (age screen, onboarding) goes to Followers:
      -- every follow of a non-public profile needs their approval (set_follow).
      IF OLD.age_range = 'under_18' AND OLD.profile_visibility IS DISTINCT FROM 'public' THEN
        RAISE EXCEPTION 'profiles of runners under 18 cannot be public' USING ERRCODE = '42501';
      END IF;
      NEW.profile_visibility := 'followers';
    END IF;
    IF NEW.live_run_sharing_enabled THEN
      IF OLD.age_range = 'under_18' AND NOT OLD.live_run_sharing_enabled THEN
        RAISE EXCEPTION 'live run sharing is not available under 18' USING ERRCODE = '42501';
      END IF;
      NEW.live_run_sharing_enabled := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_minor_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_guard_minor ON public.profiles;
CREATE TRIGGER profiles_guard_minor BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_minor_profile();

-- Rows already marked under 18 get the safe start now.
UPDATE public.profiles
   SET profile_visibility = 'followers'
 WHERE age_range = 'under_18' AND profile_visibility = 'public';
UPDATE public.profiles
   SET live_run_sharing_enabled = false
 WHERE age_range = 'under_18' AND live_run_sharing_enabled;

-- ── 2. Comments ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS comments_read ON public.feed_post_comments;
DROP POLICY IF EXISTS "feed_post_comments: anyone can read" ON public.feed_post_comments;

CREATE POLICY "feed_post_comments: viewers of the post read" ON public.feed_post_comments
  FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid() OR hidden_at IS NULL)
    AND NOT public.is_blocked_between(auth.uid(), user_id)
    AND EXISTS (
      SELECT 1 FROM public.feed_posts p
       WHERE p.id = feed_post_comments.post_id
         AND public.can_view_post(auth.uid(), p.user_id, p.visibility)
    )
  );

REVOKE SELECT ON TABLE public.feed_post_comments FROM anon;

CREATE OR REPLACE FUNCTION public.get_comments(p_post_id uuid, lim integer DEFAULT 50)
    RETURNS TABLE(id uuid, user_id uuid, username text, avatar_color text, content text, created_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT c.id, c.user_id, p.username, p.avatar_color,
         c.content, c.created_at
  FROM public.feed_post_comments c
  JOIN public.profiles p ON p.id = c.user_id
  JOIN public.feed_posts fp ON fp.id = c.post_id
  WHERE c.post_id = p_post_id
    AND c.hidden_at IS NULL
    AND public.can_view_post(auth.uid(), fp.user_id, fp.visibility)
    AND NOT public.is_blocked_between(auth.uid(), c.user_id)
  ORDER BY c.created_at ASC
  LIMIT lim;
$$;

REVOKE ALL ON FUNCTION public.get_comments(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_comments(uuid, integer) TO authenticated, service_role;

-- ── 3. Legacy run_territories ─────────────────────────────────────────────────
DROP TABLE IF EXISTS public.run_territories;


-- ════════════════════════════════════════════════════════════════════════
-- 020_social_fixes
-- ════════════════════════════════════════════════════════════════════════

-- Social fixes from the pre-launch social audit (23 Nov 2026, /home/claude/audit/social.md).
--
--  1. P0-01  A post is visible only if its author's profile is visible to the viewer
--            (private profiles, and every 13-17 year old, were in Discover). Teens'
--            activities default to followers only.
--  2. P1-03  A comment counted twice (add_comment and trg_sync_comment_count).
--  3. P1-06  The follow graph was readable by anyone, anon included.
--  4. P1-07  Following a non-public profile is a request the owner approves; owners
--            can remove a follower. Direct inserts can only follow public profiles.
--  5. P1-05  Runner search on the server.
--  6. P1-08  Posts take the server's time and tier; level, xp, coins, energy and
--            achievements can't be set by the client (keeps migration 018's lock on
--            total_territories_claimed). P1-09 avatar_url must be the runner's own upload.
--  7. P1-13  Club invite links (any club, invite-only included) and a notification
--            to the owner when someone asks to join.
--  8. P2     Likers respect visibility; refresh_post_routes not for anon; broken
--            kudos trigger dropped; dead stories/run_photos tables dropped; awards,
--            join requests and attendees not world-readable; club totals not
--            owner-writable; likes only through toggle_like; seeded global lobbies
--            removed; live position not written inside a privacy place.
--
-- Comment read access (B11) and the text filter (migration 017) are handled elsewhere.

SET search_path = public, extensions;

-- ── Helper: a profile's visibility, for policies (profiles is owner-only) ────
CREATE OR REPLACE FUNCTION public.profile_visibility_of(p_user uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ SELECT profile_visibility FROM public.profiles WHERE id = p_user $$;
REVOKE ALL ON FUNCTION public.profile_visibility_of(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_visibility_of(uuid) TO authenticated, service_role;

-- ── 1. Posts follow the author's profile visibility ──────────────────────────
CREATE OR REPLACE FUNCTION public.can_view_post(p_viewer uuid, p_author uuid, p_visibility text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT p_viewer = p_author
      OR (
        p_viewer IS NOT NULL
        AND NOT public.is_blocked_between(p_viewer, p_author)
        AND public.can_view_profile(p_viewer, p_author, public.profile_visibility_of(p_author))
        AND (
          COALESCE(p_visibility, 'everyone') = 'everyone'
          OR (p_visibility = 'followers' AND EXISTS (
                SELECT 1 FROM public.followers WHERE follower_id = p_viewer AND following_id = p_author))
        )
      );
$$;
REVOKE ALL ON FUNCTION public.can_view_post(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_post(uuid, uuid, text) TO authenticated, service_role;

-- Teens: activities default to followers; what they already posted to everyone too.
UPDATE public.profiles SET default_activity_visibility = 'followers'
 WHERE age_range = 'under_18' AND default_activity_visibility = 'everyone';
UPDATE public.feed_posts SET visibility = 'followers'
 WHERE visibility = 'everyone'
   AND user_id IN (SELECT id FROM public.profiles WHERE age_range = 'under_18');

-- ── 2. One comment counts once ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_comment(p_post_id uuid, p_content text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public, extensions
    AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.feed_post_comments (post_id, user_id, content)
  VALUES (p_post_id, auth.uid(), trim(p_content))
  RETURNING id INTO v_id;
  RETURN v_id;   -- trg_sync_comment_count keeps feed_posts.comment_count
END;
$$;
REVOKE ALL ON FUNCTION public.add_comment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_comment(uuid, text) TO authenticated, service_role;

UPDATE public.feed_posts fp
   SET comment_count = c.n
  FROM (SELECT p.id, count(c.id)::int AS n
          FROM public.feed_posts p LEFT JOIN public.feed_post_comments c ON c.post_id = p.id
         GROUP BY p.id) c
 WHERE c.id = fp.id AND fp.comment_count IS DISTINCT FROM c.n;

-- ── 3. Who follows whom is visible only where both profiles are ─────────────
DROP POLICY IF EXISTS "followers: anyone can read" ON public.followers;
CREATE POLICY "followers: visible edges" ON public.followers FOR SELECT TO authenticated USING (
  follower_id = auth.uid() OR following_id = auth.uid()
  OR (public.can_view_profile(auth.uid(), following_id, public.profile_visibility_of(following_id))
      AND public.can_view_profile(auth.uid(), follower_id, public.profile_visibility_of(follower_id))));
REVOKE ALL ON public.followers FROM anon;

-- ── 4. Follow requests ──────────────────────────────────────────────────────
CREATE TABLE public.follow_requests (
    follower_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT follow_requests_check CHECK (follower_id <> following_id)
);
CREATE INDEX follow_requests_following_idx ON public.follow_requests (following_id, created_at DESC);
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follow_requests: either side reads" ON public.follow_requests
  FOR SELECT TO authenticated USING (auth.uid() = follower_id OR auth.uid() = following_id);
REVOKE ALL ON public.follow_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.follow_requests TO authenticated;
GRANT ALL ON public.follow_requests TO service_role;

-- Only public profiles can be followed with a plain insert; the rest go through set_follow.
DROP POLICY IF EXISTS "followers: self can follow" ON public.followers;
CREATE POLICY "followers: self can follow public profiles" ON public.followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id AND public.profile_visibility_of(following_id) = 'public');

-- set_follow(target, true) follows (public) or asks (followers-only / private);
-- set_follow(target, false) unfollows or withdraws the request.
-- Returns the new state: 'following' | 'requested' | 'none'.
CREATE OR REPLACE FUNCTION public.set_follow(p_target uuid, p_follow boolean) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_me   uuid := auth.uid();
  v_vis  text;
  v_name text;
  v_new  boolean;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501'; END IF;
  IF p_target IS NULL OR p_target = v_me THEN RAISE EXCEPTION 'cannot follow yourself' USING ERRCODE = '22023'; END IF;

  IF NOT COALESCE(p_follow, false) THEN
    DELETE FROM public.followers WHERE follower_id = v_me AND following_id = p_target;
    DELETE FROM public.follow_requests WHERE follower_id = v_me AND following_id = p_target;
    RETURN 'none';
  END IF;

  IF EXISTS (SELECT 1 FROM public.followers WHERE follower_id = v_me AND following_id = p_target) THEN
    RETURN 'following';
  END IF;
  IF public.is_blocked_between(v_me, p_target) THEN RAISE EXCEPTION 'blocked' USING ERRCODE = '42501'; END IF;

  SELECT profile_visibility INTO v_vis FROM public.profiles WHERE id = p_target;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE = '22023'; END IF;

  -- "Only me" means only me: nobody can follow it, so no request that leads nowhere.
  IF v_vis = 'private' THEN
    DELETE FROM public.follow_requests WHERE follower_id = v_me AND following_id = p_target;
    RETURN 'none';
  END IF;

  IF v_vis = 'public' THEN
    INSERT INTO public.followers (follower_id, following_id) VALUES (v_me, p_target) ON CONFLICT DO NOTHING;
    DELETE FROM public.follow_requests WHERE follower_id = v_me AND following_id = p_target;
    RETURN 'following';
  END IF;

  INSERT INTO public.follow_requests (follower_id, following_id) VALUES (v_me, p_target)
  ON CONFLICT DO NOTHING
  RETURNING true INTO v_new;
  IF v_new THEN
    SELECT username INTO v_name FROM public.profiles WHERE id = v_me;
    INSERT INTO public.notifications (user_id, type, title, body, action_url)
    VALUES (p_target, 'follow', COALESCE(v_name, 'A runner') || ' asked to follow you',
            'Tap to accept or decline.', '/profile/' || v_me::text);
  END IF;
  RETURN 'requested';
END;
$$;
REVOKE ALL ON FUNCTION public.set_follow(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_follow(uuid, boolean) TO authenticated, service_role;

-- Old clients: same rules. Returns true when you now follow them.
CREATE OR REPLACE FUNCTION public.toggle_follow(target_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public, extensions
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.followers WHERE follower_id = auth.uid() AND following_id = target_id)
     OR EXISTS (SELECT 1 FROM public.follow_requests WHERE follower_id = auth.uid() AND following_id = target_id) THEN
    PERFORM public.set_follow(target_id, false);
    RETURN false;
  END IF;
  RETURN public.set_follow(target_id, true) = 'following';
END;
$$;
REVOKE ALL ON FUNCTION public.toggle_follow(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_follow(uuid) TO authenticated, service_role;

-- The profile owner accepts or declines a request.
CREATE OR REPLACE FUNCTION public.respond_follow_request(p_follower uuid, p_accept boolean) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_me uuid := auth.uid(); v_name text; v_vis text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.follow_requests WHERE follower_id = p_follower AND following_id = v_me;
  IF NOT FOUND THEN RETURN false; END IF;
  IF COALESCE(p_accept, false) THEN
    INSERT INTO public.followers (follower_id, following_id) VALUES (p_follower, v_me) ON CONFLICT DO NOTHING;
    SELECT username, profile_visibility INTO v_name, v_vis FROM public.profiles WHERE id = v_me;
    INSERT INTO public.notifications (user_id, type, title, body, action_url)
    VALUES (p_follower, 'follow', COALESCE(v_name, 'A runner') || ' accepted your follow request',
            CASE WHEN v_vis = 'private' THEN 'Their profile is set to Only me for now.'
                 ELSE 'You can see their activities now.' END,
            '/profile/' || v_me::text);
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.respond_follow_request(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_follow_request(uuid, boolean) TO authenticated, service_role;

-- Remove someone who follows you (they are not told).
CREATE OR REPLACE FUNCTION public.remove_follower(p_follower uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.followers WHERE follower_id = p_follower AND following_id = auth.uid();
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.remove_follower(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_follower(uuid) TO authenticated, service_role;

-- A block also drops pending requests both ways.
CREATE OR REPLACE FUNCTION public.drop_follow_requests_on_block() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.follow_requests
   WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
      OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.drop_follow_requests_on_block() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_block_drops_follow_requests AFTER INSERT ON public.user_blocks
  FOR EACH ROW EXECUTE FUNCTION public.drop_follow_requests_on_block();

-- ── 5. Runner search ─────────────────────────────────────────────────────────
-- Username prefix search. Private profiles are not findable (unless you follow them).
CREATE OR REPLACE FUNCTION public.search_runners(q text, lim integer DEFAULT 20)
RETURNS TABLE(id uuid, username text, avatar_url text, avatar_color text, total_distance_km numeric, territory_score integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT p.id, p.username, p.avatar_url, p.avatar_color,
         CASE WHEN public.can_view_profile(auth.uid(), p.id, p.profile_visibility) THEN p.total_distance_km END::numeric,
         p.territory_score::int
    FROM public.profiles p
   WHERE auth.uid() IS NOT NULL
     AND length(trim(COALESCE(q, ''))) >= 2
     AND p.username ILIKE replace(replace(replace(lower(trim(q)), '\', ''), '%', ''), '_', '\_') || '%'
     AND p.id <> auth.uid()
     AND p.id NOT IN (SELECT public.hidden_user_ids(auth.uid()))
     AND (p.profile_visibility <> 'private'
          OR EXISTS (SELECT 1 FROM public.followers f WHERE f.follower_id = auth.uid() AND f.following_id = p.id))
   ORDER BY length(p.username), p.username
   LIMIT LEAST(GREATEST(COALESCE(lim, 20), 1), 50);
$$;
REVOKE ALL ON FUNCTION public.search_runners(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_runners(text, integer) TO authenticated, service_role;

-- ── 6. Server-owned post time / tier and profile stats ───────────────────────
CREATE OR REPLACE FUNCTION public.feed_post_server_stats() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  NEW.created_at := now();     -- a post can't be dated into the future (or past)
  NEW := public.feed_post_with_server_stats(NEW);
  IF COALESCE(NEW.post_type, 'run') = 'run' THEN
    -- The tier of the biggest zone this run holds, not the client's word for it.
    NEW.territory_tier := (SELECT t.tier FROM public.territory_polygons t
                            WHERE t.run_id = NEW.run_id AND t.owner_id = NEW.user_id
                            ORDER BY t.area_m2 DESC LIMIT 1);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.protect_profile_columns() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_host text;
BEGIN
  IF auth.role() = 'service_role'
     OR current_setting('runivo.trusted_writer', true) = 'on' THEN
    RETURN NEW;
  END IF;

  NEW.subscription_tier       := OLD.subscription_tier;
  NEW.subscription_expires_at := OLD.subscription_expires_at;
  NEW.subscription_event_at   := OLD.subscription_event_at;
  NEW.pace_balance            := OLD.pace_balance;
  NEW.pace_total_earned       := OLD.pace_total_earned;
  NEW.pace_weekly_earned      := OLD.pace_weekly_earned;
  NEW.pace_weekly_reset_at    := OLD.pace_weekly_reset_at;
  NEW.runner_rank             := OLD.runner_rank;
  NEW.territory_score         := OLD.territory_score;
  NEW.follower_count          := OLD.follower_count;
  NEW.following_count         := OLD.following_count;
  NEW.streak_days             := OLD.streak_days;
  NEW.last_run_date           := OLD.last_run_date;
  NEW.total_distance_km       := OLD.total_distance_km;
  NEW.total_runs              := OLD.total_runs;
  -- Shown to other runners, with no server source: the client can't change them.
  NEW.level                   := OLD.level;
  NEW.xp                      := OLD.xp;
  NEW.coins                   := OLD.coins;
  NEW.energy                  := OLD.energy;
  NEW.unlocked_achievements   := OLD.unlocked_achievements;
  NEW.total_territories_claimed := OLD.total_territories_claimed;   -- server-owned since migration 018
  -- Becoming under 18 (age screen): activities default to followers. The rest of the
  -- minor rules (private, no live sharing, sticky flag) are guard_minor_profile (migration 019).
  IF NEW.age_range = 'under_18' AND OLD.age_range IS DISTINCT FROM 'under_18'
     AND NEW.default_activity_visibility = 'everyone' THEN
    NEW.default_activity_visibility := 'followers';
  END IF;
  -- A profile photo is the runner's own upload in this project's avatars bucket
  -- (the host the runner's token was issued by: https://<project>/auth/v1).
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url AND NEW.avatar_url IS NOT NULL THEN
    v_host := lower(substring(COALESCE(auth.jwt() ->> 'iss', '') from '^https?://([^/]+)'));
    IF v_host IS NULL OR v_host !~ '^[a-z0-9.:-]+$' THEN v_host := '[A-Za-z0-9.:-]+'; ELSE v_host := replace(v_host, '.', '\.'); END IF;
    IF NEW.avatar_url !~ ('^https?://' || v_host || '/storage/v1/object/public/avatars/' || NEW.id::text || '/') THEN
      NEW.avatar_url := OLD.avatar_url;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_columns() FROM PUBLIC, anon, authenticated;

-- ── 7. Club invites and join-request notifications ──────────────────────────
CREATE TABLE public.club_invites (
    club_id    uuid PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,
    code       text NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.club_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.club_invites FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.club_invites TO service_role;

-- A club's invite code, for members to share (made on first ask).
CREATE OR REPLACE FUNCTION public.get_club_invite(p_club uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public, extensions
    AS $$
DECLARE v_code text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.club_members WHERE club_id = p_club AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'only members can invite' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.club_invites (club_id) VALUES (p_club) ON CONFLICT (club_id) DO NOTHING;
  SELECT code INTO v_code FROM public.club_invites WHERE club_id = p_club;
  RETURN v_code;
END;
$$;
REVOKE ALL ON FUNCTION public.get_club_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_club_invite(uuid) TO authenticated, service_role;

-- Join with an invite code: works for invite-only clubs too. Removed members stay out.
-- Returns 'joined' | 'already' | 'bad_code' | 'banned'.
CREATE OR REPLACE FUNCTION public.join_club_with_invite(p_club uuid, p_code text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.club_members WHERE club_id = p_club AND user_id = v_me) THEN RETURN 'already'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.club_invites WHERE club_id = p_club AND code = p_code) THEN RETURN 'bad_code'; END IF;
  IF EXISTS (SELECT 1 FROM public.club_bans WHERE club_id = p_club AND user_id = v_me) OR public.is_banned(v_me) THEN
    RETURN 'banned';
  END IF;
  INSERT INTO public.club_members (club_id, user_id, role) VALUES (p_club, v_me, 'member') ON CONFLICT DO NOTHING;
  DELETE FROM public.club_join_requests WHERE club_id = p_club AND user_id = v_me;
  RETURN 'joined';
END;
$$;
REVOKE ALL ON FUNCTION public.join_club_with_invite(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_club_with_invite(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.notify_club_join_request() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, action_url)
  SELECT c.owner_id, 'club_join',
         COALESCE((SELECT username FROM public.profiles WHERE id = NEW.user_id), 'A runner') || ' wants to join ' || c.name,
         'Open the club''s Admin tab to accept or decline.', '/club/' || NEW.club_id::text
    FROM public.clubs c WHERE c.id = NEW.club_id AND c.owner_id <> NEW.user_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_club_join_request() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_notify_club_join_request AFTER INSERT ON public.club_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_club_join_request();

-- ── 8. Smaller items ─────────────────────────────────────────────────────────
-- P2-01: likers only for posts you can see, without hidden runners.
CREATE OR REPLACE FUNCTION public.get_post_likers(p_post_id uuid, lim integer DEFAULT 3)
RETURNS TABLE(id uuid, username text, avatar_url text, avatar_color text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public, extensions
    AS $$
  SELECT p.id, p.username, p.avatar_url, p.avatar_color
    FROM public.feed_post_likes l
    JOIN public.feed_posts fp ON fp.id = l.post_id
    JOIN public.profiles p ON p.id = l.user_id
   WHERE l.post_id = p_post_id
     AND public.can_view_post(auth.uid(), fp.user_id, fp.visibility)
     AND l.user_id NOT IN (SELECT public.hidden_user_ids(auth.uid()))
   ORDER BY l.created_at DESC
   LIMIT LEAST(GREATEST(COALESCE(lim, 3), 1), 50);
$$;
REVOKE ALL ON FUNCTION public.get_post_likers(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_post_likers(uuid, integer) TO authenticated, service_role;

-- P2-02
REVOKE ALL ON FUNCTION public.refresh_post_routes(uuid, uuid) FROM anon;
-- P2-03: the kudos table's trigger read a column it doesn't have; nothing uses the table.
DROP TRIGGER IF EXISTS trg_notify_kudos ON public.kudos;
-- P2-07: unused tables (the stories bucket stays for delete-account's cleanup).
DROP TABLE IF EXISTS public.stories;
DROP TABLE IF EXISTS public.run_photos;
-- P2-08: a private runner's awards are private.
DROP POLICY IF EXISTS awards_read_own ON public.user_awards;
CREATE POLICY "user_awards: visible with the profile" ON public.user_awards FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_view_profile(auth.uid(), user_id, public.profile_visibility_of(user_id)));
REVOKE ALL ON public.user_awards FROM anon;
-- P2-09: who asked to join a club / who goes to an event.
DROP POLICY IF EXISTS "club_join_requests: anyone can read" ON public.club_join_requests;
CREATE POLICY "club_join_requests: requester or moderators" ON public.club_join_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_club_moderator(club_id, auth.uid()));
REVOKE ALL ON public.club_join_requests FROM anon;
DROP POLICY IF EXISTS "event_participants: anyone can read" ON public.event_participants;
CREATE POLICY "event_participants: signed-in, not hidden" ON public.event_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id NOT IN (SELECT public.hidden_user_ids(auth.uid())));
REVOKE ALL ON public.event_participants FROM anon;
-- P2-10: club owners edit the club's face, not its counters.
REVOKE UPDATE ON public.clubs FROM authenticated, anon;
GRANT UPDATE (name, description, badge_emoji, join_policy, avatar_url, banner_url) ON public.clubs TO authenticated;
-- P2-17: likes only through toggle_like, which keeps the counter.
REVOKE INSERT, DELETE ON public.feed_post_likes FROM authenticated, anon;
-- P2-11: seeded global rooms nobody can report in.
DELETE FROM public.lobbies WHERE club_id IS NULL AND created_by IS NULL
   AND id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
              '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004',
              '00000000-0000-0000-0000-000000000005');

-- P2-05: a live position inside one of your privacy places is not shared.
CREATE OR REPLACE FUNCTION public.skip_live_position_in_privacy_place() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public, extensions
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.privacy_places pp
              WHERE pp.user_id = NEW.user_id
                AND ST_DWithin(pp.center, ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography, pp.radius_m)) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.skip_live_position_in_privacy_place() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_live_position_privacy BEFORE INSERT OR UPDATE OF lat, lng ON public.live_run_positions
  FOR EACH ROW EXECUTE FUNCTION public.skip_live_position_in_privacy_place();

-- ── 9. Word-filter triggers run as their owner ───────────────────────────────
-- Migration 017's clear_blocked_text / replace_blocked_username are SECURITY
-- INVOKER, but contains_blocked_term is not executable by clients, so every
-- client insert into feed_posts, runs and profiles (sync upload, pushProfile's
-- upsert) failed with "permission denied for function contains_blocked_term".
-- reject_blocked_text already runs as definer; these now do too.
ALTER FUNCTION public.clear_blocked_text() SECURITY DEFINER;
ALTER FUNCTION public.replace_blocked_username() SECURITY DEFINER;


-- ════════════════════════════════════════════════════════════════════════
-- 021_review_fixes
-- ════════════════════════════════════════════════════════════════════════

-- Fixes from the independent review of the launch work (23 Nov 2026, review.md).
--
-- F5. "Friends running now" never showed anyone: the live_run_positions read
--     policy checked profiles.live_run_sharing_enabled with a plain sub-select,
--     and profiles is owner-only under RLS, so for any other runner it was empty.
-- F7. Whole-word matches that wiped innocent text: names and places such as
--     "Lund parkrun", "Run with Dick", "Randi's 10k", "Coon Rapids", "Paki Bay",
--     "Cum laude 5k", and words like nude/sexy that runners use in jokes.
-- F8. A post's tier came from its biggest piece while its area was the run's whole
--     claim, so they could disagree; a steal-only run got a tier with no area.

-- ── F5 ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.live_sharing_on(p_user uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE((SELECT live_run_sharing_enabled FROM public.profiles WHERE id = p_user), false);
$$;
REVOKE ALL ON FUNCTION public.live_sharing_on(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.live_sharing_on(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "live_run_positions: mutual connections can read while live" ON public.live_run_positions;
CREATE POLICY "live_run_positions: mutual connections can read while live" ON public.live_run_positions
  FOR SELECT TO authenticated
  USING (
    updated_at > now() - interval '30 seconds'
    AND public.live_sharing_on(user_id)
    AND EXISTS (SELECT 1 FROM public.followers f WHERE f.follower_id = auth.uid() AND f.following_id = live_run_positions.user_id)
    AND EXISTS (SELECT 1 FROM public.followers f WHERE f.follower_id = live_run_positions.user_id AND f.following_id = auth.uid())
    AND NOT public.is_blocked_between(auth.uid(), live_run_positions.user_id)
  );

-- ── F7 ──────────────────────────────────────────────────────────────────────
DELETE FROM public.blocked_terms
 WHERE term IN ('dick', 'randi', 'lund', 'coon', 'coons', 'cum', 'paki', 'nude', 'nudity', 'sexy', 'raand', 'chod', 'gand');

-- ── F8 ──────────────────────────────────────────────────────────────────────
-- Same bands as the app's tierForArea (packages/shared/src/engine/runEngine.ts).
CREATE OR REPLACE FUNCTION public.tier_for_area(m2 double precision) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  SELECT CASE
    WHEN m2 IS NULL OR m2 <= 0 THEN NULL
    WHEN m2 < 5000   THEN 'patch'
    WHEN m2 < 50000  THEN 'block'
    WHEN m2 < 200000 THEN 'district'
    WHEN m2 < 500000 THEN 'quarter'
    ELSE 'domain'
  END;
$$;

CREATE OR REPLACE FUNCTION public.feed_post_server_stats() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  NEW.created_at := now();     -- a post can't be dated into the future (or past)
  NEW := public.feed_post_with_server_stats(NEW);
  IF COALESCE(NEW.post_type, 'run') = 'run' THEN
    -- The tier of the area this run claimed (the same number the post shows).
    NEW.territory_tier := public.tier_for_area(NEW.territory_area_m2);
  END IF;
  RETURN NEW;
END $$;


-- ════════════════════════════════════════════════════════════════════════
-- 022_backend_hardening
-- ════════════════════════════════════════════════════════════════════════

-- ============================================================
-- Backend hardening before the public launch (security audit 2026-11-24)
-- ============================================================
-- 1. Block and mute lists were readable by anyone. hidden_user_ids(uuid) and
--    leaderboard_circle(uuid, text) take ANY runner's id and are SECURITY
--    DEFINER, but the squashed grants left them executable by `anon`
--    (and not by `authenticated`). An anonymous caller could ask who a runner
--    blocked, was blocked by, or muted. Server-side callers only.
-- 2. The one RLS policy that used hidden_user_ids directly
--    (event_participants, migration 020) would fail with "permission denied
--    for function" for signed-in runners, because they cannot execute it.
--    It now goes through is_hidden_from_me(), which is bound to the caller.
-- 3. public_route_for(user, points, hidden) was executable by anyone and drops
--    the points near THAT user's privacy places: probing it with test points
--    locates a runner's home. Only the feed_posts route trigger needs it, so
--    that trigger becomes SECURITY DEFINER and clients lose access.
-- 4. sync_energy(uuid) let anyone reset any runner's energy regeneration clock.
--    No client calls it.
-- 5. is_blocked_between() had no reason to be callable anonymously.
-- 6. personal_records were readable by anyone, including anonymous callers and
--    runners with a private profile. Same rule as user_awards (migration 020).
-- 7. Table privileges: RLS is the only barrier, so remove what clients never
--    need (TRUNCATE is not subject to RLS; anon never writes).
SET check_function_bodies = false;
SET client_min_messages = warning;
SET search_path = public, extensions;

-- ── 1. Block / mute lists: server-side only ───────────────────────────
REVOKE ALL ON FUNCTION public.hidden_user_ids(p_viewer uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hidden_user_ids(p_viewer uuid) TO service_role;

REVOKE ALL ON FUNCTION public.leaderboard_circle(p_viewer uuid, p_circle text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_circle(p_viewer uuid, p_circle text) TO service_role;

-- ── 2. A caller-bound wrapper for policies ────────────────────────────
CREATE OR REPLACE FUNCTION public.is_hidden_from_me(p_other uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public, extensions
    AS $$
  SELECT p_other IS NOT NULL
     AND auth.uid() IS NOT NULL
     AND p_other IN (SELECT public.hidden_user_ids(auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.is_hidden_from_me(p_other uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_hidden_from_me(p_other uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "event_participants: signed-in, not hidden" ON public.event_participants;
CREATE POLICY "event_participants: signed-in, not hidden" ON public.event_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR NOT public.is_hidden_from_me(user_id));

-- ── 3. Privacy-place oracle ───────────────────────────────────────────
-- blur_feed_post_route() (BEFORE INSERT/UPDATE trigger on feed_posts) was the
-- only caller and ran as the signed-in runner; as SECURITY DEFINER it keeps
-- working once the runner can no longer execute public_route_for().
ALTER FUNCTION public.blur_feed_post_route() SECURITY DEFINER;
ALTER FUNCTION public.blur_feed_post_route() SET search_path = public, extensions;
REVOKE ALL ON FUNCTION public.blur_feed_post_route() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.public_route_for(p_user uuid, p_points jsonb, p_post_hidden boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_route_for(p_user uuid, p_points jsonb, p_post_hidden boolean) TO service_role;

-- ── 4. Energy clock ───────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.sync_energy(p_user_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_energy(p_user_id uuid) TO service_role;

-- ── 5. Block lookups: signed-in callers only (policies need authenticated) ──
REVOKE ALL ON FUNCTION public.is_blocked_between(a uuid, b uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(a uuid, b uuid) TO authenticated, service_role;

-- ── 6. Personal records follow the profile's visibility ───────────────
DROP POLICY IF EXISTS pr_read ON public.personal_records;
CREATE POLICY "personal_records: visible with the profile" ON public.personal_records FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_view_profile(auth.uid(), user_id, public.profile_visibility_of(user_id)));
REVOKE ALL ON public.personal_records FROM anon;

-- ── 7. Table privileges ───────────────────────────────────────────────
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM authenticated;


-- ════════════════════════════════════════════════════════════════════════
-- 023_live_db_fixes
-- ════════════════════════════════════════════════════════════════════════

-- Fixes from the live-database audit (24 Nov 2026): holes that only show in the
-- built database, each proven by an impersonated attempt (audit/blind_db.md).
--  B1  shoe_stats view bypassed RLS: anyone could read every runner's shoes.
--  B2  leaderboard_weekly view bypassed RLS: anyone saw every runner's weekly stats,
--      private profiles and minors included. No client uses it.
--  B3  Joining an open club never checked the role: anyone could join as owner.
--  B4  feed_post_with_server_stats returned another runner's private run stats.
--  B5  is_blocked_between / can_view_profile / can_view_post took any two ids:
--      signed-in runners could learn who blocked whom. Caller-bound wrappers now.
--  M1  Follow/comment/join/report spam fanned out to push calls: hourly limits.
--  M2  Exact last_known_location could be recovered: stored as a ~1 km cell.
--  M3  kudos were readable by anyone.
--  M4  New functions defaulted to EXECUTE for anon; 74 SECURITY DEFINER functions
--      were callable without signing in.
SET search_path = public, extensions;

-- B1 shoe_stats: run as the caller so shoes/runs RLS applies
ALTER VIEW public.shoe_stats SET (security_invoker = on);
REVOKE ALL ON public.shoe_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.shoe_stats TO authenticated, service_role;

-- B2 leaderboard_weekly: unused by clients; run as caller and close it
ALTER VIEW public.leaderboard_weekly SET (security_invoker = on);
REVOKE ALL ON public.leaderboard_weekly FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.leaderboard_weekly TO service_role;

-- B3 club_members: self-join of an open club is always role 'member'
DROP POLICY "club_members: self can join open clubs" ON public.club_members;
CREATE POLICY "club_members: self can join open clubs" ON public.club_members FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role = 'member'
              AND EXISTS (SELECT 1 FROM public.clubs WHERE clubs.id = club_members.club_id AND clubs.join_policy = 'open'));

-- M1 feed_post_with_server_stats: only for your own row
CREATE OR REPLACE FUNCTION public.feed_post_with_server_stats(new feed_posts)
 RETURNS feed_posts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_run    public.runs%ROWTYPE;
  v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not your post' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(NEW.post_type, 'run') NOT IN ('run', 'milestone') THEN
    RAISE EXCEPTION 'this kind of post is written by the server' USING ERRCODE = 'insufficient_privilege';
  END IF;

  NEW.likes := 0;
  NEW.comment_count := 0;
  NEW.stolen_from_username := NULL;
  NEW.stolen_from_user_id := NULL;
  NEW.stolen_area_m2 := NULL;
  NEW.stolen_territory_id := NULL;
  NEW.zone_tier := NULL;
  NEW.runner_rank := (SELECT runner_rank FROM public.profiles WHERE id = NEW.user_id);

  IF COALESCE(NEW.post_type, 'run') = 'run' THEN
    SELECT * INTO v_run FROM public.runs WHERE id = NEW.run_id;
    IF NOT FOUND OR v_run.user_id IS DISTINCT FROM NEW.user_id THEN
      RAISE EXCEPTION 'a run post needs one of your own synced runs' USING ERRCODE = 'insufficient_privilege';
    END IF;
    SELECT result INTO v_result FROM public.run_processing WHERE run_id = NEW.run_id;
    NEW.distance_km   := round(v_run.distance_m / 1000.0, 3);
    NEW.duration_sec  := v_run.duration_sec;
    NEW.avg_pace      := v_run.avg_pace;
    NEW.activity_type := v_run.activity_type;
    NEW.pace_earned   := GREATEST(COALESCE((v_result ->> 'paceAdjustment')::numeric, 0), 0)::int;
    NEW.territories_claimed := COALESCE((v_result ->> 'newZonesClaimed')::int, 0);
    IF COALESCE((v_result ->> 'claimedAreaM2')::numeric, 0) > 0 THEN
      NEW.territory_area_m2 := (v_result ->> 'claimedAreaM2')::numeric;
    ELSE
      NEW.territory_area_m2 := NULL;
      NEW.territory_tier := NULL;
    END IF;
  ELSE
    -- Milestone: "my territory reached a new tier". Numbers from the zones held now.
    NEW.run_id := NULL;
    NEW.distance_km := 0;
    NEW.pace_earned := 0;
    NEW.territories_claimed := 0;
    SELECT COALESCE(sum(area_m2), 0) INTO NEW.territory_area_m2 FROM public.territory_polygons WHERE owner_id = NEW.user_id;
    IF NEW.territory_tier IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM public.territory_polygons WHERE owner_id = NEW.user_id AND tier = NEW.territory_tier) THEN
      RAISE EXCEPTION 'you do not hold a zone of that tier' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- M2 caller-bound wrappers; the 3-arg helpers become server-only
CREATE OR REPLACE FUNCTION public.blocked_with_me(p_other uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT auth.uid() IS NOT NULL AND public.is_blocked_between(auth.uid(), p_other) $$;
CREATE OR REPLACE FUNCTION public.i_can_view_profile(p_owner uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT public.can_view_profile(auth.uid(), p_owner, public.profile_visibility_of(p_owner)) $$;
CREATE OR REPLACE FUNCTION public.i_can_view_profile_vis(p_owner uuid, p_visibility text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT public.can_view_profile(auth.uid(), p_owner, p_visibility) $$;
CREATE OR REPLACE FUNCTION public.i_can_view_post(p_author uuid, p_visibility text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT public.can_view_post(auth.uid(), p_author, p_visibility) $$;
REVOKE ALL ON FUNCTION public.blocked_with_me(uuid), public.i_can_view_profile(uuid),
  public.i_can_view_profile_vis(uuid, text), public.i_can_view_post(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.blocked_with_me(uuid), public.i_can_view_profile(uuid),
  public.i_can_view_profile_vis(uuid, text), public.i_can_view_post(uuid, text) TO authenticated, service_role;

ALTER POLICY "feed_posts: visible to viewer" ON public.feed_posts USING (public.i_can_view_post(user_id, visibility));
ALTER POLICY "feed_post_comments: viewers of the post read" ON public.feed_post_comments USING (
  ((user_id = auth.uid()) OR (hidden_at IS NULL)) AND NOT public.blocked_with_me(user_id)
  AND EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = feed_post_comments.post_id AND public.i_can_view_post(p.user_id, p.visibility)));
ALTER POLICY "followers: visible edges" ON public.followers USING (
  follower_id = auth.uid() OR following_id = auth.uid()
  OR (public.i_can_view_profile(following_id) AND public.i_can_view_profile(follower_id)));
ALTER POLICY "user_awards: visible with the profile" ON public.user_awards USING (user_id = auth.uid() OR public.i_can_view_profile(user_id));
ALTER POLICY "personal_records: visible with the profile" ON public.personal_records USING (user_id = auth.uid() OR public.i_can_view_profile(user_id));
ALTER POLICY "live_run_positions: mutual connections can read while live" ON public.live_run_positions USING (
  updated_at > now() - interval '30 seconds' AND public.live_sharing_on(user_id)
  AND EXISTS (SELECT 1 FROM public.followers f WHERE f.follower_id = auth.uid() AND f.following_id = live_run_positions.user_id)
  AND EXISTS (SELECT 1 FROM public.followers f WHERE f.follower_id = live_run_positions.user_id AND f.following_id = auth.uid())
  AND NOT public.blocked_with_me(user_id));
ALTER POLICY "lobby_messages: participants can read" ON public.lobby_messages USING (
  NOT public.blocked_with_me(user_id) AND public.can_use_lobby(lobby_id, auth.uid()));
ALTER POLICY "feed: readable with the post" ON storage.objects USING (
  bucket_id = 'feed' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (
    SELECT 1 FROM public.feed_posts fp
     WHERE fp.run_id::text = (storage.foldername(objects.name))[2]
       AND fp.user_id::text = (storage.foldername(objects.name))[1]
       AND public.i_can_view_post(fp.user_id, fp.visibility))));
-- profiles_public: same columns; uses the wrapper, hides the row from blocked pairs
CREATE OR REPLACE VIEW public.profiles_public WITH (security_invoker = off) AS
 SELECT p.id, p.username, p.display_name, p.avatar_url, p.avatar_color,
    CASE WHEN v.ok THEN p.bio END AS bio, CASE WHEN v.ok THEN p.location END AS location,
    CASE WHEN v.ok THEN p.instagram END AS instagram, CASE WHEN v.ok THEN p.strava END AS strava,
    p.level, p.runner_rank, p.territory_score, p.pace_total_earned,
    (CASE WHEN v.ok THEN p.total_distance_km END)::numeric(10,3) AS total_distance_km,
    CASE WHEN v.ok THEN p.total_runs END AS total_runs,
    CASE WHEN v.ok THEN p.total_territories_claimed END AS total_territories_claimed,
    CASE WHEN v.ok THEN p.streak_days END AS streak_days,
    CASE WHEN v.ok THEN p.follower_count END AS follower_count,
    CASE WHEN v.ok THEN p.following_count END AS following_count,
    p.country,
    CASE WHEN v.ok THEN p.unlocked_achievements END AS unlocked_achievements,
    CASE WHEN v.ok THEN p.pinned_run_id END AS pinned_run_id,
    p.created_at
   FROM public.profiles p
   CROSS JOIN LATERAL (SELECT auth.role() = 'service_role' OR public.i_can_view_profile_vis(p.id, p.profile_visibility) AS ok) v
  WHERE auth.role() = 'service_role' OR p.id = auth.uid() OR NOT public.blocked_with_me(p.id);

REVOKE EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_view_post(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid), public.can_view_profile(uuid, uuid, text),
  public.can_view_post(uuid, uuid, text) TO service_role;

-- M3 kudos: not read by any client; stop anon reading private users' interactions/run ids
DROP POLICY "kudos: anyone can read" ON public.kudos;
CREATE POLICY "kudos: either side reads" ON public.kudos FOR SELECT TO authenticated
  USING (from_id = auth.uid() OR to_id = auth.uid());
REVOKE SELECT ON public.kudos FROM anon;

-- M4 notification spam (follow / comment / join-request / self-insert -> pg_net push)
CREATE OR REPLACE FUNCTION public.notify_follow() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE follower_name text;
BEGIN
  SELECT username INTO follower_name FROM public.profiles WHERE id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, type, title, body, action_url, dedupe_key)
  VALUES (NEW.following_id, 'follow', follower_name || ' started following you',
          'Check out their profile and follow back!', '/profile/' || NEW.follower_id::text,
          'follow:' || NEW.follower_id::text || ':' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD'))
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END $$;

CREATE TABLE IF NOT EXISTS public.rate_events (
  user_id uuid NOT NULL, kind text NOT NULL, at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS rate_events_user_kind_at ON public.rate_events (user_id, kind, at);
ALTER TABLE public.rate_events ENABLE ROW LEVEL SECURITY;            -- no policies: server only
REVOKE ALL ON public.rate_events FROM PUBLIC, anon, authenticated;
-- Counts attempts in a log (not live rows), so insert/delete cycling cannot reset it.
CREATE OR REPLACE FUNCTION public.limit_user_writes() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_max int := TG_ARGV[0]::int;
BEGIN
  IF v_uid IS NULL OR auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF (SELECT count(*) FROM public.rate_events
       WHERE user_id = v_uid AND kind = TG_TABLE_NAME AND at > now() - interval '1 hour') >= v_max THEN
    RAISE EXCEPTION 'rate limited' USING ERRCODE = '54000';
  END IF;
  INSERT INTO public.rate_events (user_id, kind) VALUES (v_uid, TG_TABLE_NAME);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.limit_user_writes() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER a_rate_limit BEFORE INSERT ON public.feed_post_comments FOR EACH ROW EXECUTE FUNCTION public.limit_user_writes('60');
CREATE TRIGGER a_rate_limit BEFORE INSERT ON public.follow_requests    FOR EACH ROW EXECUTE FUNCTION public.limit_user_writes('30');
CREATE TRIGGER a_rate_limit BEFORE INSERT ON public.club_join_requests FOR EACH ROW EXECUTE FUNCTION public.limit_user_writes('10');
CREATE TRIGGER a_rate_limit BEFORE INSERT ON public.post_reports       FOR EACH ROW EXECUTE FUNCTION public.limit_user_writes('20');
CREATE TRIGGER a_rate_limit BEFORE INSERT ON public.followers          FOR EACH ROW EXECUTE FUNCTION public.limit_user_writes('60');
CREATE TRIGGER a_rate_limit BEFORE INSERT ON public.group_challenges   FOR EACH ROW EXECUTE FUNCTION public.limit_user_writes('5');
-- clients never insert notifications (service role and SECURITY DEFINER triggers do)
DROP POLICY "notifications: self or service role insert" ON public.notifications;
REVOKE INSERT ON public.notifications FROM anon, authenticated;

-- M5 location oracle: store only the ~1 km cell the app promises
CREATE OR REPLACE FUNCTION public.snap_last_known_location() RETURNS trigger
  LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
  IF NEW.last_known_location IS NOT NULL THEN
    NEW.last_known_location := ST_SetSRID(ST_MakePoint(round(ST_X(NEW.last_known_location)::numeric, 2),
                                                       round(ST_Y(NEW.last_known_location)::numeric, 2)), 4326);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_snap_location BEFORE INSERT OR UPDATE OF last_known_location ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.snap_last_known_location();
UPDATE public.profiles SET last_known_location = last_known_location WHERE last_known_location IS NOT NULL;

-- M6 default EXECUTE for future functions; anon loses every SECURITY DEFINER fn except the landing-page one
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
DO $$ DECLARE f regprocedure; BEGIN
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p
            WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
              AND p.proname NOT IN ('city_runner_count')
              AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f); END LOOP;
END $$;

-- Explicit per-function privileges (house rule; scripts/lint-migrations.mjs).
-- The feed_posts trigger runs as the runner and calls this, so runners keep EXECUTE;
-- the check at the top of the function is what stops use on someone else's row.
REVOKE ALL ON FUNCTION public.feed_post_with_server_stats(public.feed_posts) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.feed_post_with_server_stats(public.feed_posts) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.notify_follow() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.i_can_view_profile(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.i_can_view_profile_vis(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.i_can_view_post(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.i_can_view_profile(uuid), public.i_can_view_profile_vis(uuid, text),
  public.i_can_view_post(uuid, text) TO authenticated, service_role;


-- ════════════════════════════════════════════════════════════════════════
-- 024_partner_status_gate
-- ════════════════════════════════════════════════════════════════════════

-- Brand status gates its rewards (found by supabase/tests/partner_journey.test.sql).
-- Before this, pausing, ending or rejecting a partner in the admin changed only
-- the partners row: its rewards stayed listed and redeemable in the app, so a
-- brand that had stopped honouring codes kept getting redemptions. Rewards
-- without a partner (Runivo's own) are unaffected.

CREATE OR REPLACE FUNCTION public.reward_partner_live(p_partner_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT p_partner_id IS NULL
      OR EXISTS (SELECT 1 FROM partners WHERE id = p_partner_id AND status = 'active');
$$;
REVOKE ALL ON FUNCTION public.reward_partner_live(uuid) FROM PUBLIC, anon, authenticated, service_role;
-- authenticated needs it for the rewards_public_read policy below.
GRANT EXECUTE ON FUNCTION public.reward_partner_live(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reward_block_reason(p_reward_id uuid, p_user_id uuid, p_check_balance boolean DEFAULT true, p_now timestamp with time zone DEFAULT now(), p_point geometry DEFAULT NULL::geometry)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r  pace_store_rewards%ROWTYPE;
  p  record;
  v_city text;
BEGIN
  SELECT * INTO r FROM pace_store_rewards WHERE id = p_reward_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  SELECT id, pace_balance, created_at, total_runs, runner_rank, subscription_tier, country, last_known_location
    INTO p FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN 'profile_not_found'; END IF;

  IF r.status <> 'available' THEN
    RETURN CASE r.status WHEN 'sold_out' THEN 'sold_out' ELSE 'not_available' END;
  END IF;
  -- A brand that isn't active (applied, paused, ended, rejected) has nothing on offer.
  IF NOT public.reward_partner_live(r.partner_id) THEN RETURN 'not_available'; END IF;
  IF r.starts_at IS NOT NULL AND r.starts_at > p_now THEN RETURN 'not_started'; END IF;
  IF r.expires_at IS NOT NULL AND r.expires_at <= p_now THEN RETURN 'expired'; END IF;

  IF r.countries IS NOT NULL AND cardinality(r.countries) > 0
     AND (p.country IS NULL OR NOT (p.country = ANY (r.countries))) THEN
    RETURN 'not_in_region';
  END IF;
  IF r.cities IS NOT NULL AND cardinality(r.cities) > 0 THEN
    -- Where the runner has actually run (scored runs, last 30 days), not where
    -- the phone says it is: p_point and last_known_location both come from the app.
    IF NOT (r.cities && public.runner_recent_cities(p_user_id, p_now)) THEN
      RETURN 'not_in_region';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pace_redemptions WHERE user_id = p_user_id AND reward_id = p_reward_id) THEN
    RETURN 'already_redeemed';
  END IF;

  IF r.plus_only AND public.effective_tier(p.subscription_tier) NOT IN ('premium', 'admin') THEN
    RETURN 'plus_only';
  END IF;
  IF r.min_rank IS NOT NULL AND rank_index(p.runner_rank) < rank_index(r.min_rank) THEN
    RETURN 'rank_locked';
  END IF;
  IF p.created_at > p_now - interval '14 days' OR COALESCE(p.total_runs, 0) < 3 THEN
    RETURN 'new_account';
  END IF;

  IF r.stock IS NOT NULL AND r.stock <= 0 THEN RETURN 'sold_out'; END IF;
  IF r.code_mode = 'pool'
     AND NOT EXISTS (SELECT 1 FROM reward_codes WHERE reward_id = r.id AND assigned_to IS NULL) THEN
    RETURN 'sold_out';
  END IF;

  IF p_check_balance AND COALESCE(p.pace_balance, 0) < r.pace_cost THEN
    RETURN 'not_enough_pace';
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.store_catalog(p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision)
 RETURNS TABLE(id uuid, brand text, title text, description text, pace_cost integer, tier text, brand_color text, brand_initial text, value_label text, category text, status text, sort_order integer, starts_at timestamp with time zone, expires_at timestamp with time zone, plus_only boolean, min_rank text, stock_left integer, lock_reason text, redeemed boolean, my_code text, how_to_use text)
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
         CASE WHEN red.id IS NOT NULL THEN r.how_to_use END
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

REVOKE ALL ON FUNCTION public.reward_block_reason(p_reward_id uuid, p_user_id uuid, p_check_balance boolean, p_now timestamp with time zone, p_point public.geometry) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.reward_block_reason(p_reward_id uuid, p_user_id uuid, p_check_balance boolean, p_now timestamp with time zone, p_point public.geometry) TO service_role;
REVOKE ALL ON FUNCTION public.store_catalog(p_lat double precision, p_lng double precision) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.store_catalog(p_lat double precision, p_lng double precision) TO authenticated;
GRANT ALL ON FUNCTION public.store_catalog(p_lat double precision, p_lng double precision) TO service_role;

-- The app's fallback reads the table directly: same rule there.
ALTER POLICY rewards_public_read ON public.pace_store_rewards
  USING (status <> 'hidden' AND public.reward_partner_live(partner_id));


-- ════════════════════════════════════════════════════════════════════════
-- 025_waitlist
-- ════════════════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════════════════
-- 026_partner_application_minimal
-- ════════════════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════════════════
-- 027_pause_breaks
-- ════════════════════════════════════════════════════════════════════════

-- Pauses split the trail (runEngine ENGINE.PAUSE_BREAK_M, EnginePoint.brk).
-- The app marks the first GPS point after a pause with "brk": true. The stretch
-- into that point is never distance or ground (the engine skips it), so the
-- integrity check must not judge it either: pausing, riding 2 km and resuming
-- used to read as a "vehicle" run. Marking points this way only ever removes
-- distance and ground, so a client gains nothing by setting it.

CREATE OR REPLACE FUNCTION public.run_integrity_reason(points jsonb, activity text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  pt jsonb; plat float8; plng float8; pts float8; lat float8; lng float8; ts float8;
  a float8; d float8; dt float8; fast_m float8 := 0;
  on_foot boolean := COALESCE(activity, 'run') IN ('run', 'trail_run', 'trail', 'walk', 'hike');
BEGIN
  IF jsonb_typeof(points) IS DISTINCT FROM 'array' THEN RETURN NULL; END IF;
  FOR pt IN SELECT * FROM jsonb_array_elements(points) LOOP
    lat := (pt->>'lat')::float8; lng := (pt->>'lng')::float8; ts := (pt->>'timestamp')::float8;
    IF lat IS NULL OR lng IS NULL THEN CONTINUE; END IF;
    -- The first point after a pause: no comparison with the point before it.
    IF plat IS NOT NULL AND (pt->>'brk') IS DISTINCT FROM 'true' THEN
      a := sin(radians(lat - plat) / 2) ^ 2 + cos(radians(plat)) * cos(radians(lat)) * sin(radians(lng - plng) / 2) ^ 2;
      d := 6371000 * 2 * atan2(sqrt(a), sqrt(1 - a));
      dt := CASE WHEN ts IS NOT NULL AND pts IS NOT NULL AND ts > pts THEN (ts - pts) / 1000.0 ELSE NULL END;
      IF (dt IS NULL AND d >= 1000) OR (dt IS NOT NULL AND d >= 250 AND d / dt >= 15) THEN
        RETURN 'teleport';
      END IF;
      IF on_foot AND dt IS NOT NULL AND d / dt > 8 THEN
        fast_m := fast_m + d;
        IF fast_m >= 1000 THEN RETURN 'vehicle'; END IF;
      END IF;
    END IF;
    plat := lat; plng := lng; pts := ts;
  END LOOP;
  RETURN NULL;
END;
$$;


-- ════════════════════════════════════════════════════════════════════════
-- 028_sponsored_partner_gate
-- ════════════════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════════════════
-- 029_profile_insert_guard
-- ════════════════════════════════════════════════════════════════════════

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
