-- Migration: Add account card display settings
-- Description: Add account_card_display column to settings table for storing user preferences on how account cards are displayed on the summary page

-- Add account_card_display column to settings table
ALTER TABLE settings 
ADD COLUMN account_card_display JSONB;

-- Add comment explaining the column
COMMENT ON COLUMN settings.account_card_display IS 'JSON object storing display mode preferences for different account types on summary page. Format: {"normal": "compact|detailed", "investment": "compact|detailed", "cd": "compact|detailed"}';

-- The column is nullable since existing users won't have this preference set initially
-- The application will use default values when this is null