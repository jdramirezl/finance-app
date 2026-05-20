-- Migration: 012_enable_rls.sql
--
-- Enable Row Level Security on every table that contains user-scoped data
-- and add policies enforcing that authenticated users can only see and
-- modify their own rows. This is idempotent: ENABLE ROW LEVEL SECURITY is a
-- no-op when already enabled, and policies are dropped before being
-- recreated so this can be re-run safely.
--
-- Policy strategy:
--   - User-scoped tables (have a user_id column): policy compares
--     auth.uid() to user_id.
--   - reminder_exceptions: no user_id column, so the policy joins back to
--     reminders to check ownership.
--   - exchange_rates: shared cache (not user-scoped). RLS is enabled and a
--     permissive policy lets any authenticated user read or write — service-
--     role inserts (the cache refresher) bypass RLS automatically.
--
-- Note: net_worth_snapshots already had RLS enabled by migration 004; the
-- DROP/CREATE pattern below covers it without breaking existing data.

-- =============================================================================
-- accounts
-- =============================================================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access own accounts" ON accounts;
CREATE POLICY "Users can only access own accounts" ON accounts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- pockets
-- =============================================================================
ALTER TABLE pockets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access own pockets" ON pockets;
CREATE POLICY "Users can only access own pockets" ON pockets
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- sub_pockets
-- =============================================================================
ALTER TABLE sub_pockets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access own sub_pockets" ON sub_pockets;
CREATE POLICY "Users can only access own sub_pockets" ON sub_pockets
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- movements
-- =============================================================================
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access own movements" ON movements;
CREATE POLICY "Users can only access own movements" ON movements
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- settings
-- =============================================================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access own settings" ON settings;
CREATE POLICY "Users can only access own settings" ON settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- reminders
-- =============================================================================
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access own reminders" ON reminders;
CREATE POLICY "Users can only access own reminders" ON reminders
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- reminder_exceptions
-- =============================================================================
-- This table has no user_id; ownership is derived from the parent reminder.
ALTER TABLE reminder_exceptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access own reminder_exceptions" ON reminder_exceptions;
CREATE POLICY "Users can only access own reminder_exceptions" ON reminder_exceptions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM reminders r
            WHERE r.id = reminder_exceptions.reminder_id
              AND r.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM reminders r
            WHERE r.id = reminder_exceptions.reminder_id
              AND r.user_id = auth.uid()
        )
    );

-- =============================================================================
-- exchange_rates
-- =============================================================================
-- Shared cache. Any authenticated session may read or refresh.
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read/write exchange rates" ON exchange_rates;
CREATE POLICY "Authenticated users can read/write exchange rates" ON exchange_rates
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- =============================================================================
-- budget_entries
-- =============================================================================
ALTER TABLE budget_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access own budget_entries" ON budget_entries;
CREATE POLICY "Users can only access own budget_entries" ON budget_entries
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- movement_templates
-- =============================================================================
ALTER TABLE movement_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access own movement_templates" ON movement_templates;
CREATE POLICY "Users can only access own movement_templates" ON movement_templates
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- net_worth_snapshots
-- =============================================================================
-- Already enabled by migration 004; replace the policy with the standard form.
ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own snapshots" ON net_worth_snapshots;
DROP POLICY IF EXISTS "Users can only access own net_worth_snapshots" ON net_worth_snapshots;
CREATE POLICY "Users can only access own net_worth_snapshots" ON net_worth_snapshots
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- fixed_expense_groups
-- =============================================================================
ALTER TABLE fixed_expense_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access own fixed_expense_groups" ON fixed_expense_groups;
CREATE POLICY "Users can only access own fixed_expense_groups" ON fixed_expense_groups
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
