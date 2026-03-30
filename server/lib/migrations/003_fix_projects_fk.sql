-- Fix FK references from "projects_old" back to "projects"
-- A prior migration renamed projects and left stale FK references

PRAGMA foreign_keys = OFF;

-- Recreate whiteboards with correct FK
CREATE TABLE whiteboards_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  document_id TEXT UNIQUE REFERENCES documents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  data TEXT,
  thumbnail TEXT,
  meeting_id TEXT REFERENCES meetings(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO whiteboards_new SELECT * FROM whiteboards;
DROP TABLE whiteboards;
ALTER TABLE whiteboards_new RENAME TO whiteboards;

-- Recreate tasks with correct FK
CREATE TABLE tasks_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  priority INTEGER CHECK(priority IS NULL OR priority IN (1, 2, 3)),
  due_date TEXT,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
  scope TEXT NOT NULL DEFAULT 'work' CHECK(scope IN ('work', 'personal')),
  source_document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  source_block_id TEXT,
  parent_task_id TEXT REFERENCES tasks_new(id) ON DELETE CASCADE,
  sort_order REAL NOT NULL DEFAULT 0,
  declined INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO tasks_new SELECT * FROM tasks;
DROP TABLE tasks;
ALTER TABLE tasks_new RENAME TO tasks;
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_done ON tasks(done);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_scope ON tasks(scope);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);

-- Recreate meetings with correct FK
CREATE TABLE meetings_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  document_id TEXT UNIQUE REFERENCES documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  category TEXT,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  calendar_event_id TEXT REFERENCES calendar_events(ical_uid) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO meetings_new SELECT * FROM meetings;
DROP TABLE meetings;
ALTER TABLE meetings_new RENAME TO meetings;
CREATE INDEX idx_meetings_date ON meetings(date);
CREATE INDEX idx_meetings_project ON meetings(project_id);

-- Recreate suggested_actions with correct FK
CREATE TABLE suggested_actions_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  text TEXT NOT NULL,
  assignee_id TEXT REFERENCES people(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  priority INTEGER,
  confidence REAL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO suggested_actions_new SELECT * FROM suggested_actions;
DROP TABLE suggested_actions;
ALTER TABLE suggested_actions_new RENAME TO suggested_actions;
CREATE INDEX idx_suggestions_source ON suggested_actions(source_type, source_id);

PRAGMA foreign_keys = ON;
