import { Router } from 'express'
import { getDb } from '../lib/db.js'
import { broadcastEvent } from './events.js'

export const tasksRouter = Router()

/**
 * Update project task_count and task_done_count after any task mutation.
 */
function updateProjectCounts(projectId: string | null | undefined) {
  const db = getDb()
  if (!projectId) return
  const counts = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) as done
    FROM tasks WHERE project_id = ? AND declined = 0
  `).get(projectId) as any
  db.prepare(`
    UPDATE projects SET task_count = ?, task_done_count = ?, updated_at = datetime('now') WHERE id = ?
  `).run(counts.total || 0, counts.done || 0, projectId)
}

// GET /api/tasks — list with filters
tasksRouter.get('/', (req, res) => {
  try {
    const db = getDb()
    const { scope, done, project_id, person_id, source_type, due_date, inbox, view } = req.query

    // Things-inspired views
    if (view) {
      const today = new Date().toISOString().split('T')[0]
      let sql = ''
      const params: any[] = []

      switch (view) {
        case 'today': {
          sql = `
            SELECT t.*, p.name as project_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.done = 0 AND t.declined = 0
              AND (t.starred = 1 OR t.scheduled_date = ? OR t.deadline = ?)
            ORDER BY t.is_evening ASC, t.sort_order ASC, t.created_at DESC
          `
          params.push(today, today)
          break
        }
        case 'upcoming': {
          sql = `
            SELECT t.*, p.name as project_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.done = 0 AND t.declined = 0
              AND (t.scheduled_date > ? OR t.deadline > ?)
            ORDER BY COALESCE(t.scheduled_date, t.deadline) ASC, t.sort_order ASC
          `
          params.push(today, today)
          break
        }
        case 'anytime': {
          sql = `
            SELECT t.*, p.name as project_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.someday = 0 AND t.done = 0 AND t.declined = 0
            ORDER BY t.sort_order ASC, t.created_at DESC
          `
          break
        }
        case 'someday': {
          sql = `
            SELECT t.*, p.name as project_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.someday = 1 AND t.declined = 0
            ORDER BY t.sort_order ASC, t.created_at DESC
          `
          break
        }
        case 'evening': {
          sql = `
            SELECT t.*, p.name as project_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.is_evening = 1 AND t.done = 0 AND t.declined = 0
              AND (t.starred = 1 OR t.scheduled_date = ?)
            ORDER BY t.sort_order ASC, t.created_at DESC
          `
          params.push(today)
          break
        }
        case 'completed': {
          sql = `
            SELECT t.*, p.name as project_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.done = 1
            ORDER BY t.completed_at DESC
          `
          break
        }
        case 'inbox': {
          sql = `
            SELECT t.*, p.name as project_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.project_id IS NULL
              AND t.scheduled_date IS NULL
              AND t.someday = 0
              AND t.done = 0
              AND t.declined = 0
            ORDER BY t.sort_order ASC, t.created_at DESC
          `
          break
        }
        case 'no_date': {
          sql = `
            SELECT t.*, p.name as project_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.scheduled_date IS NULL
              AND t.deadline IS NULL
              AND t.done = 0
              AND t.someday = 0
              AND t.declined = 0
            ORDER BY t.sort_order ASC, t.created_at DESC
          `
          break
        }
        default: {
          res.status(400).json({ error: `Unknown view: ${view}` })
          return
        }
      }

      const tasks = db.prepare(sql).all(...params)
      res.json(tasks)
      return
    }

    // Legacy filter-based queries
    let sql = `
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1
    `
    const params: any[] = []

    if (scope && scope !== 'all') {
      sql += ' AND t.scope = ?'
      params.push(scope)
    }
    if (project_id) {
      sql += ' AND t.project_id = ?'
      params.push(project_id)
    }
    if (person_id) {
      sql += ' AND t.person_id = ?'
      params.push(person_id)
    }
    if (done !== undefined) {
      sql += ' AND t.done = ?'
      params.push(done === 'true' ? 1 : 0)
    }
    if (source_type) {
      const types = String(source_type).split(',').map(s => s.trim()).filter(Boolean)
      if (types.length === 1) {
        sql += ' AND t.source_document_id IN (SELECT id FROM documents WHERE type = ?)'
        params.push(types[0])
      } else if (types.length > 1) {
        sql += ` AND t.source_document_id IN (SELECT id FROM documents WHERE type IN (${types.map(() => '?').join(',')}))`
        params.push(...types)
      }
    }

    // Date-based filters
    if (due_date === 'today') {
      sql += " AND t.due_date = date('now')"
    } else if (due_date === 'this_week') {
      // Monday to Sunday of current week
      sql += " AND t.due_date >= date('now', 'weekday 1', '-7 days') AND t.due_date <= date('now', 'weekday 0')"
    } else if (due_date === 'upcoming') {
      sql += " AND t.due_date > date('now') AND t.done = 0"
    } else if (due_date === 'none') {
      sql += ' AND t.due_date IS NULL AND t.done = 0'
    }

    // Inbox: tasks without project and without due_date
    if (inbox === 'true') {
      sql += ' AND t.project_id IS NULL AND t.due_date IS NULL AND t.done = 0'
    }

    sql += ' ORDER BY t.done ASC, t.sort_order ASC, t.created_at DESC'

    const tasks = db.prepare(sql).all(...params)
    res.json(tasks)
  } catch (err) {
    console.log('[tasks] GET / error:', err)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

// POST /api/tasks — create task
tasksRouter.post('/', (req, res) => {
  try {
    const db = getDb()
    const {
      text, project_id, scope, priority, due_date, parent_task_id,
      source_document_id, source_block_id,
      scheduled_date, deadline, is_evening, someday, starred
    } = req.body

    if (!text?.trim()) {
      res.status(400).json({ error: 'text is required' })
      return
    }

    // Get next sort_order
    const maxOrder = db.prepare(
      'SELECT MAX(sort_order) as max_order FROM tasks WHERE done = 0'
    ).get() as any
    const sortOrder = (maxOrder?.max_order ?? 0) + 1

    const result = db.prepare(`
      INSERT INTO tasks (text, project_id, scope, priority, due_date, parent_task_id, source_document_id, source_block_id, sort_order, scheduled_date, deadline, is_evening, someday, starred)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      text.trim(),
      project_id || null,
      scope || 'work',
      priority || null,
      due_date || null,
      parent_task_id || null,
      source_document_id || null,
      source_block_id || null,
      sortOrder,
      scheduled_date || null,
      deadline || null,
      is_evening ? 1 : 0,
      someday ? 1 : 0,
      starred ? 1 : 0
    )

    const task = db.prepare('SELECT * FROM tasks WHERE rowid = ?').get(result.lastInsertRowid) as any
    updateProjectCounts(task?.project_id)
    broadcastEvent('sync', { type: 'task_created', task })
    res.json(task)
  } catch (err) {
    console.log('[tasks] POST / error:', err)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// POST /api/tasks/batch — bulk update tasks (for drag-and-drop etc.)
tasksRouter.post('/batch', (req, res) => {
  try {
    const db = getDb()
    const { ids, updates } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids array is required' })
      return
    }
    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ error: 'updates object is required' })
      return
    }

    const allowedFields = ['starred', 'scheduled_date', 'someday', 'project_id', 'is_evening', 'sort_order']
    const setClauses: string[] = []
    const updateValues: any[] = []

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue
      setClauses.push(`${key} = ?`)
      updateValues.push(value ?? null)
    }

    if (setClauses.length === 0) {
      res.status(400).json({ error: 'No valid fields to update' })
      return
    }

    setClauses.push("updated_at = datetime('now')")

    // Collect affected project_ids before update (for count refresh)
    const placeholders = ids.map(() => '?').join(',')
    const beforeTasks = db.prepare(`SELECT id, project_id FROM tasks WHERE id IN (${placeholders})`).all(...ids) as any[]
    const affectedProjectIds = new Set<string>()
    for (const t of beforeTasks) {
      if (t.project_id) affectedProjectIds.add(t.project_id)
    }

    // If moving to a new project, track that too
    if ('project_id' in updates && updates.project_id) {
      affectedProjectIds.add(updates.project_id)
    }

    const stmt = db.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`)
    const updateMany = db.transaction(() => {
      for (const id of ids) {
        stmt.run(...updateValues, id)
      }
    })
    updateMany()

    // Update project counts for all affected projects
    for (const pid of affectedProjectIds) {
      updateProjectCounts(pid)
    }

    const updated = db.prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id IN (${placeholders})
    `).all(...ids)

    broadcastEvent('sync', { type: 'tasks_batch_updated', tasks: updated })
    res.json(updated)
  } catch (err) {
    console.log('[tasks] POST /batch error:', err)
    res.status(500).json({ error: 'Failed to batch update tasks' })
  }
})

