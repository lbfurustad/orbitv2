import { Router } from 'express'
import type { Request, Response } from 'express'

export const eventsRouter = Router()

const clients: Set<Response> = new Set()

eventsRouter.get('/', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'ok' })}\n\n`)

  clients.add(res)

  req.on('close', () => {
    clients.delete(res)
  })
})

export function broadcastEvent(type: string, data: unknown) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of clients) {
    client.write(payload)
  }
}
