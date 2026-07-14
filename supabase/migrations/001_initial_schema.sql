-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Custom types
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE saved_job_status AS ENUM (
  'saved',
  'applied',
  'interview',
  'offer',
  'rejected',
  'archived'
);
CREATE TYPE employment_type AS ENUM (
  'full_time',
  'part_time',
  'contract',
  'internship',
  'freelance',
  'unknown'
);
CREATE TYPE seniority_level AS ENUM (
  'intern',
  'junior',
  'mid',
  'senior',
  'lead',
  'staff',
  'principal',
  'unknown'
);
CREATE TYPE ingestion_status AS ENUM ('running', 'completed', 'failed');
CREATE TYPE notification_frequency AS ENUM ('instant', 'daily', 'weekly', 'none');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search queries for X API ingestion
CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (interval_minutes BETWEEN 30 AND 1440),
  last_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Raw X posts
CREATE TABLE x_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tweet_id TEXT NOT NULL UNIQUE,
  author_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  text TEXT NOT NULL,
  url TEXT NOT NULL,
  language TEXT,
  hashtags TEXT[] DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  media JSONB DEFAULT '[]',
  urls TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  raw_json JSONB NOT NULL,
  tweet_created_at TIMESTAMPTZ NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Parsed jobs
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tweet_id TEXT NOT NULL UNIQUE REFERENCES x_posts(tweet_id) ON DELETE CASCADE,
  company TEXT,
  title TEXT,
  description TEXT,
  location TEXT,
  country TEXT,
  remote BOOLEAN DEFAULT false,
  employment_type employment_type DEFAULT 'unknown',
  seniority seniority_level DEFAULT 'unknown',
  technologies TEXT[] DEFAULT '{}',
  salary_min NUMERIC,
  salary_max NUMERIC,
  currency TEXT,
  application_url TEXT,
  application_email TEXT,
  recruiter TEXT,
  quality_score INTEGER DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  rejection_reason TEXT,
  is_rejected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saved jobs / application tracking
CREATE TABLE saved_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status saved_job_status NOT NULL DEFAULT 'saved',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- User job preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_roles TEXT[] DEFAULT '{}',
  technologies TEXT[] DEFAULT '{}',
  preferred_locations TEXT[] DEFAULT '{}',
  preferred_countries TEXT[] DEFAULT '{}',
  preferred_seniority seniority_level[] DEFAULT '{}',
  remote_only BOOLEAN DEFAULT false,
  excluded_keywords TEXT[] DEFAULT '{}',
  min_salary NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ingestion runs
CREATE TABLE ingestion_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID REFERENCES search_queries(id) ON DELETE SET NULL,
  status ingestion_status NOT NULL DEFAULT 'running',
  fetched_posts INTEGER DEFAULT 0,
  imported_jobs INTEGER DEFAULT 0,
  rejected_posts INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- Spam filters
CREATE TABLE blocked_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL UNIQUE,
  reason TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE blocked_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain TEXT NOT NULL UNIQUE,
  reason TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification settings
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  frequency notification_frequency DEFAULT 'daily',
  min_match_score INTEGER DEFAULT 70 CHECK (min_match_score BETWEEN 0 AND 100),
  last_digest_sent TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search history
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ingestion lock (prevent concurrent runs)
CREATE TABLE ingestion_locks (
  id TEXT PRIMARY KEY DEFAULT 'global',
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_by TEXT
);

