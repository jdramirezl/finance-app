-- Movement Templates Table
-- Allows users to save recurring transaction patterns for quick entry

CREATE TABLE IF NOT EXISTS movement_templates (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo')),
  account_id TEXT NOT NULL,
  pocket_id TEXT NOT NULL,
  sub_pocket_id TEXT,
  default_amount NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_movement_templates_user ON movement_templates(user_id);

-- RLS Policies
ALTER TABLE movement_templates ENABLE ROW LEVEL SECURITY;

-- Users can only see their own templates
CREATE POLICY "Users can view own templates"
  ON movement_templates FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own templates
CREATE POLICY "Users can insert own templates"
  ON movement_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON movement_templates FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON movement_templates FOR DELETE
  USING (auth.uid() = user_id);
