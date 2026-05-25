-- Soft-delete (archive) support for accounts and pockets.
-- Existing rows remain NULL (active). No data is modified.

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE pockets ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Partial indexes for fast "active only" queries (the common case).
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts (user_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pockets_active ON pockets (account_id) WHERE archived_at IS NULL;

COMMENT ON COLUMN accounts.archived_at IS 'When non-NULL, the account is soft-deleted (archived). Movements still count toward totals.';
COMMENT ON COLUMN pockets.archived_at IS 'When non-NULL, the pocket is soft-deleted (archived). Movements still count toward totals.';
