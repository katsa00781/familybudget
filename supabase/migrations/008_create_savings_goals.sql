-- Megtakarítási célok tábla
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) DEFAULT 0,
  target_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for visualization
  category VARCHAR(50) DEFAULT 'general' -- general, vacation, electronics, emergency, etc.
);

-- Megtakarítási tranzakciók tábla
CREATE TABLE IF NOT EXISTS savings_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  savings_goal_id UUID REFERENCES savings_goals(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('deposit', 'withdrawal')) DEFAULT 'deposit',
  description TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Befektetési portfólió tábla (részvények, állampapírok)
CREATE TABLE IF NOT EXISTS investment_portfolio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(20) NOT NULL, -- AAPL, TSLA, MAK24, stb.
  investment_type VARCHAR(20) CHECK (investment_type IN ('stock', 'bond', 'etf', 'crypto')) NOT NULL,
  quantity DECIMAL(15,6) NOT NULL,
  average_price DECIMAL(15,2) NOT NULL,
  current_price DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'HUF',
  purchase_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Befektetési ár előzmények (napi árfolyamok)
CREATE TABLE IF NOT EXISTS investment_price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'HUF',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, date)
);

-- RLS policies
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_price_history ENABLE ROW LEVEL SECURITY;

-- Savings goals policies
CREATE POLICY "Users can view their own savings goals" ON savings_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings goals" ON savings_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings goals" ON savings_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings goals" ON savings_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Savings transactions policies
CREATE POLICY "Users can view transactions of their own savings goals" ON savings_transactions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM savings_goals WHERE savings_goals.id = savings_transactions.savings_goal_id AND savings_goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert transactions to their own savings goals" ON savings_transactions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM savings_goals WHERE savings_goals.id = savings_transactions.savings_goal_id AND savings_goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can update transactions of their own savings goals" ON savings_transactions
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM savings_goals WHERE savings_goals.id = savings_transactions.savings_goal_id AND savings_goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete transactions of their own savings goals" ON savings_transactions
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM savings_goals WHERE savings_goals.id = savings_transactions.savings_goal_id AND savings_goals.user_id = auth.uid()
  ));

-- Investment portfolio policies
CREATE POLICY "Users can view their own investment portfolio" ON investment_portfolio
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own investments" ON investment_portfolio
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investments" ON investment_portfolio
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investments" ON investment_portfolio
  FOR DELETE USING (auth.uid() = user_id);

-- Investment price history policies (everyone can read, only system can write)
CREATE POLICY "Users can view investment price history" ON investment_price_history
  FOR SELECT TO authenticated
  USING (true);

-- Indexek a teljesítmény javításához
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_target_date ON savings_goals(target_date);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_goal_id ON savings_transactions(savings_goal_id);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_date ON savings_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_investment_portfolio_user_id ON investment_portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_portfolio_symbol ON investment_portfolio(symbol);
CREATE INDEX IF NOT EXISTS idx_investment_price_history_symbol ON investment_price_history(symbol);
CREATE INDEX IF NOT EXISTS idx_investment_price_history_date ON investment_price_history(date);

-- Trigger a frissítési dátum automatikus beállításához
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_savings_goals_updated_at 
  BEFORE UPDATE ON savings_goals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_portfolio_updated_at 
  BEFORE UPDATE ON investment_portfolio 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
