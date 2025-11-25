-- Investment API Call Tracking Table
-- Tracks Alpha Vantage API calls globally across all users/devices

CREATE TABLE IF NOT EXISTS investment_api_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_hash TEXT NOT NULL, -- Hash of API key to identify which key was used
  call_date DATE NOT NULL, -- Date of the call (YYYY-MM-DD)
  call_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one row per API key per day
  UNIQUE(api_key_hash, call_date)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_investment_api_calls_date 
  ON investment_api_calls(api_key_hash, call_date);

-- RLS Policies (allow all authenticated users to read/write)
ALTER TABLE investment_api_calls ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read call counts
CREATE POLICY "Allow authenticated users to read API call counts"
  ON investment_api_calls
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert/update call counts
CREATE POLICY "Allow authenticated users to track API calls"
  ON investment_api_calls
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_investment_api_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on every update
CREATE TRIGGER update_investment_api_calls_timestamp
  BEFORE UPDATE ON investment_api_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_investment_api_calls_updated_at();

-- Optional: Function to clean up old records (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_investment_api_calls()
RETURNS void AS $$
BEGIN
  DELETE FROM investment_api_calls
  WHERE call_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE investment_api_calls IS 'Tracks Alpha Vantage API calls globally to prevent exceeding rate limits';
COMMENT ON COLUMN investment_api_calls.api_key_hash IS 'SHA-256 hash of the API key for identification';
COMMENT ON COLUMN investment_api_calls.call_date IS 'Date of API calls (YYYY-MM-DD format)';
COMMENT ON COLUMN investment_api_calls.call_count IS 'Number of API calls made on this date';
