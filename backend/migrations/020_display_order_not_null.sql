-- Migration: Add NOT NULL constraints to display_order columns
-- Backfills any existing NULLs with 0 before applying constraints

UPDATE accounts SET display_order = 0 WHERE display_order IS NULL;
UPDATE pockets SET display_order = 0 WHERE display_order IS NULL;
UPDATE sub_pockets SET display_order = 0 WHERE display_order IS NULL;

ALTER TABLE accounts ALTER COLUMN display_order SET NOT NULL;
ALTER TABLE pockets ALTER COLUMN display_order SET NOT NULL;
ALTER TABLE sub_pockets ALTER COLUMN display_order SET NOT NULL;
