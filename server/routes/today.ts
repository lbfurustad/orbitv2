import { Router } from 'express'
import { getDb } from '../lib/db.js'
import { broadcastEvent } from './events.js'

export const todayRouter = Router()

/**
 * Ensure a daily note + document exists for the given date.
 * Returns the daily_note row (with document fields joined).
 */
function ensureDailyNote(date: string) {
  const db = getDb()

  // Check if daily note already exists
  let dailyNote = db.prepare(`
    SELECT dn.*, d.content, d.title, d.id as doc_id
    FROM daily_notes dn
    LEFT JOIN documents d ON dn.document_id = d.id
    WHERE dn.date = ?
  `).get(date) as any

  if (dailyNote) return dailyNote

  // Create the document first
  const docResult = db.prepare(`
    INSERT INTO documents (type, title, date)
    VALUES ('daily_note', ?, ?)
  `).run(date, date)

  const doc = db.prepare('SELECT * FROM documents WHERE rowid = ?').get(docResult.lastInsertRowid) as any

  // Create the daily_note row
  db.prepare(`
    INSERT INTO daily_notes (document_id, date)
    VALUES (?, ?)
  `).run(doc.id, date)

  // Re-fetch with JOIN
  dailyNote = db.prepare(`
    SELECT dn.*, d.content, d.title, d.id as doc_id
    FROM daily_notes dn
    LEFT JOIN documents d ON dn.document_id = d.id
    WHERE dn.date = ?
  `).get(date) as any

  return dailyNote
}

