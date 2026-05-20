-- Migration: 013_add_indexes.sql
--
-- Add indexes for the columns we filter and join on most frequently. All
-- indexes use IF NOT EXISTS so this migration is safe to re-run, and
-- existing indexes (e.g. idx_reminder_exceptions_reminder_id from migration
-- 003 and idx_net_worth_snapshots_user_date from migration 004) are not
-- duplicated.
--
-- Naming convention: idx_<table>_<columns>.

-- =============================================================================
-- movements
-- =============================================================================
-- Most movement queries filter by account, pocket, or sub_pocket and by the
-- pending/orphaned flags, so indexing each access path noticeably improves
-- the listing and balance-recalculation triggers.
CREATE INDEX IF NOT EXISTS idx_movements_user_id        ON movements (user_id);
CREATE INDEX IF NOT EXISTS idx_movements_account_id     ON movements (account_id);
CREATE INDEX IF NOT EXISTS idx_movements_pocket_id      ON movements (pocket_id);
CREATE INDEX IF NOT EXISTS idx_movements_sub_pocket_id  ON movements (sub_pocket_id);
CREATE INDEX IF NOT EXISTS idx_movements_is_pending     ON movements (is_pending);
CREATE INDEX IF NOT EXISTS idx_movements_is_orphaned    ON movements (is_orphaned);

-- =============================================================================
-- pockets
-- =============================================================================
-- The main access pattern is "list pockets in this account" plus the
-- balance trigger's join on account_id.
CREATE INDEX IF NOT EXISTS idx_pockets_account_id ON pockets (account_id);
CREATE INDEX IF NOT EXISTS idx_pockets_user_id    ON pockets (user_id);

-- =============================================================================
-- sub_pockets
-- =============================================================================
-- Sub-pockets are listed by parent pocket and by group on the budget page.
CREATE INDEX IF NOT EXISTS idx_sub_pockets_pocket_id ON sub_pockets (pocket_id);
CREATE INDEX IF NOT EXISTS idx_sub_pockets_group_id  ON sub_pockets (group_id);
CREATE INDEX IF NOT EXISTS idx_sub_pockets_user_id   ON sub_pockets (user_id);

-- =============================================================================
-- budget_entries
-- =============================================================================
-- Always loaded as "all entries for this user", so user_id is the primary
-- access path.
CREATE INDEX IF NOT EXISTS idx_budget_entries_user_id ON budget_entries (user_id);

-- =============================================================================
-- movement_templates
-- =============================================================================
-- Templates are listed per user; no other access path today.
CREATE INDEX IF NOT EXISTS idx_movement_templates_user_id ON movement_templates (user_id);