// GET /api/tasks/:id — get single task
tasksRouter.get('/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params

    const task = db.prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `).get(id) as any

    if (!task) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    res.json(task)
  } catch (err) {
    console.log('[tasks] GET /:id error:', err)
    res.status(500).json({ error: 'Failed to fetch task' })
  }
})

// PATCH /api/tasks/:id — operations via action field
tasksRouter.patch('/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params
    const { action, ...data } = req.body

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any
    if (!task) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    // Track old project_id for count updates when project changes
    const oldProjectId = task.project_id

    switch (action) {
      case 'toggle': {
        const newDone = task.done ? 0 : 1
        db.prepare(`
          UPDATE tasks SET done = ?, completed_at = ?, updated_at = datetime('now') WHERE id = ?
        `).run(newDone, newDone ? new Date().toISOString() : null, id)
        break
      }

      case 'edit': {
        const { text } = data
        if (!text?.trim()) {
          res.status(400).json({ error: 'text is required for edit' })
          return
        }
        db.prepare(`
          UPDATE tasks SET text = ?, updated_at = datetime('now') WHERE id = ?
        `).run(text.trim(), id)
        break
      }

      case 'delete': {
        db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
        updateProjectCounts(oldProjectId)
        broadcastEvent('sync', { type: 'task_deleted', id })
        res.json({ success: true, deleted: true })
        return
      }

      case 'set_priority': {
        const { priority } = data
        db.prepare(`
          UPDATE tasks SET priority = ?, updated_at = datetime('now') WHERE id = ?
        `).run(priority ?? null, id)
        break
      }

      case 'set_due_date': {
        const { due_date } = data
        db.prepare(`
          UPDATE tasks SET due_date = ?, updated_at = datetime('now') WHERE id = ?
        `).run(due_date ?? null, id)
        break
      }

      case 'set_project': {
        const { project_id: newProjectId } = data
        db.prepare(`
          UPDATE tasks SET project_id = ?, updated_at = datetime('now') WHERE id = ?
        `).run(newProjectId ?? null, id)
        // Update counts for both old and new project
        updateProjectCounts(oldProjectId)
        updateProjectCounts(newProjectId)
        break
      }

      case 'decline': {
        db.prepare(`
          UPDATE tasks SET declined = 1, updated_at = datetime('now') WHERE id = ?
        `).run(id)
        break
      }

      // --- Things 3-inspired actions ---

      case 'star': {
        const today = new Date().toISOString().split('T')[0]
        db.prepare(`
          UPDATE tasks SET starred = 1, scheduled_date = ?, updated_at = datetime('now') WHERE id = ?
        `).run(today, id)
        break
      }

      case 'unstar': {
        const today = new Date().toISOString().split('T')[0]
        // Only clear scheduled_date if it was set to today (don't remove future schedules)
        if (task.scheduled_date === today) {
          db.prepare(`
            UPDATE tasks SET starred = 0, scheduled_date = NULL, updated_at = datetime('now') WHERE id = ?
          `).run(id)
        } else {
          db.prepare(`
            UPDATE tasks SET starred = 0, updated_at = datetime('now') WHERE id = ?
          `).run(id)
        }
        break
      }

      case 'schedule': {
        const { date } = data
        db.prepare(`
          UPDATE tasks SET scheduled_date = ?, updated_at = datetime('now') WHERE id = ?
        `).run(date ?? null, id)
        break
      }

      case 'set_deadline': {
        const { deadline } = data
        db.prepare(`
          UPDATE tasks SET deadline = ?, updated_at = datetime('now') WHERE id = ?
        `).run(deadline ?? null, id)
        break
      }

      case 'set_evening': {
        const newEvening = task.is_evening ? 0 : 1
        db.prepare(`
          UPDATE tasks SET is_evening = ?, updated_at = datetime('now') WHERE id = ?
        `).run(newEvening, id)
        break
      }

      case 'set_someday': {
        db.prepare(`
          UPDATE tasks SET someday = 1, starred = 0, scheduled_date = NULL, updated_at = datetime('now') WHERE id = ?
        `).run(id)
        break
      }

      case 'unset_someday': {
        db.prepare(`
          UPDATE tasks SET someday = 0, updated_at = datetime('now') WHERE id = ?
        `).run(id)
        break
      }

      case 'move_to_project': {
        const { project_id: targetProjectId } = data
        db.prepare(`
          UPDATE tasks SET project_id = ?, updated_at = datetime('now') WHERE id = ?
        `).run(targetProjectId ?? null, id)
        // Update counts for both old and new project
        updateProjectCounts(oldProjectId)
        updateProjectCounts(targetProjectId)
        break
      }

      case 'reorder': {
        const { sort_order } = data
        if (sort_order === undefined || sort_order === null) {
          res.status(400).json({ error: 'sort_order is required for reorder' })
          return
        }
        db.prepare(`
          UPDATE tasks SET sort_order = ?, updated_at = datetime('now') WHERE id = ?
        `).run(sort_order, id)
        break
      }

      default: {
        // No action specified — do a generic field update
        const allowedFields = [
          'text', 'done', 'priority', 'due_date', 'project_id', 'person_id', 'scope',
          'sort_order', 'declined', 'parent_task_id',
          'scheduled_date', 'deadline', 'is_evening', 'someday', 'starred'
        ]
        const setClauses: string[] = []
        const params: any[] = []

        for (const [key, value] of Object.entries(req.body)) {
          if (!allowedFields.includes(key)) continue
          setClauses.push(`${key} = ?`)
          params.push(value ?? null)
        }

        // Handle done toggle — set completed_at
        if ('done' in req.body) {
          setClauses.push('completed_at = ?')
          params.push(req.body.done ? new Date().toISOString() : null)
        }

        if (setClauses.length === 0) {
          res.status(400).json({ error: 'No valid fields to update' })
          return
        }

        setClauses.push("updated_at = datetime('now')")
        params.push(id)

        db.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...params)

        // If project changed via generic update, refresh counts
        if ('project_id' in req.body) {
          updateProjectCounts(oldProjectId)
          updateProjectCounts(req.body.project_id)
        }
        break
      }
    }

    // Update project counts after toggle (done state changed)
    if (action === 'toggle') {
      updateProjectCounts(task.project_id)
    }

    const updated = db.prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `).get(id)
    broadcastEvent('sync', { type: 'task_updated', task: updated })
    res.json(updated)
  } catch (err) {
    console.log('[tasks] PATCH /:id error:', err)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

// GET /api/tasks/:id/subtasks — get subtasks for a task
tasksRouter.get('/:id/subtasks', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params

    const subtasks = db.prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.parent_task_id = ?
      ORDER BY t.done ASC, t.sort_order ASC, t.created_at DESC
    `).all(id)

    res.json(subtasks)
  } catch (err) {
    console.log('[tasks] GET /:id/subtasks error:', err)
    res.status(500).json({ error: 'Failed to fetch subtasks' })
  }
})
