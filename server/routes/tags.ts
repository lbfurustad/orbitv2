import { Router } from 'express'
import { getDb } from '../lib/db.js'

export const tagsRouter = Router()

// Seed default tags if table is empty
function seedDefaultTags() {
  const db = getDb()
  const count = db.prepare('SELECT COUNT(*) as cnt FROM tags').get() as { cnt: number }
  if (count.cnt === 0) {
    const insert = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)')
    const defaults = [
      ['task', '#3CCB7F'],
      ['meeting', '#F5A524'],
      ['project', '#EF4444'],
      ['idea', '#A78BFA'],
      ['person', '#5E6AD2'],
      ['note', '#9898a0'],
    ]
    for (const [name, color] of defaults) {
      insert.run(name, color)
    }
    console.log('[tags] Seeded default tags')
  }
}

// Seed on import
seedDefaultTags()

// GET /api/tags — list all tags
tagsRouter.get('/', (_req, res) => {
  try {
    const db = getDb()
    const tags = db.prepare('SELECT * FROM tags ORDER BY name ASC').all()
    res.json(tags)
  } catch (err) {
    console.log('[tags] GET / error:', err)
    res.status(500).json({ error: 'Failed to fetch tags' })
  }
})

// POST /api/tags — create a new tag
tagsRouter.post('/', (req, res) => {
  try {
    const db = getDb()
    const { name, color, icon } = req.body

    if (!name?.trim()) {
      res.status(400).json({ error: 'name is required' })
      return
    }

    // Check if tag already exists
    const existing = db.prepare('SELECT * FROM tags WHERE name = ?').get(name.trim().toLowerCase())
    if (existing) {
      res.json(existing)
      return
    }

    const result = db.prepare(`
      INSERT INTO tags (name, color, icon)
      VALUES (?, ?, ?)
    `).run(name.trim().toLowerCase(), color || null, icon || null)

    const tag = db.prepare('SELECT * FROM tags WHERE rowid = ?').get(result.lastInsertRowid)
    res.json(tag)
  } catch (err) {
    console.log('[tags] POST / error:', err)
    res.status(500).json({ error: 'Failed to create tag' })
  }
})
