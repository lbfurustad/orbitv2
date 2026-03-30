import { Router } from 'express'
import { getDb } from '../lib/db.js'

export const peopleRouter = Router()

// GET /api/people — list all people with task counts
peopleRouter.get('/', (req, res) => {
  try {
    const db = getDb()

    const people = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tasks t WHERE t.person_id = p.id AND t.done = 0) as task_count
      FROM people p
      ORDER BY p.name ASC
    `).all()

    res.json(people)
  } catch (err) {
    console.log('[people] GET / error:', err)
    res.status(500).json({ error: 'Failed to fetch people' })
  }
})
