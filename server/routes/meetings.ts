import { Router } from 'express'
import { getDb } from '../lib/db.js'
import { broadcastEvent } from './events.js'

export const meetingsRouter = Router()

// PATCH /api/meetings/:id — update meeting fields (primarily project_id)
meetingsRouter.patch('/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params

    const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(id)
    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' })
      return
    }

    const allowedFields = ['project_id', 'title', 'category']
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

    db.prepare(`UPDATE meetings SET ${setClauses.join(', ')} WHERE id = ?`).run(...params)

    const updated = db.prepare('SELECT * FROM meetings WHERE id = ?').get(id)
    broadcastEvent('sync', { type: 'meeting_updated', meeting: updated })
    res.json(updated)
  } catch (err) {
    console.log('[meetings] PATCH /:id error:', err)
    res.status(500).json({ error: 'Failed to update meeting' })
  }
})
