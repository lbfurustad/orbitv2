import { getDb } from './db.js'

/**
 * Extract text content from a ProseMirror node recursively.
 * Concatenates all text nodes within the given node tree, skipping tagBadge nodes.
 */
function extractText(node: any): string {
  if (!node) return ''
  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text
  }
  // Skip tag badges — they are metadata, not user text
  if (node.type === 'tagBadge') {
    return ''
  }
  if (Array.isArray(node.content)) {
    return node.content.map(extractText).join('')
  }
  return ''
}

/**
 * Find all tagBadge nodes within a block-level node (not recursing into child blocks).
 * Returns tag names found directly inside this node's inline content.
 */
function findTagBadgesInBlock(node: any): { tagName: string; tagId: string }[] {
  const results: { tagName: string; tagId: string }[] = []
  if (!node) return results

  if (node.type === 'tagBadge') {
    const tagName = node.attrs?.tagName
    const tagId = node.attrs?.tagId
    if (tagName && tagId) {
      results.push({ tagName, tagId })
    }
    return results
  }

  // Only recurse into inline content, not block children
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      // Skip block-level nodes to stay within this block
      if (['paragraph', 'heading', 'taskItem', 'bulletList', 'orderedList', 'codeBlock', 'blockquote', 'taskList'].includes(child.type)) {
        continue
      }
      results.push(...findTagBadgesInBlock(child))
    }
  }

  return results
}

interface BlockTagInfo {
  blockId: string
  tags: { tagName: string; tagId: string }[]
}

/**
 * Recursively find all block-level nodes that contain tagBadge inline nodes.
 */
function findTaggedBlocks(node: any): BlockTagInfo[] {
  const results: BlockTagInfo[] = []
  if (!node) return results

  const blockTypes = ['paragraph', 'heading', 'taskItem', 'codeBlock', 'blockquote']

  if (blockTypes.includes(node.type)) {
    const blockId = node.attrs?.blockId
    if (blockId) {
      const tags = findTagBadgesInBlock(node)
      if (tags.length > 0) {
        results.push({ blockId, tags })
      }
    }
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      results.push(...findTaggedBlocks(child))
    }
  }

  return results
}

/**
 * Recursively find all taskItem nodes in a ProseMirror JSON document.
 * Returns an array of { blockId, text, checked }.
 */
function findTaskItems(node: any): { blockId: string; text: string; checked: boolean }[] {
  const results: { blockId: string; text: string; checked: boolean }[] = []
  if (!node) return results

  if (node.type === 'taskItem') {
    const blockId = node.attrs?.blockId
    if (blockId) {
      const text = extractText(node).trim()
      const checked = node.attrs?.checked === true
      results.push({ blockId, text, checked })
    }
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      results.push(...findTaskItems(child))
    }
  }

  return results
}

/**
 * Check if a block-level node contains a tagBadge with tagName "task".
 */
function hasTaskTag(node: any): boolean {
  const tags = findTagBadgesInBlock(node)
  return tags.some(t => t.tagName === 'task')
}

interface TaggedTaskInfo {
  blockId: string
  text: string
  checked: boolean
  priority: number | null
  dueDate: string | null
  projectId: string | null
}

/**
 * Recursively find all paragraph/heading nodes that contain a #task tagBadge.
 * These are "tagged tasks" — regular blocks promoted to tasks via inline tagging.
 * Excludes taskItem nodes (they are handled separately).
 */
function findTaggedTaskBlocks(node: any): TaggedTaskInfo[] {
  const results: TaggedTaskInfo[] = []
  if (!node) return results

  const taggedBlockTypes = ['paragraph', 'heading', 'blockquote']

  if (taggedBlockTypes.includes(node.type) && hasTaskTag(node)) {
    const blockId = node.attrs?.blockId
    if (blockId) {
      const text = extractText(node).trim()
      const checked = node.attrs?.taskDone === true
      const priority = typeof node.attrs?.taskPriority === 'number' ? node.attrs.taskPriority : null
      const dueDate = typeof node.attrs?.taskDueDate === 'string' ? node.attrs.taskDueDate : null
      const projectId = typeof node.attrs?.taskProjectId === 'string' ? node.attrs.taskProjectId : null
      results.push({ blockId, text, checked, priority, dueDate, projectId })
    }
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      results.push(...findTaggedTaskBlocks(child))
    }
  }

  return results
}

/**
 * Sync tasks extracted from a ProseMirror document into the tasks table.
 *
 * For each taskItem with a blockId:
 *   - If a task with source_block_id = blockId exists → update text/done
 *   - If not → create a new task linked to this document
 *
 * Tasks in DB that reference this document but no longer have a matching
 * blockId in the content → delete them.
 */
