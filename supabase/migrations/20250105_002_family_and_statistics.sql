-- Family members management table
CREATE TABLE IF NOT EXISTS family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'inactive')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(family_id, user_id),
  UNIQUE(family_id, email)
);

-- Shopping statistics table for tracking detailed purchase data
CREATE TABLE IF NOT EXISTS shopping_statistics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shopping_list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_category TEXT,
  store_name TEXT,
  unit TEXT DEFAULT 'db',
  unit_price DECIMAL(10,2) NOT NULL,
  quantity DECIMAL(10,3) DEFAULT 1,
  total_price DECIMAL(10,2) NOT NULL,
  shopping_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT CHECK (source IN ('ocr', 'manual', 'list')) DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enhanced shopping lists with more features
ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS shared_with TEXT[]; -- Array of user IDs
ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS list_type TEXT DEFAULT 'shopping' CHECK (list_type IN ('shopping', 'template', 'recurring'));
ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT; -- weekly, monthly, etc.

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_statistics_user_id ON shopping_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_statistics_shopping_date ON shopping_statistics(shopping_date DESC);
CREATE INDEX IF NOT EXISTS idx_shopping_statistics_product_name ON shopping_statistics(product_name);

-- Enable RLS
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_statistics ENABLE ROW LEVEL SECURITY;

-- Family members RLS policies
CREATE POLICY "Users can view family members" ON family_members
    FOR SELECT USING (
        user_id = auth.uid() OR 
        family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert family members" ON family_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Shopping statistics RLS policies
CREATE POLICY "Users can view own shopping statistics" ON shopping_statistics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping statistics" ON shopping_statistics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to automatically create family_id for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create a family_id if it doesn't exist in user_metadata
  IF NEW.raw_user_meta_data->>'family_id' IS NULL THEN
    NEW.raw_user_meta_data = COALESCE(NEW.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('family_id', gen_random_uuid());
  END IF;
  
  -- Insert into family_members table
  INSERT INTO family_members (family_id, user_id, email, full_name, role, status)
  VALUES (
    (NEW.raw_user_meta_data->>'family_id')::uuid,
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'admin',
    'active'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();