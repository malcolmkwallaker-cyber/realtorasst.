-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE contact_type AS ENUM ('buyer','seller','agent_recruit','referral_partner','past_client');
CREATE TYPE priority_level AS ENUM ('low','medium','high','urgent');
CREATE TYPE channel_type AS ENUM ('email','text','call','social_dm');
CREATE TYPE direction_type AS ENUM ('inbound','outbound');
CREATE TYPE property_status AS ENUM ('active','pending','sold','withdrawn');

-- contacts
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  contact_type contact_type NOT NULL DEFAULT 'buyer',
  lead_source TEXT,
  market_area TEXT,
  price_range TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'MN',
  zip TEXT,
  list_price NUMERIC(12,2),
  property_type TEXT,
  beds INTEGER,
  baths NUMERIC(4,1),
  square_feet INTEGER,
  acres NUMERIC(10,2),
  lake_name TEXT,
  waterfront BOOLEAN DEFAULT FALSE,
  description TEXT,
  key_features TEXT[] DEFAULT '{}',
  seller_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  status property_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  category TEXT,
  priority priority_level DEFAULT 'medium',
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  channel channel_type NOT NULL,
  direction direction_type NOT NULL,
  message TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- generated_content
CREATE TABLE generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  prompt_input JSONB DEFAULT '{}',
  output TEXT NOT NULL,
  related_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  related_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_settings
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL DEFAULT 'Malcolm Wallaker',
  brokerage_name TEXT NOT NULL DEFAULT 'Pemberton Real Estate',
  phone TEXT,
  email TEXT,
  website TEXT,
  default_tone TEXT DEFAULT 'friendly, local, and confident',
  primary_markets TEXT[] DEFAULT ARRAY['Grand Rapids','Itasca County','Iron Range','Duluth','Brainerd','Ely','Babbitt','Tower','Orr','Cook','Walker','Aitkin'],
  recruiting_value_prop TEXT,
  preferred_lenders TEXT[] DEFAULT '{}',
  va_name TEXT DEFAULT 'Dan',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX ON contacts(user_id);
CREATE INDEX ON contacts(contact_type);
CREATE INDEX ON properties(user_id);
CREATE INDEX ON properties(status);
CREATE INDEX ON tasks(user_id);
CREATE INDEX ON tasks(completed);
CREATE INDEX ON tasks(due_date);
CREATE INDEX ON generated_content(user_id);
CREATE INDEX ON generated_content(content_type);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_contacts" ON contacts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_properties" ON properties FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_tasks" ON tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_conversations" ON conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_generated_content" ON generated_content FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_settings" ON user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
