import express from 'express'
import cors from 'cors'
import { initDb } from './lib/db.js'
import { todayRouter } from './routes/today.js'
import { tasksRouter } from './routes/tasks.js'
import { documentsRouter } from './routes/documents.js'
import { eventsRouter } from './routes/events.js'
import { tagsRouter } from './routes/tags.js'
import { blocksRouter } from './routes/blocks.js'
import { projectsRouter } from './routes/projects.js'
import { peopleRouter } from './routes/people.js'
import { whiteboardsRouter } from './routes/whiteboards.js'
import { meetingsRouter } from './routes/meetings.js'

const app = express()
const PORT = 3002

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Initialize database and run migrations
initDb()

// Routes
app.use('/api/today', todayRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/documents', documentsRouter)
app.use('/api/events', eventsRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/blocks', blocksRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/people', peopleRouter)
app.use('/api/whiteboards', whiteboardsRouter)
app.use('/api/meetings', meetingsRouter)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Orbit API running on http://localhost:${PORT}`)
})
