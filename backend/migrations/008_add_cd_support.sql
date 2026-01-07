-- Migration: Add Certificate of Deposit (CD) support to accounts table
-- This migration adds all fields needed for CD investment accounts including withholding tax (retención en la fuente)

-- Add all CD-specific fields to accounts table

-- Principal amount (initial investment)
ALTER TABLE accounts ADD COLUMN principal DECIMAL(20, 2) DEFAULT NULL;

-- Annual interest rate (as percentage, e.g., 4.5)
ALTER TABLE accounts ADD COLUMN interest_rate DECIMAL(5, 2) DEFAULT NULL;

-- Term duration in months
ALTER TABLE accounts ADD COLUMN term_months INTEGER DEFAULT NULL;

-- Maturity date (when CD matures)
ALTER TABLE accounts ADD COLUMN maturity_date TIMESTAMP DEFAULT NULL;

-- Compounding frequency (daily, monthly, quarterly, annually)
ALTER TABLE accounts ADD COLUMN compounding_frequency VARCHAR(20) DEFAULT NULL;

-- Early withdrawal penalty percentage
ALTER TABLE accounts ADD COLUMN early_withdrawal_penalty DECIMAL(5, 2) DEFAULT NULL;

-- Withholding tax rate (retención en la fuente)
ALTER TABLE accounts ADD COLUMN withholding_tax_rate DECIMAL(5, 2) DEFAULT NULL;

-- CD creation date (separate from account creation for accurate interest calculation)
ALTER TABLE accounts ADD COLUMN cd_created_at TIMESTAMP DEFAULT NULL;

-- Investment type field to distinguish CD from stock/ETF
ALTER TABLE accounts ADD COLUMN investment_type VARCHAR(20) DEFAULT NULL;