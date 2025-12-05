-- Enable RLS on the table
ALTER TABLE fixed_expense_groups ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT
DROP POLICY IF EXISTS "Users can view their own fixed expense groups" ON fixed_expense_groups;
CREATE POLICY "Users can view their own fixed expense groups"
ON fixed_expense_groups FOR SELECT
USING (auth.uid() = user_id);

-- Policy for INSERT
DROP POLICY IF EXISTS "Users can insert their own fixed expense groups" ON fixed_expense_groups;
CREATE POLICY "Users can insert their own fixed expense groups"
ON fixed_expense_groups FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE
DROP POLICY IF EXISTS "Users can update their own fixed expense groups" ON fixed_expense_groups;
CREATE POLICY "Users can update their own fixed expense groups"
ON fixed_expense_groups FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE
DROP POLICY IF EXISTS "Users can delete their own fixed expense groups" ON fixed_expense_groups;
CREATE POLICY "Users can delete their own fixed expense groups"
ON fixed_expense_groups FOR DELETE
USING (auth.uid() = user_id);