export function syncTasksFromDocument(documentId: string, content: any) {
  const db = getDb()

  // Parse content if it's a string
  let doc: any
  try {
    doc = typeof content === 'string' ? JSON.parse(content) : content
  } catch (e) {
    console.log('[block-sync] Failed to parse ProseMirror content:', e)
    return
  }

  if (!doc) return

  // Find all taskItems (checkboxes) in the document
  const taskItems = findTaskItems(doc)

  // Find all #task-tagged blocks (paragraphs/headings with tagBadge "task")
  const taggedTasks = findTaggedTaskBlocks(doc)

  // Collect all block IDs that represent tasks (both types)
  const blockIds = new Set([
    ...taskItems.map(t => t.blockId),
    ...taggedTasks.map(t => t.blockId),
  ])

  // Get existing tasks linked to this document
  const existingTasks = db.prepare(
    'SELECT id, source_block_id, text, done, priority, due_date, project_id FROM tasks WHERE source_document_id = ? AND source_block_id IS NOT NULL'
  ).all(documentId) as { id: string; source_block_id: string; text: string; done: number; priority: number | null; due_date: string | null; project_id: string | null }[]

  const existingByBlockId = new Map<string, typeof existingTasks[0]>()
  for (const task of existingTasks) {
    existingByBlockId.set(task.source_block_id, task)
  }

  // Upsert taskItem (checkbox) tasks
  for (const item of taskItems) {
    const existing = existingByBlockId.get(item.blockId)
    if (existing) {
      // Update if text or done status changed
      const doneInt = item.checked ? 1 : 0
      if (existing.text !== item.text || existing.done !== doneInt) {
        db.prepare(`
          UPDATE tasks
          SET text = ?, done = ?, completed_at = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(
          item.text,
          doneInt,
          item.checked ? new Date().toISOString() : null,
          existing.id
        )
      }
    } else {
      // Create new task
      const maxOrder = db.prepare(
        'SELECT MAX(sort_order) as max_order FROM tasks WHERE done = 0'
      ).get() as any
      const sortOrder = (maxOrder?.max_order ?? 0) + 1

      db.prepare(`
        INSERT INTO tasks (text, done, source_document_id, source_block_id, sort_order, completed_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        item.text,
        item.checked ? 1 : 0,
        documentId,
        item.blockId,
        sortOrder,
        item.checked ? new Date().toISOString() : null
      )
    }
  }

  // Upsert #task-tagged block tasks
  for (const item of taggedTasks) {
    const existing = existingByBlockId.get(item.blockId)
    if (existing) {
      // Update if text, done, priority, due_date, or project_id changed
      const doneInt = item.checked ? 1 : 0
      if (
        existing.text !== item.text ||
        existing.done !== doneInt ||
        existing.priority !== item.priority ||
        existing.due_date !== item.dueDate ||
        existing.project_id !== item.projectId
      ) {
        db.prepare(`
          UPDATE tasks
          SET text = ?, done = ?, priority = ?, due_date = ?, project_id = ?, completed_at = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(
          item.text,
          doneInt,
          item.priority,
          item.dueDate,
          item.projectId,
          item.checked ? new Date().toISOString() : null,
          existing.id
        )
      }
    } else {
      // Create new task from tagged block
      const maxOrder = db.prepare(
        'SELECT MAX(sort_order) as max_order FROM tasks WHERE done = 0'
      ).get() as any
      const sortOrder = (maxOrder?.max_order ?? 0) + 1

      db.prepare(`
        INSERT INTO tasks (text, done, priority, due_date, project_id, source_document_id, source_block_id, sort_order, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.text,
        item.checked ? 1 : 0,
        item.priority,
        item.dueDate,
        item.projectId,
        documentId,
        item.blockId,
        sortOrder,
        item.checked ? new Date().toISOString() : null
      )
    }
  }

  // Delete tasks whose blockId is no longer in the document
  for (const task of existingTasks) {
    if (!blockIds.has(task.source_block_id)) {
      db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id)
    }
  }

  // Sync taggings from tagBadge inline nodes
  syncTaggingsFromDocument(db, doc)
}

/**
 * Sync taggings from tagBadge inline nodes in a ProseMirror document.
 * For each block that contains tagBadge nodes, create entries in the taggings table.
 * Cleans up stale taggings for blocks that no longer have a given tag.
 */
function syncTaggingsFromDocument(db: ReturnType<typeof getDb>, doc: any) {
  const taggedBlocks = findTaggedBlocks(doc)

  // Build a set of (tagId, blockId) pairs that should exist
  const desired = new Set<string>()
  for (const block of taggedBlocks) {
    for (const tag of block.tags) {
      desired.add(`${tag.tagId}:${block.blockId}`)
    }
  }

  // Collect all block IDs from the document for cleanup scope
  const allBlockIds = new Set<string>()
  function collectBlockIds(node: any) {
    if (!node) return
    const blockId = node.attrs?.blockId
    if (blockId) allBlockIds.add(blockId)
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        collectBlockIds(child)
      }
    }
  }
  collectBlockIds(doc)

  if (allBlockIds.size === 0) return

  // Get existing taggings for these blocks
  const placeholders = Array.from(allBlockIds).map(() => '?').join(',')
  const existingTaggings = db.prepare(
    `SELECT id, tag_id, target_id FROM taggings WHERE target_type = 'block' AND target_id IN (${placeholders})`
  ).all(...allBlockIds) as { id: string; tag_id: string; target_id: string }[]

  const existingSet = new Set<string>()
  for (const t of existingTaggings) {
    existingSet.add(`${t.tag_id}:${t.target_id}`)
  }

  // Insert new taggings
  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO taggings (tag_id, target_type, target_id) VALUES (?, 'block', ?)`
  )
  for (const block of taggedBlocks) {
    for (const tag of block.tags) {
      const key = `${tag.tagId}:${block.blockId}`
      if (!existingSet.has(key)) {
        insertStmt.run(tag.tagId, block.blockId)
      }
    }
  }

  // Delete stale taggings (tag was removed from block)
  for (const t of existingTaggings) {
    const key = `${t.tag_id}:${t.target_id}`
    if (!desired.has(key)) {
      db.prepare('DELETE FROM taggings WHERE id = ?').run(t.id)
    }
  }
}
