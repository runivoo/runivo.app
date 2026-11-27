-- Table access for the API roles. Every migration here was written for a Supabase
-- project that grants anon, authenticated and service_role full table access by
-- default and then takes away what they shouldn't have (the REVOKEs below). New
-- Supabase projects no longer grant that by default, so on the new project
-- (uneotxtbsnnhytuqsuwd) every table answered "permission denied": the admin page
-- couldn't read the admin's own profile and the waitlist couldn't save signups.
--
-- This grants the old defaults, then replays every table REVOKE/GRANT from
-- migrations 001-028 in order, so the result matches what those migrations
-- produce on a project with the old defaults. Row-level security still decides
-- which rows each role sees. Function access is untouched.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Replayed, in migration order.
-- from 001_base.sql
REVOKE ALL ON TABLE public.app_settings FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE public.app_settings TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE public.app_settings TO authenticated;
GRANT ALL ON TABLE public.app_settings TO service_role;
-- from 002_accounts.sql
REVOKE ALL ON TABLE public.device_connections FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE ON TABLE public.device_connections TO authenticated;
GRANT ALL ON TABLE public.device_connections TO service_role;
GRANT SELECT(id) ON TABLE public.device_connections TO authenticated;
GRANT SELECT(user_id),INSERT(user_id) ON TABLE public.device_connections TO authenticated;
GRANT SELECT(device_type),INSERT(device_type) ON TABLE public.device_connections TO authenticated;
GRANT SELECT(status),INSERT(status),UPDATE(status) ON TABLE public.device_connections TO authenticated;
GRANT SELECT(last_sync_at),INSERT(last_sync_at),UPDATE(last_sync_at) ON TABLE public.device_connections TO authenticated;
GRANT SELECT(error_message),INSERT(error_message),UPDATE(error_message) ON TABLE public.device_connections TO authenticated;
GRANT SELECT(metadata),INSERT(metadata),UPDATE(metadata) ON TABLE public.device_connections TO authenticated;
GRANT SELECT(created_at) ON TABLE public.device_connections TO authenticated;
GRANT SELECT(updated_at) ON TABLE public.device_connections TO authenticated;
-- from 003_moderation.sql
REVOKE ALL ON TABLE public.blocked_terms FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON TABLE public.blocked_terms TO service_role;
REVOKE ALL ON TABLE public.content_reports FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON TABLE public.content_reports TO service_role;
REVOKE ALL ON TABLE public.user_bans FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_bans TO service_role;
-- from 004_runs.sql
REVOKE ALL ON TABLE public.run_cheers FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.run_cheers TO authenticated;
GRANT ALL ON TABLE public.run_cheers TO service_role;
-- from 005_territory.sql
REVOKE ALL ON TABLE public.city_runner_counts FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON TABLE public.city_runner_counts TO service_role;
-- from 006_pace.sql
REVOKE ALL ON TABLE public.referrals FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE public.referrals TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE public.referrals TO authenticated;
GRANT ALL ON TABLE public.referrals TO service_role;
-- from 008_social.sql
REVOKE ALL ON TABLE public.profiles_public FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles_public TO authenticated;
GRANT ALL ON TABLE public.profiles_public TO service_role;
-- from 010_clubs.sql
REVOKE ALL ON TABLE public.club_locations FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON TABLE public.club_locations TO service_role;
-- from 019_privacy_fixes.sql
REVOKE SELECT ON TABLE public.feed_post_comments FROM anon;
-- from 020_social_fixes.sql
REVOKE ALL ON public.followers FROM anon;
REVOKE ALL ON public.follow_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.follow_requests TO authenticated;
GRANT ALL ON public.follow_requests TO service_role;
REVOKE ALL ON public.club_invites FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.club_invites TO service_role;
REVOKE ALL ON public.user_awards FROM anon;
REVOKE ALL ON public.club_join_requests FROM anon;
REVOKE ALL ON public.event_participants FROM anon;
REVOKE UPDATE ON public.clubs FROM authenticated, anon;
GRANT UPDATE (name, description, badge_emoji, join_policy, avatar_url, banner_url) ON public.clubs TO authenticated;
REVOKE INSERT, DELETE ON public.feed_post_likes FROM authenticated, anon;
-- from 022_backend_hardening.sql
REVOKE ALL ON public.personal_records FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM authenticated;
-- from 023_live_db_fixes.sql
REVOKE ALL ON public.shoe_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.shoe_stats TO authenticated, service_role;
REVOKE ALL ON public.leaderboard_weekly FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.leaderboard_weekly TO service_role;
REVOKE SELECT ON public.kudos FROM anon;
REVOKE ALL ON public.rate_events FROM PUBLIC, anon, authenticated;
REVOKE INSERT ON public.notifications FROM anon, authenticated;
-- from 025_waitlist.sql
REVOKE ALL ON TABLE public.waitlist FROM PUBLIC, anon, authenticated;
