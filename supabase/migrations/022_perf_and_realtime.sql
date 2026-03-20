-- Migration 022: Performance & realtime fixes
--
-- 1. Re-assert get_user_role() as STABLE so Postgres can cache it within a
--    single statement instead of re-evaluating per row in RLS policies.
-- 2. Add daily_checklists to the realtime publication so the existing
--    postgres_changes subscriptions in ChecklistReview and Checklists
--    actually receive events.

ALTER FUNCTION get_user_role() STABLE;

ALTER PUBLICATION supabase_realtime ADD TABLE daily_checklists;
