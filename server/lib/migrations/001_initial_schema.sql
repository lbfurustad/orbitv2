PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE documents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  type TEXT NOT NULL CHECK(type IN ('daily_note', 'meeting', 'project', 'person', 'journal', 'note', 'whiteboard')),
  title TEXT NOT NULL,
  date TEXT,
  content TEXT,  -- ProseMirror JSON blob
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_date ON documents(date);

CREATE TABLE tasks (
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
  parent_task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  sort_order REAL NOT NULL DEFAULT 0,
  declined INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_done ON tasks(done);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_scope ON tasks(scope);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);

CREATE TABLE projects (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  document_id TEXT UNIQUE REFERENCES documents(id) ON DELETE SET NULL,
  name TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('backlog', 'active', 'paused', 'done', 'archived')),
  scope TEXT NOT NULL DEFAULT 'work' CHECK(scope IN ('work', 'personal')),
  priority INTEGER,
  start_date TEXT,
  target_date TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_projects_status ON projects(status);

CREATE TABLE people (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  document_id TEXT UNIQUE REFERENCES documents(id) ON DELETE SET NULL,
  name TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  company TEXT,
  department TEXT,
  team TEXT,
  category TEXT CHECK(category IS NULL OR category IN ('colleague', 'manager', 'report', 'client', 'vendor', 'personal', 'other')),
  reports_to_id TEXT REFERENCES people(id) ON DELETE SET NULL,
  avatar_url TEXT,
  notes TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_people_company ON people(company);
CREATE INDEX idx_people_category ON people(category);

CREATE TABLE meetings (
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
CREATE INDEX idx_meetings_date ON meetings(date);
CREATE INDEX idx_meetings_project ON meetings(project_id);

CREATE TABLE meeting_participants (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
  person_name TEXT NOT NULL
);
CREATE INDEX idx_mp_meeting ON meeting_participants(meeting_id);
CREATE INDEX idx_mp_person ON meeting_participants(person_id);

CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  document_id TEXT UNIQUE REFERENCES documents(id) ON DELETE SET NULL,
  date TEXT UNIQUE NOT NULL,
  mood TEXT,
  energy INTEGER CHECK(energy IS NULL OR (energy >= 1 AND energy <= 5)),
  highlight TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_journal_date ON journal_entries(date);

CREATE TABLE daily_notes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  document_id TEXT UNIQUE REFERENCES documents(id) ON DELETE SET NULL,
  date TEXT UNIQUE NOT NULL,
  habit_walk INTEGER DEFAULT 0,
  habit_weight INTEGER DEFAULT 0,
  habit_weight_value REAL,
  habit_water INTEGER DEFAULT 0,
  habit_journal INTEGER DEFAULT 0,
  banner_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_daily_date ON daily_notes(date);

CREATE TABLE tags (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT UNIQUE NOT NULL,
  color TEXT,
  icon TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE taggings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK(target_type IN ('block', 'task', 'document')),
  target_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tag_id, target_type, target_id)
);
CREATE INDEX idx_taggings_target ON taggings(target_type, target_id);
CREATE INDEX idx_taggings_tag ON taggings(tag_id);

CREATE TABLE calendar_events (
  ical_uid TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  local_date TEXT NOT NULL,
  location TEXT DEFAULT '',
  organizer TEXT DEFAULT '',
  required_attendees TEXT DEFAULT '',
  optional_attendees TEXT DEFAULT '',
  is_all_day INTEGER DEFAULT 0,
  is_teams INTEGER DEFAULT 0,
  teams_link TEXT DEFAULT '',
  outlook_link TEXT DEFAULT '',
  importance TEXT DEFAULT 'normal',
  show_as TEXT DEFAULT 'busy',
  sensitivity TEXT DEFAULT 'normal',
  response_type TEXT DEFAULT '',
  body_preview TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_cal_date ON calendar_events(local_date);

CREATE TABLE inbox_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  content TEXT NOT NULL,
  classified_type TEXT,
  confidence REAL DEFAULT 0,
  routed_to_type TEXT,
  routed_to_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'routed', 'dismissed')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE whiteboards (
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

CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Ny samtale',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_chat_session ON chat_messages(session_id, created_at);

CREATE TABLE suggested_actions (
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
CREATE INDEX idx_suggestions_source ON suggested_actions(source_type, source_id);
