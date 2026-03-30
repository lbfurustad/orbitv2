-- Migration 004: Add Things-inspired fields to tasks and progress tracking to projects

-- Add Things-inspired fields to tasks
ALTER TABLE tasks ADD COLUMN scheduled_date TEXT;     -- "When" i Things: når du planlegger å gjøre det
ALTER TABLE tasks ADD COLUMN deadline TEXT;            -- Hard deadline (separat fra scheduled_date)
ALTER TABLE tasks ADD COLUMN is_evening INTEGER NOT NULL DEFAULT 0;  -- "This Evening" i Things
ALTER TABLE tasks ADD COLUMN someday INTEGER NOT NULL DEFAULT 0;     -- Parkert i Someday
ALTER TABLE tasks ADD COLUMN starred INTEGER NOT NULL DEFAULT 0;     -- Stjernemerket for Today

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_someday ON tasks(someday);
CREATE INDEX IF NOT EXISTS idx_tasks_starred ON tasks(starred);

-- Add progress tracking to projects
ALTER TABLE projects ADD COLUMN task_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN task_done_count INTEGER NOT NULL DEFAULT 0;
