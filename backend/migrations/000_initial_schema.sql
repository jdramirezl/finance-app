-- Migration: 000_initial_schema.sql
--
-- DOCUMENTATION ONLY — DO NOT RUN.
--
-- The tables in this file were originally created manually through the
-- Supabase dashboard before this migrations directory existed. This file
-- captures the full schema as it currently exists in production so future
-- contributors and tooling have a single canonical reference.
--
-- The CREATE TABLE statements use IF NOT EXISTS so that running this file
-- against an empty database (e.g. a fresh test environment) would produce
-- the same schema, but all subsequent migrations (001 onward) assume these
-- tables already exist.
--
-- Conventions used throughout:
--   - Primary keys are UUIDs generated with gen_random_uuid()
--   - All multi-tenant tables include user_id REFERENCES auth.users(id)
--   - Money columns use DECIMAL(20, 6) to support fractional shares while
--     keeping enough precision for normal currency amounts
--   - Date/time columns use TIMESTAMPTZ unless they represent a calendar
--     date (DATE)
--   - snake_case column names (Supabase convention); camelCase mapping
--     happens in the application layer
--
-- Triggers and atomic RPC functions live in dedicated migration files
-- (001_balance_calculation.sql, 011_atomic_operations.sql, etc.) and are
-- not duplicated here.

-- =============================================================================
-- accounts
-- =============================================================================
-- A financial account owned by a user (bank account, cash, or investment
-- account). Balance is calculated from the sum of pocket balances by the
-- trigger defined in 001_balance_calculation.sql, so it should never be
-- written directly from the application layer.
CREATE TABLE IF NOT EXISTS accounts (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name                     TEXT NOT NULL,
    color                    TEXT NOT NULL,
    currency                 VARCHAR(3) NOT NULL,
    -- Calculated by trigger (see migration 001). Excludes pending movements
    -- after migration 002. DECIMAL(20, 6) supports fractional shares for
    -- investment accounts (see migration 005).
    balance                  DECIMAL(20, 6) NOT NULL DEFAULT 0,
    type                     VARCHAR(20) NOT NULL DEFAULT 'normal'
                             CHECK (type IN ('normal', 'investment', 'cd')),
    -- Stock/ETF investment fields (only populated when type = 'investment')
    stock_symbol             TEXT,
    monto_invertido          DECIMAL(20, 6),
    shares                   DECIMAL(20, 6),
    -- Display ordering for drag-and-drop reordering on the UI
    display_order            INTEGER DEFAULT 0,
    -- Discriminator for investment subtype (stock | etf | cd)
    investment_type          VARCHAR(20),
    -- Certificate of Deposit fields (only populated when type = 'cd')
    principal                DECIMAL(20, 2),
    interest_rate            DECIMAL(5, 2),
    term_months              INTEGER,
    maturity_date            TIMESTAMP,
    compounding_frequency    VARCHAR(20),
    early_withdrawal_penalty DECIMAL(5, 2),
    -- Withholding tax rate (Colombian "retención en la fuente" or equivalent)
    withholding_tax_rate     DECIMAL(5, 2),
    cd_created_at            TIMESTAMP,
    -- Auditing
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ DEFAULT NOW(),
    -- A user cannot have two accounts with the same name in the same currency
    UNIQUE (user_id, name, currency)
);

COMMENT ON TABLE accounts IS 'Top-level financial container owned by a user. Balance is trigger-maintained from pocket balances.';
COMMENT ON COLUMN accounts.balance IS 'Calculated by calculate_account_balance() trigger — do not write directly.';
COMMENT ON COLUMN accounts.shares IS 'Total shares for investment accounts; uses 6 decimals for fractional shares.';

-- =============================================================================
-- pockets
-- =============================================================================
-- A sub-container inside an account. Movements affect a pocket directly,
-- and the parent account's balance is the sum of its pockets' balances.
-- "fixed" pockets host sub-pockets for recurring expenses.
CREATE TABLE IF NOT EXISTS pockets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    type          VARCHAR(20) NOT NULL DEFAULT 'normal'
                  CHECK (type IN ('normal', 'fixed')),
    -- Calculated by calculate_pocket_balance() trigger from non-pending movements.
    balance       DECIMAL(20, 6) NOT NULL DEFAULT 0,
    currency      VARCHAR(3) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE pockets IS 'Sub-container of an account. Balance is trigger-maintained from non-pending movements.';

