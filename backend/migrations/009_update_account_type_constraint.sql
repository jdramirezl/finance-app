-- Migration: Update account type constraint to allow 'cd' type
-- This migration updates the existing check constraint to allow the new 'cd' account type

-- Drop the existing constraint
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;

-- Add the updated constraint that includes 'cd'
ALTER TABLE accounts ADD CONSTRAINT accounts_type_check 
CHECK (type IN ('normal', 'investment', 'cd'));