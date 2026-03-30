-- Create palazzi table (buildings/folders)
CREATE TABLE IF NOT EXISTS palazzi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vetrate table (glass windows/images)
CREATE TABLE IF NOT EXISTS vetrate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  palazzo_id UUID NOT NULL REFERENCES palazzi(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_vetrate_palazzo_id ON vetrate(palazzo_id);
