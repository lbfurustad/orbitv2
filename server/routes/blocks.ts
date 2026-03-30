import { Router } from 'express'
import { getDb } from '../lib/db.js'
import { broadcastEvent } from './events.js'

export const blocksRouter = Router()

/**
 * Recursively find a node with a given blockId in a ProseMirror document tree.
 * If duplicates exist, prefer an entity block, then a tagged block, then a plain match.
 */
function findNodeByBlockId(node: any, blockId: string): any | null {
  let fallback: any | null = null

  function visit(current: any): any | null {
    if (!current) return null

    if (current.attrs?.blockId === blockId) {
      if (current.attrs?.entityType) return current
      if (findTagBadgesInNode(current).length > 0) return current
      if (!fallback) fallback = current
    }

    if (Array.isArray(current.content)) {
      for (const child of current.content) {
        const found = visit(child)
        if (found) return found
      }
    }

    return null
  }

  return visit(node) || fallback
}

/**
 * Extract text content from a ProseMirror node, skipping tagBadge nodes.
 */
function extractText(node: any): string {
  if (!node) return ''
  if (node.type === 'text' && typeof node.text === 'string') return node.text
  if (node.type === 'tagBadge') return ''
  if (Array.isArray(node.content)) {
    return node.content.map(extractText).join('')
  }
  return ''
}

/**
 * Find tagBadge nodes within a block's inline content.
 */
function findTagBadgesInNode(node: any): { tagName: string; tagId: string }[] {
  const results: { tagName: string; tagId: string }[] = []
  if (!node) return results
  if (node.type === 'tagBadge') {
    const tagName = node.attrs?.tagName
    const tagId = node.attrs?.tagId
    if (tagName && tagId) results.push({ tagName, tagId })
    return results
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      // Skip block-level children
      if (['paragraph', 'heading', 'taskItem', 'bulletList', 'orderedList', 'codeBlock', 'blockquote', 'taskList'].includes(child.type)) {
        continue
      }
      results.push(...findTagBadgesInNode(child))
    }
  }
  return results
}

/**
 * PATCH /api/blocks/:blockId/properties
 *
 * Update task properties on a #task-tagged block.
 * Body: { taskDone?, taskPriority?, taskDueDate?, taskProjectId? }
 *
 * - Finds the document containing the block
 * - Updates the ProseMirror JSON node attributes
 * - Updates the corresponding task row in the tasks table
 */
