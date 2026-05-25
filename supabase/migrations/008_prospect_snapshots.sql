CREATE TABLE prospect_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token       uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  business_name text,
  business_type text,
  city_state  text,
  keywords    text[] NOT NULL DEFAULT '{}',
  rank_data   jsonb  NOT NULL DEFAULT '[]',
  ai_data     jsonb  NOT NULL DEFAULT '[]',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE prospect_snapshots ENABLE ROW LEVEL SECURITY;

-- Anyone can read a snapshot if they have the token
CREATE POLICY "public read" ON prospect_snapshots
  FOR SELECT USING (true);

-- Only authenticated users can create snapshots
CREATE POLICY "authenticated insert" ON prospect_snapshots
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
