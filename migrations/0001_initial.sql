-- Webbon D1 schema foundation. Apply with: npx wrangler d1 execute webbon-db --remote --file=migrations/0001_initial.sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  location TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  website_url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS websites (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','in_progress','review','preview_sent','published','needs_information')),
  template_key TEXT NOT NULL DEFAULT 'studio',
  content_json TEXT NOT NULL DEFAULT '{}',
  preview_url TEXT NOT NULL DEFAULT '',
  production_url TEXT NOT NULL DEFAULT '',
  assigned_to TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS website_versions (
  id TEXT PRIMARY KEY,
  website_id TEXT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content_json TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(website_id, version_number)
);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  website_id TEXT REFERENCES websites(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT '',
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_websites_status ON websites(status);
CREATE INDEX IF NOT EXISTS idx_websites_business_id ON websites(business_id);
CREATE INDEX IF NOT EXISTS idx_activity_website_id ON activity_log(website_id);
