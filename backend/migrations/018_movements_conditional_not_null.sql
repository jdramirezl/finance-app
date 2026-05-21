-- Non-orphaned movements must always reference a valid account and pocket.
-- Orphaned movements (from soft-deleted accounts) are allowed NULL references
-- since their parent entities no longer exist, but they still count in totals.

ALTER TABLE movements
ADD CONSTRAINT movements_require_account_when_active
    CHECK (is_orphaned = TRUE OR account_id IS NOT NULL);

ALTER TABLE movements
ADD CONSTRAINT movements_require_pocket_when_active
    CHECK (is_orphaned = TRUE OR pocket_id IS NOT NULL);
