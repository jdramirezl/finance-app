-- Exchange Rates Table
-- Stores currency exchange rates with timestamps for caching
-- Updated once per day via serverless function to minimize API calls

CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY,
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate DECIMAL(20, 10) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(base_currency, target_currency)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(base_currency, target_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_updated ON exchange_rates(last_updated);

-- Example data structure:
-- id: 'USD_MXN'
-- base_currency: 'USD'
-- target_currency: 'MXN'
-- rate: 17.5432
-- last_updated: '2025-01-15 10:30:00+00'
