import { Router } from 'express'
import { getDb } from '../lib/db.js'
import { broadcastEvent } from './events.js'

export const whiteboardsRouter = Router()

// GET /api/whiteboards - list all whiteboards
whiteboardsRouter.get('/', (req, res) => {
  try {
    const db = getDb()
    const { project_id, meeting_id } = req.query

    let sql = `
      SELECT w.*, p.name as project_name, m.title as meeting_title
      FROM whiteboards w
      LEFT JOIN projects p ON w.project_id = p.id
      LEFT JOIN meetings m ON w.meeting_id = m.id
      WHERE 1=1
    `
    const params: any[] = []

    if (project_id) {
      sql += ' AND w.project_id = ?'
      params.push(project_id)
    }
    if (meeting_id) {
      sql += ' AND w.meeting_id = ?'
      params.push(meeting_id)
    }

    sql += ' ORDER BY w.updated_at DESC'

    const rows = db.prepare(sql).all(...params)
    res.json(rows)
  } catch (err) {
    console.log('[whiteboards] GET / error:', err)
    res.status(500).json({ error: 'Failed to fetch whiteboards' })
  }
})

// GET /api/whiteboards/:id - get whiteboard with excalidraw data
whiteboardsRouter.get('/:id', (req, res) => {
  try {
    const db = getDb()
    const wb = db.prepare(`
      SELECT w.*, p.name as project_name, m.title as meeting_title
      FROM whiteboards w
      LEFT JOIN projects p ON w.project_id = p.id
      LEFT JOIN meetings m ON w.meeting_id = m.id
      WHERE w.id = ?
    `).get(req.params.id) as any

    if (!wb) {
      res.status(404).json({ error: 'Whiteboard not found' })
      return
    }

    // Parse data JSON
    if (wb.data) {
      try { wb.data = JSON.parse(wb.data) } catch { wb.data = null }
    }

    res.json(wb)
  } catch (err) {
    console.log('[whiteboards] GET /:id error:', err)
    res.status(500).json({ error: 'Failed to fetch whiteboard' })
  }
})

// POST /api/whiteboards - create new whiteboard
whiteboardsRouter.post('/', (req, res) => {
  try {
    const db = getDb()
    const { name, project_id, meeting_id } = req.body

    if (!name?.trim()) {
      res.status(400).json({ error: 'name is required' })
      return
    }

    const emptyData = {
      type: 'excalidraw',
      version: 2,
      source: 'orbit',
      elements: [],
      appState: { viewBackgroundColor: '#121212' },
      files: {},
    }

    const result = db.prepare(`
      INSERT INTO whiteboards (name, data, project_id, meeting_id)
      VALUES (?, ?, ?, ?)
    `).run(
      name.trim(),
      JSON.stringify(emptyData),
      project_id || null,
      meeting_id || null,
    )

    const wb = db.prepare('SELECT * FROM whiteboards WHERE rowid = ?').get(result.lastInsertRowid)
    broadcastEvent('sync', { type: 'whiteboard_created', whiteboard: wb })
    res.json(wb)
  } catch (err) {
    console.log('[whiteboards] POST / error:', err)
    res.status(500).json({ error: 'Failed to create whiteboard' })
  }
})

// PUT /api/whiteboards/:id - save excalidraw data (auto-save)
whiteboardsRouter.put('/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params
    const { data, thumbnail } = req.body

    const wb = db.prepare('SELECT id FROM whiteboards WHERE id = ?').get(id)
    if (!wb) {
      res.status(404).json({ error: 'Whiteboard not found' })
      return
    }

    const setClauses: string[] = ["updated_at = datetime('now')"]
    const params: any[] = []

    if (data) {
      setClauses.push('data = ?')
      params.push(JSON.stringify(data))
    }
    if (thumbnail) {
      setClauses.push('thumbnail = ?')
      params.push(thumbnail)
    }

    params.push(id)
    db.prepare(`UPDATE whiteboards SET ${setClauses.join(', ')} WHERE id = ?`).run(...params)

    res.json({ success: true })
  } catch (err) {
    console.log('[whiteboards] PUT /:id error:', err)
    res.status(500).json({ error: 'Failed to save whiteboard' })
  }
})

// PATCH /api/whiteboards/:id - update metadata (name, project, meeting)
whiteboardsRouter.patch('/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params

    const wb = db.prepare('SELECT id FROM whiteboards WHERE id = ?').get(id)
    if (!wb) {
      res.status(404).json({ error: 'Whiteboard not found' })
      return
    }

    const allowedFields = ['name', 'project_id', 'meeting_id']
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
    db.prepare(`UPDATE whiteboards SET ${setClauses.join(', ')} WHERE id = ?`).run(...params)

    const updated = db.prepare(`
      SELECT w.*, p.name as project_name, m.title as meeting_title
      FROM whiteboards w
      LEFT JOIN projects p ON w.project_id = p.id
      LEFT JOIN meetings m ON w.meeting_id = m.id
      WHERE w.id = ?
    `).get(id)
    broadcastEvent('sync', { type: 'whiteboard_updated', whiteboard: updated })
    res.json(updated)
  } catch (err) {
    console.log('[whiteboards] PATCH /:id error:', err)
    res.status(500).json({ error: 'Failed to update whiteboard' })
  }
})

// DELETE /api/whiteboards/:id
whiteboardsRouter.delete('/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params

    const wb = db.prepare('SELECT id FROM whiteboards WHERE id = ?').get(id)
    if (!wb) {
      res.status(404).json({ error: 'Whiteboard not found' })
      return
    }

    db.prepare('DELETE FROM whiteboards WHERE id = ?').run(id)
    broadcastEvent('sync', { type: 'whiteboard_deleted', id })
    res.json({ success: true, deleted: true })
  } catch (err) {
    console.log('[whiteboards] DELETE /:id error:', err)
    res.status(500).json({ error: 'Failed to delete whiteboard' })
  }
})
