-- Finance App Database Schema for Supabase
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Accounts Table
CREATE TABLE accounts (
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
CREATE TABLE pockets (
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

-- SubPockets Table (for fixed expenses)
CREATE TABLE sub_pockets (
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
CREATE TABLE movements (
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
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  primary_currency TEXT NOT NULL DEFAULT 'USD' CHECK (primary_currency IN ('USD', 'MXN', 'COP', 'EUR', 'GBP')),
  alpha_vantage_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget Entries Table (for budget planning)
CREATE TABLE budget_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
-- Users can only access their own data

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_pockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_entries ENABLE ROW LEVEL SECURITY;

-- Accounts policies
CREATE POLICY "Users can view their own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Pockets policies
CREATE POLICY "Users can view their own pockets"
  ON pockets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pockets"
  ON pockets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pockets"
  ON pockets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pockets"
  ON pockets FOR DELETE
  USING (auth.uid() = user_id);

-- SubPockets policies
CREATE POLICY "Users can view their own sub_pockets"
  ON sub_pockets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sub_pockets"
  ON sub_pockets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sub_pockets"
  ON sub_pockets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sub_pockets"
  ON sub_pockets FOR DELETE
  USING (auth.uid() = user_id);

-- Movements policies
CREATE POLICY "Users can view their own movements"
  ON movements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own movements"
  ON movements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own movements"
  ON movements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own movements"
  ON movements FOR DELETE
  USING (auth.uid() = user_id);

-- Settings policies
CREATE POLICY "Users can view their own settings"
  ON settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Budget entries policies
CREATE POLICY "Users can view their own budget_entries"
  ON budget_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget_entries"
  ON budget_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget_entries"
  ON budget_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget_entries"
  ON budget_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_pockets_user_id ON pockets(user_id);
CREATE INDEX idx_pockets_account_id ON pockets(account_id);
CREATE INDEX idx_sub_pockets_user_id ON sub_pockets(user_id);
CREATE INDEX idx_sub_pockets_pocket_id ON sub_pockets(pocket_id);
CREATE INDEX idx_movements_user_id ON movements(user_id);
CREATE INDEX idx_movements_account_id ON movements(account_id);
CREATE INDEX idx_movements_pocket_id ON movements(pocket_id);
CREATE INDEX idx_movements_displayed_date ON movements(displayed_date);
CREATE INDEX idx_settings_user_id ON settings(user_id);
CREATE INDEX idx_budget_entries_user_id ON budget_entries(user_id);

-- Function to automatically create settings for new users
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO settings (user_id, primary_currency)
  VALUES (NEW.id, 'USD');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create settings when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_settings();