-- =============================================================================
-- sub_pockets
-- =============================================================================
-- Recurring-expense sub-buckets that only live inside a pocket of type
-- 'fixed'. Track a target amount that is contributed to over a number of
-- months. Optionally grouped via fixed_expense_groups.
CREATE TABLE IF NOT EXISTS sub_pockets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pocket_id           UUID NOT NULL REFERENCES pockets(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    -- Total amount the user wants to save toward this expense
    value_total         DECIMAL(15, 2) NOT NULL,
    -- How many months to spread the target amount across
    periodicity_months  INTEGER NOT NULL,
    balance             DECIMAL(15, 2) NOT NULL DEFAULT 0,
    -- Whether this sub-pocket participates in budget calculations
    enabled             BOOLEAN NOT NULL DEFAULT TRUE,
    -- Optional grouping (NULL = default group)
    group_id            UUID REFERENCES fixed_expense_groups(id) ON DELETE SET NULL,
    display_order       INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sub_pockets IS 'Recurring-expense sub-bucket inside a fixed-type pocket.';

-- =============================================================================
-- movements
-- =============================================================================
-- A single transaction (income or expense) recorded against a pocket. The
-- balance triggers in 001/002 keep pocket and account balances in sync.
-- Pending movements are recorded but excluded from balance calculations
-- until applied. Orphaned movements are soft-preserved when their parent
-- account or pocket is deleted (see delete_account_cascade in migration 011).
CREATE TABLE IF NOT EXISTS movements (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type                        VARCHAR(30) NOT NULL
                                CHECK (type IN ('IngresoNormal', 'EgresoNormal',
                                                'IngresoFijo',  'EgresoFijo',
                                                'InvestmentIngreso', 'InvestmentEgreso')),
    account_id                  UUID,
    pocket_id                   UUID,
    sub_pocket_id               UUID,
    -- DECIMAL(20, 6) supports fractional shares for investment movements (see migration 005).
    amount                      DECIMAL(20, 6) NOT NULL,
    notes                       TEXT,
    -- User-assigned date (when the transaction logically happened)
    displayed_date              TIMESTAMPTZ NOT NULL,
    -- System-assigned timestamp (when the row was created)
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Pending movements are recorded but not yet applied to balances
    is_pending                  BOOLEAN NOT NULL DEFAULT FALSE,
    -- Soft-deleted state when parent account/pocket is removed
    is_orphaned                 BOOLEAN NOT NULL DEFAULT FALSE,
    -- Snapshot fields used for restoration after orphaning
    orphaned_account_name       TEXT,
    orphaned_account_currency   VARCHAR(3),
    orphaned_pocket_name        TEXT
);

COMMENT ON TABLE movements IS 'Income/expense transactions. Amount is signed by type via the balance triggers.';
COMMENT ON COLUMN movements.is_pending IS 'When TRUE, the movement is excluded from pocket/account balance triggers.';
COMMENT ON COLUMN movements.is_orphaned IS 'When TRUE, parent account/pocket has been deleted; orphaned_* fields preserve original context for restoration.';

-- =============================================================================
-- settings
-- =============================================================================
-- One row per user with global preferences. Enforced by the unique constraint
-- on user_id, which is also the upsert conflict target.
CREATE TABLE IF NOT EXISTS settings (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    primary_currency       VARCHAR(3) NOT NULL DEFAULT 'USD',
    alpha_vantage_api_key  TEXT,
    -- Net-worth snapshot cadence; see migration 006
    snapshot_frequency     VARCHAR(20) DEFAULT 'weekly'
                           CHECK (snapshot_frequency IN ('daily', 'weekly', 'monthly', 'manual')),
    -- Per-account-type display preferences on the Summary page; see migration 010
    account_card_display   JSONB,
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN settings.account_card_display IS 'Display mode per account type: {"normal": "compact|detailed", "investment": "...", "cd": "..."}';

-- =============================================================================
-- reminders
-- =============================================================================
-- Recurring or one-off bill payment reminders. Recurrence is encoded inline
-- (rather than as a separate table) for query simplicity. Per-occurrence
-- overrides live in reminder_exceptions.
CREATE TABLE IF NOT EXISTS reminders (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title                       TEXT NOT NULL,
    amount                      DECIMAL(15, 2) NOT NULL,
    -- Date the next occurrence is due (or the only occurrence if non-recurring)
    due_date                    DATE NOT NULL,
    is_paid                     BOOLEAN DEFAULT FALSE,
    -- Recurrence rule (inline)
    recurrence_type             VARCHAR(20) NOT NULL DEFAULT 'once'
                                CHECK (recurrence_type IN ('once', 'daily', 'weekly', 'monthly', 'yearly')),
    recurrence_interval         INTEGER NOT NULL DEFAULT 1,
    -- For weekly recurrence: which days of the week ([0..6], 0 = Sunday)
    recurrence_days_of_week     INTEGER[],
    recurrence_end_type         VARCHAR(20) NOT NULL DEFAULT 'never'
                                CHECK (recurrence_end_type IN ('never', 'after', 'on')),
    recurrence_end_count        INTEGER,
    recurrence_end_date         DATE,
    -- Optional links to other entities
    linked_movement_id          UUID REFERENCES movements(id) ON DELETE SET NULL,
    fixed_expense_id            UUID REFERENCES sub_pockets(id) ON DELETE SET NULL,
    template_id                 UUID REFERENCES movement_templates(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE reminders IS 'Bill payment reminders with inline recurrence rule and optional links to movements/templates.';

-- =============================================================================
-- reminder_exceptions
-- =============================================================================
-- Per-occurrence overrides for a recurring reminder: skip this date, change
-- the amount, mark as paid, etc. Created in migration 003.
CREATE TABLE IF NOT EXISTS reminder_exceptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id         UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    -- The date in the recurrence series this exception applies to
    original_date       DATE NOT NULL,
    action              TEXT NOT NULL CHECK (action IN ('deleted', 'modified')),
    -- Modified-occurrence fields (NULL when action = 'deleted')
    new_title           TEXT,
    new_amount          DECIMAL(10, 2),
    new_date            DATE,
    is_paid             BOOLEAN,
    linked_movement_id  UUID REFERENCES movements(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (reminder_id, original_date)
);

-- =============================================================================
-- exchange_rates
-- =============================================================================
-- Shared cache of currency conversion rates. NOT scoped per user — all users
-- read the same rate cache. Refreshed by ExchangeRateAPIService when the
-- cached rate is older than 24 hours.
CREATE TABLE IF NOT EXISTS exchange_rates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency   VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate            DECIMAL(20, 10) NOT NULL,
    last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (base_currency, target_currency)
);

COMMENT ON TABLE exchange_rates IS 'Shared currency rate cache (not user-scoped). Refreshed every 24h.';

-- =============================================================================
-- budget_entries
-- =============================================================================
-- Free-form budget rows for the Budget Planning page. Replaced atomically
-- via the save_budget_entries_atomic() RPC defined in migration 011.
CREATE TABLE IF NOT EXISTS budget_entries (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    amount        DECIMAL(15, 2) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- movement_templates
-- =============================================================================
-- Saved transaction patterns the user can apply for quick movement entry.
CREATE TABLE IF NOT EXISTS movement_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    type            VARCHAR(30) NOT NULL,
    account_id      UUID REFERENCES accounts(id) ON DELETE SET NULL,
    pocket_id       UUID REFERENCES pockets(id) ON DELETE SET NULL,
    sub_pocket_id   UUID REFERENCES sub_pockets(id) ON DELETE SET NULL,
    -- Optional default amount to pre-fill (user can override)
    default_amount  DECIMAL(20, 6),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, name)
);

-- =============================================================================
-- net_worth_snapshots
-- =============================================================================
-- Periodic snapshots of total net worth for the timeline view. Created in
-- migration 004 with RLS already enabled — kept here for completeness.
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date   DATE NOT NULL,
    total_net_worth DECIMAL(15, 2) NOT NULL,
    base_currency   VARCHAR(3) NOT NULL,
    -- Per-currency breakdown, e.g. {"USD": 5000, "MXN": 20000}
    breakdown       JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, snapshot_date)
);

-- =============================================================================
-- fixed_expense_groups
-- =============================================================================
-- Optional grouping for sub_pockets. NULL group_id on a sub_pocket means it
-- belongs to the implicit "Default" group.
CREATE TABLE IF NOT EXISTS fixed_expense_groups (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    color         TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