// GET /api/today — full dashboard for a date
todayRouter.get('/', (req, res) => {
  try {
    const db = getDb()
    const dateParam = req.query.date as string | undefined
    const targetDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : new Date().toISOString().split('T')[0]

    // Ensure daily note exists (auto-create if missing)
    const dailyNote = ensureDailyNote(targetDate)

    // Get today's tasks:
    // 1) Tasks linked to this daily note's document
    // 2) Tasks with due_date = today
    // 3) Overdue tasks (due_date < today, not done)
    // 4) Starred tasks (Things: starred = 1)
    // 5) Tasks with scheduled_date = today
    // 6) Tasks with deadline = today
    // 7) Overdue by deadline (deadline < today, not done)
    const documentTasks = dailyNote?.doc_id
      ? db.prepare(`
          SELECT t.*, p.name as project_name
          FROM tasks t
          LEFT JOIN projects p ON t.project_id = p.id
          WHERE t.source_document_id = ?
          ORDER BY t.done ASC, t.sort_order ASC
        `).all(dailyNote.doc_id) as any[]
      : []

    const dueTasks = db.prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.due_date = ?
        AND (t.source_document_id IS NULL OR t.source_document_id != ?)
      ORDER BY t.done ASC, t.sort_order ASC
    `).all(targetDate, dailyNote?.doc_id || '') as any[]

    const overdueTasks = db.prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.due_date < ? AND t.done = 0
        AND (t.source_document_id IS NULL OR t.source_document_id != ?)
      ORDER BY t.due_date ASC, t.sort_order ASC
    `).all(targetDate, dailyNote?.doc_id || '') as any[]

    // Things-inspired: starred tasks
    const starredTasks = db.prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.starred = 1 AND t.done = 0 AND t.declined = 0
      ORDER BY t.sort_order ASC
    `).all() as any[]

    // Things-inspired: tasks scheduled for today
    const scheduledTasks = db.prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.scheduled_date = ? AND t.done = 0 AND t.declined = 0
      ORDER BY t.sort_order ASC
    `).all(targetDate) as any[]

    // Things-inspired: tasks with deadline = today
    const deadlineTasks = db.prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.deadline = ? AND t.done = 0 AND t.declined = 0
      ORDER BY t.sort_order ASC
    `).all(targetDate) as any[]

    // Overdue by deadline
    const overdueByDeadline = db.prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.deadline < ? AND t.done = 0 AND t.declined = 0
      ORDER BY t.deadline ASC
    `).all(targetDate) as any[]

    // De-duplicate by task id and split into regular vs evening
    const seenIds = new Set<string>()
    const tasks: any[] = []
    const eveningTasks: any[] = []

    for (const t of [...documentTasks, ...dueTasks, ...overdueTasks, ...starredTasks, ...scheduledTasks, ...deadlineTasks, ...overdueByDeadline]) {
      if (seenIds.has(t.id)) continue
      seenIds.add(t.id)
      if (t.is_evening) {
        eveningTasks.push(t)
      } else {
        tasks.push(t)
      }
    }

    // Upcoming deadlines: tasks with deadline in next 3 days (for planning)
    const upcomingDeadlines = db.prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.deadline > ? AND t.deadline <= date(?, '+3 days')
        AND t.done = 0 AND t.declined = 0
      ORDER BY t.deadline ASC
    `).all(targetDate, targetDate) as any[]

    // Get today's meetings
    const meetings = db.prepare(`
      SELECT m.*, d.content as document_content
      FROM meetings m
      LEFT JOIN documents d ON m.document_id = d.id
      WHERE m.date = ?
      ORDER BY m.start_time ASC
    `).all(targetDate)

    // Get today's calendar events
    const calendarEvents = db.prepare(`
      SELECT * FROM calendar_events
      WHERE local_date = ?
      ORDER BY is_all_day DESC, start_time ASC
    `).all(targetDate) as any[]

    for (const evt of calendarEvents) {
      evt.is_all_day = Boolean(evt.is_all_day)
      evt.is_teams = Boolean(evt.is_teams)
    }

    res.json({
      date: targetDate,
      dailyNote: dailyNote ? {
        id: dailyNote.id,
        document_id: dailyNote.doc_id,
        date: dailyNote.date,
        content: dailyNote.content,
        banner_url: dailyNote.banner_url,
      } : null,
      habits: dailyNote ? {
        walk: Boolean(dailyNote.habit_walk),
        weight: Boolean(dailyNote.habit_weight),
        weightValue: dailyNote.habit_weight_value,
        water: Boolean(dailyNote.habit_water),
        journal: Boolean(dailyNote.habit_journal),
      } : null,
      tasks,
      eveningTasks,
      upcomingDeadlines,
      meetings,
      calendarEvents,
    })
  } catch (err) {
    console.log('[today] GET / error:', err)
    res.status(500).json({ error: 'Failed to fetch today data' })
  }
})

// PATCH /api/today/habits — update habit fields on daily_notes
todayRouter.patch('/habits', (req, res) => {
  try {
    const db = getDb()
    const { date, ...habits } = req.body
    const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : new Date().toISOString().split('T')[0]

    // Ensure daily note exists
    ensureDailyNote(targetDate)

    const allowedHabits: Record<string, string> = {
      walk: 'habit_walk',
      weight: 'habit_weight',
      weightValue: 'habit_weight_value',
      water: 'habit_water',
      journal: 'habit_journal',
    }

    const setClauses: string[] = []
    const params: any[] = []

    for (const [key, value] of Object.entries(habits)) {
      const col = allowedHabits[key]
      if (!col) continue
      setClauses.push(`${col} = ?`)
      if (col === 'habit_weight_value') {
        params.push(value ?? null)
      } else {
        params.push(value ? 1 : 0)
      }
    }

    if (setClauses.length === 0) {
      res.status(400).json({ error: 'No valid habit fields' })
      return
    }

    setClauses.push("updated_at = datetime('now')")
    params.push(targetDate)

    db.prepare(`UPDATE daily_notes SET ${setClauses.join(', ')} WHERE date = ?`).run(...params)

    // Re-fetch
    const dailyNote = db.prepare('SELECT * FROM daily_notes WHERE date = ?').get(targetDate) as any

    broadcastEvent('sync', { type: 'habits_updated', date: targetDate, habits: dailyNote })
    res.json({
      walk: Boolean(dailyNote.habit_walk),
      weight: Boolean(dailyNote.habit_weight),
      weightValue: dailyNote.habit_weight_value,
      water: Boolean(dailyNote.habit_water),
      journal: Boolean(dailyNote.habit_journal),
    })
  } catch (err) {
    console.log('[today] PATCH /habits error:', err)
    res.status(500).json({ error: 'Failed to update habits' })
  }
})

// POST /api/today/tasks — create task linked to today's daily note document
todayRouter.post('/tasks', (req, res) => {
  try {
    const db = getDb()
    const { text, date, project_id, scope, priority } = req.body

    if (!text?.trim()) {
      res.status(400).json({ error: 'text is required' })
      return
    }

    const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : new Date().toISOString().split('T')[0]

    // Ensure daily note exists and get its document_id
    const dailyNote = ensureDailyNote(targetDate)
    if (!dailyNote?.doc_id) {
      res.status(500).json({ error: 'Failed to get daily note document' })
      return
    }

    // Get next sort_order
    const maxOrder = db.prepare(
      'SELECT MAX(sort_order) as max_order FROM tasks WHERE done = 0'
    ).get() as any
    const sortOrder = (maxOrder?.max_order ?? 0) + 1

    const result = db.prepare(`
      INSERT INTO tasks (text, source_document_id, due_date, project_id, scope, priority, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      text.trim(),
      dailyNote.doc_id,
      targetDate,
      project_id || null,
      scope || 'work',
      priority || null,
      sortOrder
    )

    const task = db.prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.rowid = ?
    `).get(result.lastInsertRowid)

    broadcastEvent('sync', { type: 'task_created', task })
    res.json(task)
  } catch (err) {
    console.log('[today] POST /tasks error:', err)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// GET /api/today/banner/:date — get banner URL
todayRouter.get('/banner/:date', (req, res) => {
  try {
    const db = getDb()
    const { date } = req.params

    const dailyNote = db.prepare('SELECT banner_url FROM daily_notes WHERE date = ?').get(date) as any
    if (!dailyNote || !dailyNote.banner_url) {
      res.status(404).json({ error: 'No banner found' })
      return
    }

    res.json({ banner_url: dailyNote.banner_url })
  } catch (err) {
    console.log('[today] GET /banner/:date error:', err)
    res.status(500).json({ error: 'Failed to fetch banner' })
  }
})

// POST /api/today/banner/:date — set banner URL
todayRouter.post('/banner/:date', (req, res) => {
  try {
    const db = getDb()
    const { date } = req.params
    const { banner_url } = req.body

    if (typeof banner_url !== 'string') {
      res.status(400).json({ error: 'banner_url must be a string' })
      return
    }

    // Ensure daily note exists
    ensureDailyNote(date)

    db.prepare(`
      UPDATE daily_notes SET banner_url = ?, updated_at = datetime('now') WHERE date = ?
    `).run(banner_url || null, date)

    broadcastEvent('sync', { type: 'banner_updated', date, banner_url })
    res.json({ success: true, banner_url: banner_url || '' })
  } catch (err) {
    console.log('[today] POST /banner/:date error:', err)
    res.status(500).json({ error: 'Failed to set banner' })
  }
})
