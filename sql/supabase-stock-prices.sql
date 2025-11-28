-- Stock Prices Table
-- Stores stock/index prices with timestamps for caching across devices
-- Reduces API calls and provides shared cache

CREATE TABLE IF NOT EXISTS stock_prices (
  id TEXT PRIMARY KEY, -- symbol (e.g., 'VOO', 'AAPL')
  symbol TEXT NOT NULL UNIQUE,
  price NUMERIC(20, 6) NOT NULL, -- Current price (6 decimal places for precision)
  currency TEXT NOT NULL DEFAULT 'USD', -- Price currency
  market_state TEXT, -- 'REGULAR', 'PRE', 'POST', 'CLOSED'
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When price was last fetched
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups by symbol
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol 
  ON stock_prices(symbol);

-- Index for checking stale prices
CREATE INDEX IF NOT EXISTS idx_stock_prices_last_updated 
  ON stock_prices(last_updated);

-- RLS Policies (allow all authenticated users to read/write)
ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read prices
CREATE POLICY "Allow authenticated users to read stock prices"
  ON stock_prices
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert prices
CREATE POLICY "Allow authenticated users to insert stock prices"
  ON stock_prices
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update prices
CREATE POLICY "Allow authenticated users to update stock prices"
  ON stock_prices
  FOR UPDATE
  TO authenticated
  USING (true);

-- Function to automatically update last_updated timestamp
CREATE OR REPLACE FUNCTION update_stock_prices_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_updated on every update
CREATE TRIGGER update_stock_prices_timestamp
  BEFORE UPDATE ON stock_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_prices_last_updated();

-- Optional: Function to clean up old prices (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_stock_prices()
RETURNS void AS $$
BEGIN
  DELETE FROM stock_prices
  WHERE last_updated < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE stock_prices IS 'Stores stock/index prices with timestamps for caching across devices';
COMMENT ON COLUMN stock_prices.symbol IS 'Stock symbol (e.g., VOO, AAPL)';
COMMENT ON COLUMN stock_prices.price IS 'Current price with 6 decimal precision';
COMMENT ON COLUMN stock_prices.last_updated IS 'When price was last fetched from API';
