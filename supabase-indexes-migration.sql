-- Performance Optimization: Add Composite Indexes
-- Run this in Supabase SQL Editor to add indexes to existing database
-- These indexes optimize common query patterns for better performance

-- Composite indexes for filtering by user + related entity
CREATE INDEX IF NOT EXISTS idx_pockets_user_account ON pockets(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_sub_pockets_user_pocket ON sub_pockets(user_id, pocket_id);
CREATE INDEX IF NOT EXISTS idx_movements_user_account ON movements(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_movements_user_pocket ON movements(user_id, pocket_id);

-- Composite index for movements sorted by date (DESC for recent first)
CREATE INDEX IF NOT EXISTS idx_movements_user_date ON movements(user_id, displayed_date DESC);

-- Composite indexes for display order queries
CREATE INDEX IF NOT EXISTS idx_accounts_user_display ON accounts(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_pockets_user_display ON pockets(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_sub_pockets_user_display ON sub_pockets(user_id, display_order);

-- Verify indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
