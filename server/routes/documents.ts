import { Router } from 'express'
import { getDb } from '../lib/db.js'
import { syncTasksFromDocument } from '../lib/block-sync.js'
import { normalizeBlockIds } from '../lib/prosemirror.js'
import { broadcastEvent } from './events.js'

export const documentsRouter = Router()

// GET /api/documents — list with optional type filter
documentsRouter.get('/', (req, res) => {
  try {
    const db = getDb()
    const { type } = req.query

    let sql = 'SELECT id, type, title, date, created_at, updated_at FROM documents WHERE 1=1'
    const params: any[] = []

    if (type) {
      sql += ' AND type = ?'
      params.push(type)
    }

    sql += ' ORDER BY updated_at DESC'

    const documents = db.prepare(sql).all(...params)
    res.json(documents)
  } catch (err) {
    console.log('[documents] GET / error:', err)
    res.status(500).json({ error: 'Failed to fetch documents' })
  }
})

// POST /api/documents — create document
documentsRouter.post('/', (req, res) => {
  try {
    const db = getDb()
    const { type, title, date } = req.body
    const normalized = normalizeBlockIds(req.body.content)
    const content = normalized.content

    if (!type || !title) {
      res.status(400).json({ error: 'type and title are required' })
      return
    }

    const result = db.prepare(`
      INSERT INTO documents (type, title, date, content)
      VALUES (?, ?, ?, ?)
    `).run(type, title, date || null, content ? (typeof content === 'string' ? content : JSON.stringify(content)) : null)

    const doc = db.prepare('SELECT * FROM documents WHERE rowid = ?').get(result.lastInsertRowid)
    broadcastEvent('sync', { type: 'document_created', document: doc })
    res.json(doc)
  } catch (err) {
    console.log('[documents] POST / error:', err)
    res.status(500).json({ error: 'Failed to create document' })
  }
})

// GET /api/documents/:id — get single document with content
documentsRouter.get('/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any
    if (!doc) {
      res.status(404).json({ error: 'Document not found' })
      return
    }

    // Parse content from JSON string if needed
    if (doc.content && typeof doc.content === 'string') {
      try {
        doc.content = JSON.parse(doc.content)
      } catch {
        // Content is plain text, leave as-is
      }
    }

    res.json(doc)
  } catch (err) {
    console.log('[documents] GET /:id error:', err)
    res.status(500).json({ error: 'Failed to fetch document' })
  }
})

// PATCH /api/documents/:id — update document fields and/or content
documentsRouter.patch('/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params
    const updates = { ...req.body }

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
    if (!doc) {
      res.status(404).json({ error: 'Document not found' })
      return
    }

    const allowedFields = ['title', 'date', 'content', 'type']
    const setClauses: string[] = []
    const params: any[] = []

    if ('content' in updates) {
      const normalized = normalizeBlockIds(updates.content)
      updates.content = normalized.content
    }

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue
      if (key === 'content' && value !== null && typeof value === 'object') {
        // Store ProseMirror JSON as string
        setClauses.push(`${key} = ?`)
        params.push(JSON.stringify(value))
      } else {
        setClauses.push(`${key} = ?`)
        params.push(value ?? null)
      }
    }

    if (setClauses.length === 0) {
      res.status(400).json({ error: 'No valid fields to update' })
      return
    }

    setClauses.push("updated_at = datetime('now')")
    params.push(id)

    db.prepare(`UPDATE documents SET ${setClauses.join(', ')} WHERE id = ?`).run(...params)

    // If content was updated, sync tasks from ProseMirror blocks
    if ('content' in updates && updates.content) {
      syncTasksFromDocument(id, updates.content)
    }

    const updated = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any

    // Parse content for response
    if (updated.content && typeof updated.content === 'string') {
      try {
        updated.content = JSON.parse(updated.content)
      } catch {
        // plain text, leave as-is
      }
    }

    broadcastEvent('sync', { type: 'document_updated', document: updated })
    res.json(updated)
  } catch (err) {
    console.log('[documents] PATCH /:id error:', err)
    res.status(500).json({ error: 'Failed to update document' })
  }
})

// DELETE /api/documents/:id — delete document
documentsRouter.delete('/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
    if (!doc) {
      res.status(404).json({ error: 'Document not found' })
      return
    }

    db.prepare('DELETE FROM documents WHERE id = ?').run(id)
    broadcastEvent('sync', { type: 'document_deleted', id })
    res.json({ success: true, deleted: true })
  } catch (err) {
    console.log('[documents] DELETE /:id error:', err)
    res.status(500).json({ error: 'Failed to delete document' })
  }
})
