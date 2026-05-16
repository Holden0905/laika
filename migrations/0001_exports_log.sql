-- Per-artifact export tracking. Drives the "EXPORTED" badge in the picker
-- and the "new only" default selection. The existing `exports` table stays
-- as the bulk-action header log (one row per download event); this table
-- adds one row per individual artifact included in a download.

CREATE TABLE IF NOT EXISTS exports_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  artifact_type text NOT NULL CHECK (artifact_type IN ('entry', 'response')),
  artifact_id uuid NOT NULL,
  exported_at timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup of "is this artifact exported for this user?" — drives the picker's badge.
CREATE INDEX IF NOT EXISTS exports_log_user_artifact_idx
  ON exports_log(user_id, artifact_type, artifact_id);

-- And a date-sorted index for showing the most recent export timestamp per artifact.
CREATE INDEX IF NOT EXISTS exports_log_user_recent_idx
  ON exports_log(user_id, exported_at DESC);

ALTER TABLE exports_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exports_log" ON exports_log
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own exports_log" ON exports_log
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own exports_log" ON exports_log
  FOR DELETE USING (user_id = auth.uid());

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
