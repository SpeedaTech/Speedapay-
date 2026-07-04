-- Create Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  currency VARCHAR(3) NOT NULL,
  
  available_balance DECIMAL(15,2) DEFAULT 0,
  pending_balance DECIMAL(15,2) DEFAULT 0,
  frozen_balance DECIMAL(15,2) DEFAULT 0,
  total_balance DECIMAL(15,2) DEFAULT 0,
  
  balance_updated_at TIMESTAMP DEFAULT NOW(),
  
  status VARCHAR(20) DEFAULT 'active',
  
  daily_send_limit DECIMAL(15,2) DEFAULT 5000.00,
  monthly_send_limit DECIMAL(15,2) DEFAULT 50000.00,
  daily_receive_limit DECIMAL(15,2) DEFAULT 50000.00,
  monthly_receive_limit DECIMAL(15,2) DEFAULT 500000.00,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, currency)
);

-- Create Wallet Transactions Table (IMMUTABLE LEDGER)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  from_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  to_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  
  status VARCHAR(20) DEFAULT 'pending',
  
  reference_id VARCHAR(255) UNIQUE,
  description TEXT,
  metadata JSONB,
  
  reconciled BOOLEAN DEFAULT FALSE,
  reconciled_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  failed_at TIMESTAMP
);

-- Create Wallet Limits Table
CREATE TABLE IF NOT EXISTS wallet_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
  
  daily_sent_amount DECIMAL(15,2) DEFAULT 0,
  daily_sent_count INT DEFAULT 0,
  daily_received_amount DECIMAL(15,2) DEFAULT 0,
  daily_received_count INT DEFAULT 0,
  daily_reset_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 day',
  
  monthly_sent_amount DECIMAL(15,2) DEFAULT 0,
  monthly_sent_count INT DEFAULT 0,
  monthly_received_amount DECIMAL(15,2) DEFAULT 0,
  monthly_received_count INT DEFAULT 0,
  monthly_reset_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 month',
  
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Wallet Holds Table
CREATE TABLE IF NOT EXISTS wallet_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  amount DECIMAL(15,2) NOT NULL,
  reason VARCHAR(100),
  
  status VARCHAR(20) DEFAULT 'active',
  
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
  released_at TIMESTAMP
);

-- Create Exchange Rates Table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10,6) NOT NULL,
  source VARCHAR(50),
  active BOOLEAN DEFAULT TRUE,
  effective_from TIMESTAMP DEFAULT NOW(),
  effective_to TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create Wallet Activity Logs Table
CREATE TABLE IF NOT EXISTS wallet_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  activity_type VARCHAR(50),
  old_value JSONB,
  new_value JSONB,
  reason VARCHAR(255),
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);
CREATE INDEX IF NOT EXISTS idx_wallets_status ON wallets(status);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_created_at ON wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_ref_id ON wallet_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_wallet_holds_wallet_id ON wallet_holds(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_holds_expires ON wallet_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_wallet_holds_status ON wallet_holds(status);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_active ON exchange_rates(active);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_wallet_activity_wallet_id ON wallet_activity_logs(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_limits_wallet_id ON wallet_limits(wallet_id);
