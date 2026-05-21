-- Migration: Additional indexes for common query patterns

-- Composite index for movement listing by date (primary UI query)
CREATE INDEX IF NOT EXISTS idx_movements_user_date
ON movements (user_id, displayed_date DESC);

-- Composite index for balance trigger performance
CREATE INDEX IF NOT EXISTS idx_movements_pocket_not_pending
ON movements (pocket_id) WHERE is_pending = FALSE;

-- Account ordering queries
CREATE INDEX IF NOT EXISTS idx_accounts_user_order
ON accounts (user_id, display_order);

-- Reminder listing by due date
CREATE INDEX IF NOT EXISTS idx_reminders_user_due
ON reminders (user_id, due_date);
