-- Fixed Expense Groups Table
-- Allows grouping of fixed expenses for batch enable/disable
-- Use case: Bi-weekly salary with different expense sets per payment

-- Create fixed_expense_groups table
CREATE TABLE IF NOT EXISTS fixed_expense_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6', -- Default blue color
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add group_id column to sub_pockets (nullable, defaults to Default group)
ALTER TABLE sub_pockets 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES fixed_expense_groups(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sub_pockets_group_id 
  ON sub_pockets(group_id);

-- RLS Policies
ALTER TABLE fixed_expense_groups ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read groups
CREATE POLICY "Allow authenticated users to read fixed expense groups"
  ON fixed_expense_groups
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert groups
CREATE POLICY "Allow authenticated users to insert fixed expense groups"
  ON fixed_expense_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update groups
CREATE POLICY "Allow authenticated users to update fixed expense groups"
  ON fixed_expense_groups
  FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete groups
CREATE POLICY "Allow authenticated users to delete fixed expense groups"
  ON fixed_expense_groups
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fixed_expense_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on every update
CREATE TRIGGER update_fixed_expense_groups_timestamp
  BEFORE UPDATE ON fixed_expense_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_fixed_expense_groups_updated_at();

-- Create default group (cannot be deleted via UI)
INSERT INTO fixed_expense_groups (id, name, color)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default', '#6B7280')
ON CONFLICT (id) DO NOTHING;

-- Assign all existing sub_pockets to default group
UPDATE sub_pockets
SET group_id = '00000000-0000-0000-0000-000000000001'
WHERE group_id IS NULL;

COMMENT ON TABLE fixed_expense_groups IS 'Groups for organizing fixed expenses with batch enable/disable';
COMMENT ON COLUMN fixed_expense_groups.name IS 'Group name (e.g., "Payment 1", "Utilities")';
COMMENT ON COLUMN fixed_expense_groups.color IS 'Hex color for visual grouping';
COMMENT ON COLUMN sub_pockets.group_id IS 'Reference to fixed_expense_groups, NULL = Default group';
