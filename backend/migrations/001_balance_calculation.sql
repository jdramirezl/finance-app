-- Migration: Add balance columns and triggers for auto-calculation

-- 1. Add balance column to accounts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'balance') THEN
        ALTER TABLE accounts ADD COLUMN balance DECIMAL(15, 2) DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- 2. Add balance column to pockets if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pockets' AND column_name = 'balance') THEN
        ALTER TABLE pockets ADD COLUMN balance DECIMAL(15, 2) DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- 3. Function to calculate pocket balance
CREATE OR REPLACE FUNCTION calculate_pocket_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the balance of the affected pocket(s)
    -- We need to handle both OLD and NEW for updates/deletes
    
    -- For INSERT/UPDATE: Update the new pocket
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE pockets
        SET balance = (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN type IN ('IngresoNormal', 'IngresoFijo', 'InvestmentIngreso') THEN amount 
                    ELSE -amount 
                END
            ), 0)
            FROM movements
            WHERE pocket_id = NEW.pocket_id
        )
        WHERE id = NEW.pocket_id;
    END IF;

    -- For DELETE/UPDATE: Update the old pocket (if different)
    IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.pocket_id <> NEW.pocket_id)) THEN
        UPDATE pockets
        SET balance = (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN type IN ('IngresoNormal', 'IngresoFijo', 'InvestmentIngreso') THEN amount 
                    ELSE -amount 
                END
            ), 0)
            FROM movements
            WHERE pocket_id = OLD.pocket_id
        )
        WHERE id = OLD.pocket_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to calculate account balance
CREATE OR REPLACE FUNCTION calculate_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the balance of the affected account(s)
    
    -- For INSERT/UPDATE: Update the new account
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE accounts
        SET balance = (
            SELECT COALESCE(SUM(balance), 0)
            FROM pockets
            WHERE account_id = NEW.account_id
        )
        WHERE id = NEW.account_id;
    END IF;

    -- For DELETE/UPDATE: Update the old account (if different)
    IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.account_id <> NEW.account_id)) THEN
        UPDATE accounts
        SET balance = (
            SELECT COALESCE(SUM(balance), 0)
            FROM pockets
            WHERE account_id = OLD.account_id
        )
        WHERE id = OLD.account_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Create Triggers on movements table
DROP TRIGGER IF EXISTS update_pocket_balance_trigger ON movements;
CREATE TRIGGER update_pocket_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON movements
FOR EACH ROW
EXECUTE FUNCTION calculate_pocket_balance();

-- 6. Create Triggers on pockets table
DROP TRIGGER IF EXISTS update_account_balance_trigger ON pockets;
CREATE TRIGGER update_account_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON pockets
FOR EACH ROW
EXECUTE FUNCTION calculate_account_balance();

-- 7. Initial calculation to sync existing data
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
);

UPDATE accounts a
SET balance = (
    SELECT COALESCE(SUM(p.balance), 0)
    FROM pockets p
    WHERE p.account_id = a.id
);
