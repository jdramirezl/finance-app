-- One-time data fix: Recalculate all balances after trigger NULL-safety fix (migration 014).
-- The old trigger used `NEW.is_pending = TRUE` which failed for NULL values,
-- causing some non-pending movements to not update balances correctly.
-- This migration recomputes all balances from scratch to correct any drift.
-- Safe to run multiple times (idempotent).

-- Recalculate all pocket balances (excludes pending movements)
UPDATE pockets p
SET balance = (
    SELECT COALESCE(SUM(
        CASE
            WHEN m.type IN ('IngresoNormal', 'IngresoFijo', 'InvestmentIngreso') THEN m.amount
            ELSE -m.amount
        END
    ), 0)
    FROM movements m
    WHERE m.pocket_id = p.id
      AND (m.is_pending IS NULL OR m.is_pending = FALSE)
);

-- Recalculate all account balances from pocket sums
UPDATE accounts a
SET balance = (
    SELECT COALESCE(SUM(p.balance), 0)
    FROM pockets p
    WHERE p.account_id = a.id
);
