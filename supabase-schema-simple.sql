-- Simplified Finance App Database Schema for Supabase
-- Run this if the main schema causes issues
-- This version removes the automatic trigger

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_settings();

-- Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'MXN', 'COP', 'EUR', 'GBP')),
  balance NUMERIC(15, 2) DEFAULT 0,
  type TEXT DEFAULT 'normal' CHECK (type IN ('normal', 'investment')),
  stock_symbol TEXT,
  monto_invertido NUMERIC(15, 2),
  shares NUMERIC(15, 6),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name, currency)
);

-- Pockets Table
CREATE TABLE IF NOT EXISTS pockets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('normal', 'fixed')),
  balance NUMERIC(15, 2) DEFAULT 0,
  currency TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, account_id, name)
);

-- SubPockets Table
CREATE TABLE IF NOT EXISTS sub_pockets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pocket_id UUID REFERENCES pockets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  value_total NUMERIC(15, 2) NOT NULL,
  periodicity_months INTEGER NOT NULL,
  balance NUMERIC(15, 2) DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movements Table
CREATE TABLE IF NOT EXISTS movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo', 'InvestmentIngreso', 'InvestmentShares')),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  pocket_id UUID REFERENCES pockets(id) ON DELETE CASCADE NOT NULL,
  sub_pocket_id UUID REFERENCES sub_pockets(id) ON DELETE SET NULL,
  amount NUMERIC(15, 2) NOT NULL,
  notes TEXT,
  displayed_date TIMESTAMPTZ NOT NULL,
  is_pending BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  primary_currency TEXT NOT NULL DEFAULT 'USD' CHECK (primary_currency IN ('USD', 'MXN', 'COP', 'EUR', 'GBP')),
  alpha_vantage_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget Entries Table
CREATE TABLE IF NOT EXISTS budget_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_pockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON accounts;

DROP POLICY IF EXISTS "Users can view their own pockets" ON pockets;
DROP POLICY IF EXISTS "Users can insert their own pockets" ON pockets;
DROP POLICY IF EXISTS "Users can update their own pockets" ON pockets;
DROP POLICY IF EXISTS "Users can delete their own pockets" ON pockets;

DROP POLICY IF EXISTS "Users can view their own sub_pockets" ON sub_pockets;
DROP POLICY IF EXISTS "Users can insert their own sub_pockets" ON sub_pockets;
DROP POLICY IF EXISTS "Users can update their own sub_pockets" ON sub_pockets;
DROP POLICY IF EXISTS "Users can delete their own sub_pockets" ON sub_pockets;

DROP POLICY IF EXISTS "Users can view their own movements" ON movements;
DROP POLICY IF EXISTS "Users can insert their own movements" ON movements;
DROP POLICY IF EXISTS "Users can update their own movements" ON movements;
DROP POLICY IF EXISTS "Users can delete their own movements" ON movements;

DROP POLICY IF EXISTS "Users can view their own settings" ON settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON settings;

DROP POLICY IF EXISTS "Users can view their own budget_entries" ON budget_entries;
DROP POLICY IF EXISTS "Users can insert their own budget_entries" ON budget_entries;
DROP POLICY IF EXISTS "Users can update their own budget_entries" ON budget_entries;
DROP POLICY IF EXISTS "Users can delete their own budget_entries" ON budget_entries;

-- Create RLS Policies
CREATE POLICY "Users can view their own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own accounts" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own accounts" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own accounts" ON accounts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own pockets" ON pockets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own pockets" ON pockets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own pockets" ON pockets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pockets" ON pockets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own sub_pockets" ON sub_pockets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sub_pockets" ON sub_pockets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sub_pockets" ON sub_pockets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sub_pockets" ON sub_pockets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own movements" ON movements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own movements" ON movements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own movements" ON movements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own movements" ON movements FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own settings" ON settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own budget_entries" ON budget_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budget_entries" ON budget_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budget_entries" ON budget_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budget_entries" ON budget_entries FOR DELETE USING (auth.uid() = user_id);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_pockets_user_id ON pockets(user_id);
CREATE INDEX IF NOT EXISTS idx_pockets_account_id ON pockets(account_id);
CREATE INDEX IF NOT EXISTS idx_sub_pockets_user_id ON sub_pockets(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_pockets_pocket_id ON sub_pockets(pocket_id);
CREATE INDEX IF NOT EXISTS idx_movements_user_id ON movements(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_account_id ON movements(account_id);
CREATE INDEX IF NOT EXISTS idx_movements_pocket_id ON movements(pocket_id);
CREATE INDEX IF NOT EXISTS idx_movements_displayed_date ON movements(displayed_date);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_entries_user_id ON budget_entries(user_id);
