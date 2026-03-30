function generateId(): string {
  return Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10)
}

const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'taskItem',
  'bulletList',
  'orderedList',
  'codeBlock',
  'blockquote',
])

export function normalizeBlockIds(content: unknown): { content: unknown; changed: boolean } {
  if (!content || typeof content !== 'object') {
    return { content, changed: false }
  }

  const seen = new Set<string>()
  let changed = false

  function visit(node: any) {
    if (!node || typeof node !== 'object') return

    if (BLOCK_TYPES.has(node.type)) {
      if (!node.attrs || typeof node.attrs !== 'object') {
        node.attrs = {}
      }

      const currentBlockId =
        typeof node.attrs.blockId === 'string' && node.attrs.blockId.trim().length > 0
          ? node.attrs.blockId
          : null

      if (!currentBlockId || seen.has(currentBlockId)) {
        node.attrs.blockId = generateId()
        changed = true
      }

      seen.add(node.attrs.blockId)
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        visit(child)
      }
    }
  }

  visit(content)

  return { content, changed }
}
