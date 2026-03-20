-- Migration 023: Allow admins to delete daily checklist instances
--
-- The existing RLS policies cover SELECT, INSERT, and UPDATE but not DELETE.
-- This adds a DELETE policy so admins can remove checklist instances from the
-- review UI without hitting a permissions error.

CREATE POLICY "checklists_delete_admin"
  ON daily_checklists
  FOR DELETE
  USING (get_user_role() IN ('admin', 'super_admin'));
