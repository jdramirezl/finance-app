-- Migration: Increase precision for shares-related fields to support 6 decimal places
-- Investment accounts need higher precision for fractional shares (e.g., 0.123456 shares)

-- Update movements table: amount field to support 6 decimals
-- This is where share quantities are recorded (in the "Shares" pocket)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movements' AND column_name = 'amount') THEN
        ALTER TABLE movements ALTER COLUMN amount TYPE DECIMAL(20, 6);
    END IF;
END $$;

-- Update pockets table: balance field to support 6 decimals
-- The "Shares" pocket balance needs to store fractional shares
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pockets' AND column_name = 'balance') THEN
        ALTER TABLE pockets ALTER COLUMN balance TYPE DECIMAL(20, 6);
    END IF;
END $$;

-- Update accounts table: shares and balance fields to support 6 decimals
-- These are synced from pocket balances
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'shares') THEN
        ALTER TABLE accounts ALTER COLUMN shares TYPE DECIMAL(20, 6);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'balance') THEN
        ALTER TABLE accounts ALTER COLUMN balance TYPE DECIMAL(20, 6);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'monto_invertido') THEN
        ALTER TABLE accounts ALTER COLUMN monto_invertido TYPE DECIMAL(20, 6);
    END IF;
END $$;
