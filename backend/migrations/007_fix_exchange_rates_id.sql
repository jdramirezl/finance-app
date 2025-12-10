-- Migration: Add default UUID generation for exchange_rates id
-- Fixes "null value in column id" error when inserting rates

-- Ensure pgcrypto or uuid-ossp extension is enabled (gen_random_uuid is built-in in PG13+)
-- We'll use gen_random_uuid() which is standard in modern Postgres (Supabase uses PG15+)

ALTER TABLE exchange_rates 
ALTER COLUMN id SET DEFAULT gen_random_uuid();
