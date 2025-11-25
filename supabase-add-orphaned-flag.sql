-- Migration: Add isOrphaned flag to movements table
-- This enables fast orphaned movement detection without expensive lookups

-- Add isOrphaned column to movements table
ALTER TABLE movements 
ADD COLUMN IF NOT EXISTS is_orphaned BOOLEAN DEFAULT FALSE;

-- Add index for fast filtering
CREATE INDEX IF NOT EXISTS idx_movements_is_orphaned 
ON movements(is_orphaned) 
WHERE is_orphaned = TRUE;

-- Add comment explaining the column
COMMENT ON COLUMN movements.is_orphaned IS 
'Marks movements whose account or pocket was deleted (soft delete). These movements are hidden from UI but preserved for audit trail.';

-- Optional: Mark existing orphaned movements
-- This finds movements where the account or pocket no longer exists
UPDATE movements m
SET is_orphaned = TRUE
WHERE is_orphaned = FALSE
  AND (
    NOT EXISTS (SELECT 1 FROM accounts a WHERE a.id = m.account_id AND a.user_id = m.user_id)
    OR
    NOT EXISTS (SELECT 1 FROM pockets p WHERE p.id = m.pocket_id AND p.user_id = m.user_id)
  );

-- Show results
SELECT 
  COUNT(*) FILTER (WHERE is_orphaned = TRUE) as orphaned_count,
  COUNT(*) FILTER (WHERE is_orphaned = FALSE) as active_count,
  COUNT(*) as total_count
FROM movements;
