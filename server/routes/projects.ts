import { Router } from 'express'
import { getDb } from '../lib/db.js'
import { broadcastEvent } from './events.js'

export const projectsRouter = Router()

// GET /api/projects — list projects with task counts
projectsRouter.get('/', (req, res) => {
  try {
    const db = getDb()
    const { status, scope } = req.query

    let sql = `
      SELECT p.*,
        p.task_count,
        p.task_done_count,
        COUNT(t.id) as task_count_total,
        SUM(CASE WHEN t.done = 1 THEN 1 ELSE 0 END) as task_count_done
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE 1=1
    `
    const params: any[] = []

    if (status) {
      sql += ' AND p.status = ?'
      params.push(status)
    } else {
      sql += " AND p.status != 'archived'"
    }

    if (scope && scope !== 'all') {
      sql += ' AND p.scope = ?'
      params.push(scope)
    }

    sql += ' GROUP BY p.id ORDER BY p.priority ASC, p.name ASC'

    const projects = db.prepare(sql).all(...params)
    res.json(projects)
  } catch (err) {
    console.log('[projects] GET / error:', err)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// GET /api/projects/unconnected — entities not connected to any project
projectsRouter.get('/unconnected', (req, res) => {
  try {
    const db = getDb()
    const tasks = db.prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.project_id IS NULL AND t.done = 0
      ORDER BY t.created_at DESC
    `).all()

    const meetings = db.prepare(`
      SELECT * FROM meetings
      WHERE project_id IS NULL
      ORDER BY date DESC
    `).all()

    res.json({ tasks, meetings })
  } catch (err) {
    console.log('[projects] GET /unconnected error:', err)
    res.status(500).json({ error: 'Failed to fetch unconnected entities' })
  }
})

// GET /api/projects/:id/graph — full project graph with all related entities
projectsRouter.get('/:id/graph', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params

    // Project with task counts
    const project = db.prepare(`
      SELECT p.*,
        COUNT(t.id) as task_count_total,
        SUM(CASE WHEN t.done = 1 THEN 1 ELSE 0 END) as task_count_done
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `).get(id)

    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    // Tasks linked to this project
    const tasks = db.prepare(`
      SELECT * FROM tasks WHERE project_id = ? ORDER BY done ASC, sort_order ASC
    `).all(id)

    // Meetings linked to this project
    const meetings = db.prepare(`
      SELECT * FROM meetings WHERE project_id = ? ORDER BY date DESC
    `).all(id)

    // People (indirectly linked via tasks and meeting participants)
    const people = db.prepare(`
      SELECT DISTINCT pe.* FROM people pe WHERE pe.id IN (
        SELECT person_id FROM tasks WHERE project_id = ? AND person_id IS NOT NULL
        UNION
        SELECT mp.person_id FROM meeting_participants mp
          JOIN meetings m ON mp.meeting_id = m.id
          WHERE m.project_id = ? AND mp.person_id IS NOT NULL
      )
    `).all(id, id)

    // Whiteboards linked to this project
    const whiteboards = db.prepare(`
      SELECT * FROM whiteboards WHERE project_id = ? ORDER BY updated_at DESC
    `).all(id)

    res.json({ project, tasks, meetings, people, whiteboards })
  } catch (err) {
    console.log('[projects] GET /:id/graph error:', err)
    res.status(500).json({ error: 'Failed to fetch project graph' })
  }
})

// GET /api/projects/:id — single project with task counts
projectsRouter.get('/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params

    const project = db.prepare(`
      SELECT p.*,
        p.task_count,
        p.task_done_count,
        COUNT(t.id) as task_count_total,
        SUM(CASE WHEN t.done = 1 THEN 1 ELSE 0 END) as task_count_done
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `).get(id)

    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    res.json(project)
  } catch (err) {
    console.log('[projects] GET /:id error:', err)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

// POST /api/projects — create project
projectsRouter.post('/', (req, res) => {
  try {
    const db = getDb()
    const { name, status, scope, priority, start_date, target_date, description } = req.body

    if (!name?.trim()) {
      res.status(400).json({ error: 'name is required' })
      return
    }

    const result = db.prepare(`
      INSERT INTO projects (name, status, scope, priority, start_date, target_date, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      status || 'active',
      scope || 'work',
      priority ?? null,
      start_date || null,
      target_date || null,
      description || null
    )

    const project = db.prepare('SELECT * FROM projects WHERE rowid = ?').get(result.lastInsertRowid)
    broadcastEvent('sync', { type: 'project_created', project })
    res.json(project)
  } catch (err) {
    console.log('[projects] POST / error:', err)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// PATCH /api/projects/:id — action-based update
projectsRouter.patch('/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params
    const { action, ...data } = req.body

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    switch (action) {
      case 'set_status': {
        const { status } = data
        db.prepare(`
          UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?
        `).run(status, id)
        break
      }

      case 'set_priority': {
        const { priority } = data
        db.prepare(`
          UPDATE projects SET priority = ?, updated_at = datetime('now') WHERE id = ?
        `).run(priority ?? null, id)
        break
      }

      case 'set_scope': {
        const { scope } = data
        db.prepare(`
          UPDATE projects SET scope = ?, updated_at = datetime('now') WHERE id = ?
        `).run(scope, id)
        break
      }

      case 'set_dates': {
        const { start_date, target_date } = data
        const setClauses: string[] = []
        const params: any[] = []

        if ('start_date' in data) {
          setClauses.push('start_date = ?')
          params.push(start_date ?? null)
        }
        if ('target_date' in data) {
          setClauses.push('target_date = ?')
          params.push(target_date ?? null)
        }

        if (setClauses.length > 0) {
          setClauses.push("updated_at = datetime('now')")
          params.push(id)
          db.prepare(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`).run(...params)
        }
        break
      }

      case 'edit': {
        const { name, description } = data
        const setClauses: string[] = []
        const params: any[] = []

        if ('name' in data) {
          if (!name?.trim()) {
            res.status(400).json({ error: 'name cannot be empty' })
            return
          }
          setClauses.push('name = ?')
          params.push(name.trim())
        }
        if ('description' in data) {
          setClauses.push('description = ?')
          params.push(description ?? null)
        }

        if (setClauses.length > 0) {
          setClauses.push("updated_at = datetime('now')")
          params.push(id)
          db.prepare(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`).run(...params)
        }
        break
      }

      case 'archive': {
        db.prepare(`
          UPDATE projects SET status = 'archived', updated_at = datetime('now') WHERE id = ?
        `).run(id)
        break
      }

      default: {
        // No action specified — generic field update
        const allowedFields = ['name', 'description', 'status', 'scope', 'priority', 'start_date', 'target_date']
        const setClauses: string[] = []
        const params: any[] = []

        for (const [key, value] of Object.entries(req.body)) {
          if (!allowedFields.includes(key)) continue
          setClauses.push(`${key} = ?`)
          params.push(value ?? null)
        }

        if (setClauses.length === 0) {
          res.status(400).json({ error: 'No valid fields to update' })
          return
        }

        setClauses.push("updated_at = datetime('now')")
        params.push(id)

        db.prepare(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`).run(...params)
        break
      }
    }

    const updated = db.prepare(`
      SELECT p.*,
        p.task_count,
        p.task_done_count,
        COUNT(t.id) as task_count_total,
        SUM(CASE WHEN t.done = 1 THEN 1 ELSE 0 END) as task_count_done
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `).get(id)
    broadcastEvent('sync', { type: 'project_updated', project: updated })
    res.json(updated)
  } catch (err) {
    console.log('[projects] PATCH /:id error:', err)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

// DELETE /api/projects/:id — delete project
projectsRouter.delete('/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(id)
    broadcastEvent('sync', { type: 'project_deleted', id })
    res.json({ success: true, deleted: true })
  } catch (err) {
    console.log('[projects] DELETE /:id error:', err)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})
