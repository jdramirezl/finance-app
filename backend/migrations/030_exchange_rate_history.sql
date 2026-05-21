-- Migration: Create exchange_rate_history table for storing historical exchange rates
-- This enables trend charts showing how currency pairs move over time.

CREATE TABLE IF NOT EXISTS exchange_rate_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate DECIMAL(20,10) NOT NULL CHECK (rate > 0),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_history_pair_date 
ON exchange_rate_history (base_currency, target_currency, recorded_at DESC);

-- RLS
ALTER TABLE exchange_rate_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rates" ON exchange_rate_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service can insert rates" ON exchange_rate_history FOR INSERT TO service_role WITH CHECK (true);
