-- Migration 002: Replace 'paused' with 'someday' in projects status constraint
-- SQLite doesn't support ALTER COLUMN, so we rebuild the table

PRAGMA foreign_keys = OFF;

-- Step 1: Update existing 'paused' rows to 'someday'
UPDATE projects SET status = 'someday' WHERE status = 'paused';

-- Step 2: Rename old table
ALTER TABLE projects RENAME TO projects_old;

-- Step 3: Create new table with updated CHECK constraint
CREATE TABLE projects (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  document_id TEXT UNIQUE REFERENCES documents(id) ON DELETE SET NULL,
  name TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('backlog', 'active', 'someday', 'done', 'archived')),
  scope TEXT NOT NULL DEFAULT 'work' CHECK(scope IN ('work', 'personal')),
  priority INTEGER,
  start_date TEXT,
  target_date TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 4: Copy data from old table
INSERT INTO projects (id, document_id, name, status, scope, priority, start_date, target_date, description, created_at, updated_at)
  SELECT id, document_id, name, status, scope, priority, start_date, target_date, description, created_at, updated_at
  FROM projects_old;

-- Step 5: Drop old table
DROP TABLE projects_old;

-- Step 6: Recreate index
CREATE INDEX idx_projects_status ON projects(status);

PRAGMA foreign_keys = ON;
