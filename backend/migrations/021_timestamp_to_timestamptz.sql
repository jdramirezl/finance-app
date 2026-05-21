-- Migration: Convert timestamp columns to timestamptz
-- Treats existing values as UTC during conversion

ALTER TABLE accounts
    ALTER COLUMN maturity_date TYPE TIMESTAMPTZ USING maturity_date AT TIME ZONE 'UTC',
    ALTER COLUMN cd_created_at TYPE TIMESTAMPTZ USING cd_created_at AT TIME ZONE 'UTC';
