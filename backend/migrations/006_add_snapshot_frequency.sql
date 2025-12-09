-- Migration: Add snapshot_frequency column to settings table
-- Allows users to configure how often net worth snapshots are automatically taken

DO $$
BEGIN
    -- Check if snapshot_frequency column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'settings' 
        AND column_name = 'snapshot_frequency'
    ) THEN
        ALTER TABLE settings 
        ADD COLUMN snapshot_frequency VARCHAR(20) DEFAULT 'weekly' 
        CHECK (snapshot_frequency IN ('daily', 'weekly', 'monthly', 'manual'));
        
        COMMENT ON COLUMN settings.snapshot_frequency IS 'Frequency for automatic net worth snapshots: daily, weekly, monthly, or manual';
    END IF;
END $$;
