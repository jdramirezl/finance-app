-- Add display_order column to fixed_expense_groups table
ALTER TABLE fixed_expense_groups 
ADD COLUMN display_order INTEGER DEFAULT 0;
