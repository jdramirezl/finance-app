-- Migration: Net Worth Snapshots Table
-- Stores periodic snapshots of user's net worth for timeline visualization

CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_net_worth DECIMAL(15, 2) NOT NULL,
  base_currency VARCHAR(3) NOT NULL,
  breakdown JSONB,  -- Per-currency breakdown: {"USD": 5000, "MXN": 20000}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

-- Enable Row Level Security
ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only manage their own snapshots
CREATE POLICY "Users can manage own snapshots" ON net_worth_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_net_worth_snapshots_user_date ON net_worth_snapshots(user_id, snapshot_date DESC);