-- Indexes
CREATE INDEX idx_x_posts_tweet_created_at ON x_posts(tweet_created_at DESC);
CREATE INDEX idx_x_posts_username ON x_posts(username);
CREATE INDEX idx_x_posts_hashtags ON x_posts USING GIN(hashtags);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_remote ON jobs(remote);
CREATE INDEX idx_jobs_country ON jobs(country);
CREATE INDEX idx_jobs_seniority ON jobs(seniority);
CREATE INDEX idx_jobs_employment_type ON jobs(employment_type);
CREATE INDEX idx_jobs_technologies ON jobs USING GIN(technologies);
CREATE INDEX idx_jobs_quality_score ON jobs(quality_score DESC);
CREATE INDEX idx_jobs_is_rejected ON jobs(is_rejected);
CREATE INDEX idx_jobs_title_trgm ON jobs USING GIN(title gin_trgm_ops);
CREATE INDEX idx_jobs_company_trgm ON jobs USING GIN(company gin_trgm_ops);
CREATE INDEX idx_saved_jobs_user_id ON saved_jobs(user_id);
CREATE INDEX idx_saved_jobs_status ON saved_jobs(status);
CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_ingestion_runs_query_id ON ingestion_runs(query_id);
CREATE INDEX idx_ingestion_runs_started_at ON ingestion_runs(started_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER saved_jobs_updated_at BEFORE UPDATE ON saved_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER search_queries_updated_at BEFORE UPDATE ON search_queries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER notification_settings_updated_at BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO user_preferences (user_id) VALUES (NEW.id);
  INSERT INTO notification_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_locks ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (is_admin());

-- x_posts: readable by authenticated users, writable by service role only
CREATE POLICY "Authenticated users can read x_posts" ON x_posts
  FOR SELECT TO authenticated USING (true);

-- jobs: readable by authenticated, rejected hidden from non-admins
CREATE POLICY "Users can read non-rejected jobs" ON jobs
  FOR SELECT TO authenticated
  USING (is_rejected = false OR is_admin());

-- saved_jobs
CREATE POLICY "Users manage own saved jobs" ON saved_jobs
  FOR ALL USING (auth.uid() = user_id);

-- user_preferences
CREATE POLICY "Users manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- search_queries: admin only
CREATE POLICY "Admins manage search queries" ON search_queries
  FOR ALL USING (is_admin());
CREATE POLICY "Authenticated can read enabled queries" ON search_queries
  FOR SELECT TO authenticated USING (enabled = true OR is_admin());

-- ingestion_runs: admin only
CREATE POLICY "Admins manage ingestion runs" ON ingestion_runs
  FOR ALL USING (is_admin());

-- blocked_keywords/domains: admin write, service read
CREATE POLICY "Admins manage blocked keywords" ON blocked_keywords
  FOR ALL USING (is_admin());
CREATE POLICY "Authenticated read blocked keywords" ON blocked_keywords
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage blocked domains" ON blocked_domains
  FOR ALL USING (is_admin());
CREATE POLICY "Authenticated read blocked domains" ON blocked_domains
  FOR SELECT TO authenticated USING (true);

-- notification_settings
CREATE POLICY "Users manage own notifications" ON notification_settings
  FOR ALL USING (auth.uid() = user_id);

-- search_history
CREATE POLICY "Users manage own search history" ON search_history
  FOR ALL USING (auth.uid() = user_id);

-- audit_logs: admin read, users see own
CREATE POLICY "Users see own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins see all audit logs" ON audit_logs
  FOR SELECT USING (is_admin());

-- ingestion_locks: admin only
CREATE POLICY "Admins manage ingestion locks" ON ingestion_locks
  FOR ALL USING (is_admin());

-- Seed default search query
INSERT INTO search_queries (name, query, enabled, interval_minutes) VALUES
(
  'Tech Hiring Posts',
  '(#hiring OR #jobs OR #remotejobs OR "we are hiring") ("software engineer" OR "frontend developer" OR "backend developer" OR "full stack developer") lang:en -is:retweet',
  true,
  60
);

-- Seed default blocked keywords
INSERT INTO blocked_keywords (keyword, reason) VALUES
  ('giveaway', 'Fake giveaway spam'),
  ('airdrop', 'Crypto scam'),
  ('telegram only', 'Telegram-only contact'),
  ('dm for details', 'Low quality recruitment ad'),
  ('work from phone', 'Scam pattern'),
  ('passive income', 'Scam pattern'),
  ('crypto', 'Crypto scam'),
  ('nft', 'Crypto/NFT spam'),
  ('forex', 'Forex scam'),
  ('binary options', 'Scam pattern');

-- Seed default blocked domains
INSERT INTO blocked_domains (domain, reason) VALUES
  ('bit.ly', 'URL shortener spam'),
  ('tinyurl.com', 'URL shortener spam'),
  ('t.co', 'Allow t.co from X but flag separately in parser'),
  ('t.me', 'Telegram-only contact'),
  ('telegram.me', 'Telegram-only contact');
