-- Add fields to store original account/pocket info for orphaned movements
-- This allows restoration when user recreates matching accounts
-- NOTE: We match by NAME+CURRENCY, not by ID (IDs change when recreated)

ALTER TABLE movements 
ADD COLUMN IF NOT EXISTS orphaned_account_name TEXT;

ALTER TABLE movements 
ADD COLUMN IF NOT EXISTS orphaned_account_currency TEXT;

ALTER TABLE movements 
ADD COLUMN IF NOT EXISTS orphaned_pocket_name TEXT;

-- Add comments
COMMENT ON COLUMN movements.orphaned_account_name IS 'Original account name (for matching + display)';
COMMENT ON COLUMN movements.orphaned_account_currency IS 'Original account currency (for matching)';
COMMENT ON COLUMN movements.orphaned_pocket_name IS 'Original pocket name (for matching + display)';

-- Example restoration query:
-- When user creates account "Savings" with currency "USD" and pocket "Emergency",
-- find orphaned movements that match and restore them:
-- 
-- UPDATE movements m
-- SET account_id = (SELECT id FROM accounts WHERE name = m.orphaned_account_name AND currency = m.orphaned_account_currency LIMIT 1),
--     pocket_id = (SELECT id FROM pockets WHERE name = m.orphaned_pocket_name AND account_id = m.account_id LIMIT 1),
--     is_orphaned = FALSE
-- WHERE is_orphaned = TRUE
--   AND orphaned_account_name = 'Savings'
--   AND orphaned_account_currency = 'USD'
--   AND orphaned_pocket_name = 'Emergency';