blocksRouter.patch('/:blockId/properties', (req, res) => {
  try {
    const db = getDb()
    const { blockId } = req.params
    const { taskDone, taskPriority, taskDueDate, taskProjectId } = req.body

    // Find the document that contains this blockId by looking at the tasks table
    const taskRow = db.prepare(
      'SELECT id, source_document_id, done, priority, due_date, project_id FROM tasks WHERE source_block_id = ?'
    ).get(blockId) as { id: string; source_document_id: string; done: number; priority: number | null; due_date: string | null; project_id: string | null } | undefined

    if (!taskRow) {
      res.status(404).json({ error: 'No task found for this block' })
      return
    }

    const docRow = db.prepare('SELECT id, content FROM documents WHERE id = ?').get(taskRow.source_document_id) as { id: string; content: string } | undefined
    if (!docRow) {
      res.status(404).json({ error: 'Source document not found' })
      return
    }

    // Parse the ProseMirror JSON
    let doc: any
    try {
      doc = typeof docRow.content === 'string' ? JSON.parse(docRow.content) : docRow.content
    } catch {
      res.status(500).json({ error: 'Failed to parse document content' })
      return
    }

    // Find the block node in the document tree
    const blockNode = findNodeByBlockId(doc, blockId)
    if (!blockNode) {
      res.status(404).json({ error: 'Block not found in document content' })
      return
    }

    // Update ProseMirror node attributes
    if (!blockNode.attrs) blockNode.attrs = {}
    if (taskDone !== undefined) blockNode.attrs.taskDone = taskDone
    if (taskPriority !== undefined) blockNode.attrs.taskPriority = taskPriority
    if (taskDueDate !== undefined) blockNode.attrs.taskDueDate = taskDueDate
    if (taskProjectId !== undefined) blockNode.attrs.taskProjectId = taskProjectId

    // Write updated ProseMirror JSON back to the document
    db.prepare(`
      UPDATE documents SET content = ?, updated_at = datetime('now') WHERE id = ?
    `).run(JSON.stringify(doc), docRow.id)

    // Update the task row in the tasks table
    const setClauses: string[] = []
    const params: any[] = []

    if (taskDone !== undefined) {
      const doneInt = taskDone ? 1 : 0
      setClauses.push('done = ?')
      params.push(doneInt)
      setClauses.push('completed_at = ?')
      params.push(taskDone ? new Date().toISOString() : null)
    }
    if (taskPriority !== undefined) {
      setClauses.push('priority = ?')
      params.push(taskPriority ?? null)
    }
    if (taskDueDate !== undefined) {
      setClauses.push('due_date = ?')
      params.push(taskDueDate ?? null)
    }
    if (taskProjectId !== undefined) {
      setClauses.push('project_id = ?')
      params.push(taskProjectId ?? null)
    }

    if (setClauses.length > 0) {
      setClauses.push("updated_at = datetime('now')")
      params.push(taskRow.id)
      db.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...params)
    }

    // Return updated task
    const updatedTask = db.prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `).get(taskRow.id)

    broadcastEvent('sync', { type: 'task_updated', task: updatedTask })
    res.json(updatedTask)
  } catch (err) {
    console.log('[blocks] PATCH /:blockId/properties error:', err)
    res.status(500).json({ error: 'Failed to update block properties' })
  }
})

/**
 * GET /api/blocks/:blockId
 *
 * Return block metadata: blockId, document_id, text, tags,
 * and if tagged #task: task data (done, priority, due_date, project).
 */
blocksRouter.get('/:blockId', (req, res) => {
  try {
    const db = getDb()
    const { blockId } = req.params

    // First try to find via the tasks table (fastest path)
    const taskRow = db.prepare(
      'SELECT source_document_id FROM tasks WHERE source_block_id = ?'
    ).get(blockId) as { source_document_id: string } | undefined

    // Also check taggings for block
    const taggings = db.prepare(`
      SELECT t.name as tagName, t.id as tagId
      FROM taggings tg
      JOIN tags t ON tg.tag_id = t.id
      WHERE tg.target_type = 'block' AND tg.target_id = ?
    `).all(blockId) as { tagName: string; tagId: string }[]

    // If we have a task row, we know the document
    let documentId: string | null = taskRow?.source_document_id ?? null

    // If no task row, search all documents for this blockId
    if (!documentId) {
      const docs = db.prepare('SELECT id, content FROM documents WHERE content IS NOT NULL').all() as { id: string; content: string }[]
      for (const doc of docs) {
        try {
          const parsed = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content
          if (findNodeByBlockId(parsed, blockId)) {
            documentId = doc.id
            break
          }
        } catch {
          // skip unparseable documents
        }
      }
    }

    if (!documentId) {
      res.status(404).json({ error: 'Block not found in any document' })
      return
    }

    // Load the document and find the block node
    const docRow = db.prepare('SELECT id, content FROM documents WHERE id = ?').get(documentId) as { id: string; content: string }
    let doc: any
    try {
      doc = typeof docRow.content === 'string' ? JSON.parse(docRow.content) : docRow.content
    } catch {
      res.status(500).json({ error: 'Failed to parse document content' })
      return
    }

    const blockNode = findNodeByBlockId(doc, blockId)
    if (!blockNode) {
      res.status(404).json({ error: 'Block not found in document content' })
      return
    }

    const text = extractText(blockNode).trim()
    const inlineTags = findTagBadgesInNode(blockNode)
    // Merge inline tags with DB taggings for a complete picture
    const tags = inlineTags.length > 0 ? inlineTags : taggings
    const isTask = tags.some(t => t.tagName === 'task') || blockNode.type === 'taskItem'

    // Build response
    const response: any = {
      blockId,
      document_id: documentId,
      type: blockNode.type,
      text,
      tags,
    }

    // If it's a task, include task data
    if (isTask) {
      const task = db.prepare(`
        SELECT t.*, p.name as project_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.source_block_id = ?
      `).get(blockId)

      if (task) {
        response.task = task
      }
    }

    res.json(response)
  } catch (err) {
    console.log('[blocks] GET /:blockId error:', err)
    res.status(500).json({ error: 'Failed to fetch block' })
  }
})
