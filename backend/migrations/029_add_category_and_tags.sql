-- Migration: 029_add_category_and_tags.sql
-- Add category and tags columns to movements table.
-- Both nullable for backward compatibility (existing movements get NULL/empty).

ALTER TABLE movements ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE movements ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_movements_category ON movements (user_id, category) WHERE category IS NOT NULL;

-- GIN index for array containment queries on tags
CREATE INDEX IF NOT EXISTS idx_movements_tags ON movements USING GIN (tags) WHERE tags != '{}';
