import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

function generateId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

const BLOCK_TYPES = [
  'paragraph',
  'heading',
  'taskItem',
  'bulletList',
  'orderedList',
  'codeBlock',
  'blockquote',
]

export const UniqueID = Extension.create({
  name: 'uniqueID',

  addGlobalAttributes() {
    return [
      {
        types: BLOCK_TYPES,
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute('data-block-id'),
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.blockId) return {}
              return { 'data-block-id': attributes.blockId }
            },
          },
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('uniqueID'),
        appendTransaction: (_transactions, _oldState, newState) => {
          const { tr } = newState
          let modified = false
          const seenBlockIds = new Set<string>()

          newState.doc.descendants((node, pos) => {
            if (!BLOCK_TYPES.includes(node.type.name)) return

            const currentBlockId = node.attrs.blockId as string | null
            const needsNewId = !currentBlockId || seenBlockIds.has(currentBlockId)

            if (needsNewId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                blockId: generateId(),
              })
              modified = true
              return
            }

            seenBlockIds.add(currentBlockId)
          })

          return modified ? tr : null
        },
      }),
    ]
  },
})
