-- Queued Directives — task list scoped per user.
-- - title required, length-bounded at the DB layer.
-- - completed_at + is_complete kept in sync via CHECK so the "completed" section
--   can sort by completed_at without worrying about orphaned timestamps.
-- - is_active gives us soft-delete; we never hard-delete directives.

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  is_complete boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tasks_title_nonempty CHECK (length(trim(title)) > 0),
  CONSTRAINT tasks_title_maxlen CHECK (length(title) <= 300),
  CONSTRAINT tasks_completed_at_consistent CHECK (
    (is_complete = true AND completed_at IS NOT NULL)
    OR (is_complete = false AND completed_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS tasks_user_active_idx
  ON tasks(user_id, is_active);

CREATE INDEX IF NOT EXISTS tasks_user_completed_idx
  ON tasks(user_id, completed_at DESC) WHERE completed_at IS NOT NULL;

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (user_id = auth.uid());

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
