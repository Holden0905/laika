-- Trajectories — long-horizon seeds and ambitions that accrete over time.
--
-- Distinct from directives (tasks): a trajectory is never "checked off," it
-- grows. Progress is the log, not a checkbox.
--
-- - `trajectories` is the container. status is a lifecycle, not a completion
--   flag — DORMANT is the resting state, not a failure.
-- - `trajectory_log` is append-only: SELECT/INSERT/DELETE policies but
--   deliberately NO UPDATE policy, so a logged entry can be removed but never
--   silently rewritten.
-- - `last_contact_at` starts at creation (making a trajectory is contact) and
--   is pushed forward by a trigger on every log insert.
-- - `tasks.trajectory_id` lets a directive hang off a trajectory. Nullable —
--   most directives are free-standing.

-- ─── trajectories ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trajectories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  summary text,
  status text NOT NULL DEFAULT 'DORMANT',
  last_contact_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trajectories_title_nonempty CHECK (length(trim(title)) > 0),
  CONSTRAINT trajectories_title_maxlen CHECK (length(title) <= 300),
  CONSTRAINT trajectories_summary_maxlen CHECK (summary IS NULL OR length(summary) <= 500),
  CONSTRAINT trajectories_status_valid CHECK (
    status IN ('DORMANT', 'ACTIVE', 'REACHED', 'ABANDONED')
  )
);

-- List page filters on is_active then buckets by status.
CREATE INDEX IF NOT EXISTS trajectories_user_active_idx
  ON trajectories(user_id, is_active, status);

-- T-### numbering is creation order, so this ordering is read on every list render.
CREATE INDEX IF NOT EXISTS trajectories_user_created_idx
  ON trajectories(user_id, created_at);

-- Deep Space Ping picks the least-recently-contacted candidates.
CREATE INDEX IF NOT EXISTS trajectories_user_contact_idx
  ON trajectories(user_id, last_contact_at);

CREATE TRIGGER trajectories_set_updated_at
  BEFORE UPDATE ON trajectories
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE trajectories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trajectories" ON trajectories
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own trajectories" ON trajectories
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own trajectories" ON trajectories
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own trajectories" ON trajectories
  FOR DELETE USING (user_id = auth.uid());

-- ─── trajectory_log ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trajectory_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  trajectory_id uuid NOT NULL REFERENCES trajectories(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trajectory_log_body_nonempty CHECK (length(trim(body)) > 0),
  CONSTRAINT trajectory_log_body_maxlen CHECK (length(body) <= 20000)
);

-- The detail page reads one trajectory's log newest-first.
CREATE INDEX IF NOT EXISTS trajectory_log_trajectory_created_idx
  ON trajectory_log(trajectory_id, created_at DESC);

CREATE INDEX IF NOT EXISTS trajectory_log_user_idx
  ON trajectory_log(user_id);

ALTER TABLE trajectory_log ENABLE ROW LEVEL SECURITY;

-- No UPDATE policy by design — the log is append-only.
CREATE POLICY "Users can view own trajectory_log" ON trajectory_log
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own trajectory_log" ON trajectory_log
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own trajectory_log" ON trajectory_log
  FOR DELETE USING (user_id = auth.uid());

-- Every log insert is "contact." GREATEST so an entry backdated below the
-- current value can never drag last_contact_at backwards.
CREATE OR REPLACE FUNCTION touch_trajectory_contact()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE trajectories
     SET last_contact_at = GREATEST(last_contact_at, NEW.created_at)
   WHERE id = NEW.trajectory_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trajectory_log_touch_contact
  AFTER INSERT ON trajectory_log
  FOR EACH ROW
  EXECUTE FUNCTION touch_trajectory_contact();

-- ─── trajectory_tags ─────────────────────────────────────────────────────────
-- Mirrors entry_tags exactly: composite PK, user_id carried for RLS.

CREATE TABLE IF NOT EXISTS trajectory_tags (
  trajectory_id uuid NOT NULL REFERENCES trajectories(id),
  tag_id uuid NOT NULL REFERENCES tags(id),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trajectory_id, tag_id)
);

CREATE INDEX IF NOT EXISTS trajectory_tags_tag_idx
  ON trajectory_tags(tag_id);

ALTER TABLE trajectory_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trajectory_tags" ON trajectory_tags
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own trajectory_tags" ON trajectory_tags
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own trajectory_tags" ON trajectory_tags
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own trajectory_tags" ON trajectory_tags
  FOR DELETE USING (user_id = auth.uid());

-- ─── tasks → trajectories ────────────────────────────────────────────────────
-- Nullable: a directive may stand alone or hang off a trajectory. No cascade —
-- soft-deleting a trajectory must never remove its directives.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS trajectory_id uuid REFERENCES trajectories(id);

CREATE INDEX IF NOT EXISTS tasks_trajectory_idx
  ON tasks(trajectory_id) WHERE trajectory_id IS NOT NULL;

-- ─── export tracking ─────────────────────────────────────────────────────────
-- Widen the artifact_type and scope vocabularies so trajectories can be
-- stamped in exports_log and counted in the bulk exports header.

ALTER TABLE exports_log DROP CONSTRAINT IF EXISTS exports_log_artifact_type_check;
ALTER TABLE exports_log ADD CONSTRAINT exports_log_artifact_type_check
  CHECK (artifact_type IN ('entry', 'response', 'trajectory'));

ALTER TABLE exports DROP CONSTRAINT IF EXISTS exports_scope_check;
ALTER TABLE exports ADD CONSTRAINT exports_scope_check
  CHECK (scope IN ('all', 'journal', 'reflections', 'trajectories'));

-- ─── grants ──────────────────────────────────────────────────────────────────

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
