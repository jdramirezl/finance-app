-- Deduplicate: only one snapshot per user per calendar day.
-- Enables ON CONFLICT upsert semantics in the application layer.
CREATE UNIQUE INDEX IF NOT EXISTS idx_net_worth_snapshots_user_date
ON net_worth_snapshots (user_id, snapshot_date);
