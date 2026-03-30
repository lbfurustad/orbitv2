import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface TagSuggestionState {
  active: boolean
  range: { from: number; to: number } | null
  query: string
  decorationId: string | null
}

const tagSuggestionPluginKey = new PluginKey('tagSuggestion')

export interface TagSuggestionOptions {
  onStateChange?: (state: TagSuggestionState) => void
}

export const TagSuggestionPlugin = Extension.create<TagSuggestionOptions>({
  name: 'tagSuggestion',

  addOptions() {
    return {
      onStateChange: undefined,
    }
  },

  addProseMirrorPlugins() {
    const options = this.options

    return [
      new Plugin({
        key: tagSuggestionPluginKey,

        state: {
          init(): TagSuggestionState {
            return {
              active: false,
              range: null,
              query: '',
              decorationId: null,
            }
          },

          apply(tr: Transaction, prev: TagSuggestionState, _oldState: EditorState, newState: EditorState): TagSuggestionState {
            // Check if the suggestion was explicitly dismissed
            const meta = tr.getMeta(tagSuggestionPluginKey)
            if (meta?.dismiss) {
              const next: TagSuggestionState = {
                active: false,
                range: null,
                query: '',
                decorationId: null,
              }
              options.onStateChange?.(next)
              return next
            }
            if (meta?.activate) {
              const next: TagSuggestionState = {
                active: true,
                range: meta.range,
                query: meta.query ?? '',
                decorationId: `tag-suggestion-${Date.now()}`,
              }
              options.onStateChange?.(next)
              return next
            }

            // Re-evaluate on selection/doc changes
            const { selection } = newState
            const { $from } = selection
            if (!selection.empty) {
              if (prev.active) {
                const next: TagSuggestionState = {
                  active: false,
                  range: null,
                  query: '',
                  decorationId: null,
                }
                options.onStateChange?.(next)
                return next
              }
              return prev
            }

            // Scan backwards from cursor for # trigger
            const textBefore = $from.parent.textBetween(
              0,
              $from.parentOffset,
              undefined,
              '\ufffc' // object replacement char for atom nodes
            )

            // Find the last # that could be a tag trigger
            // Must be at start of line or preceded by whitespace
            const match = textBefore.match(/(^|[\s])#([a-zA-Z0-9_-]*)$/)

            if (match) {
              const query = match[2]
              const hashPos = $from.start() + textBefore.lastIndexOf('#' + query)
              const range = {
                from: hashPos,
                to: hashPos + 1 + query.length,
              }

              const next: TagSuggestionState = {
                active: true,
                range,
                query,
                decorationId: prev.decorationId || `tag-suggestion-${Date.now()}`,
              }
              options.onStateChange?.(next)
              return next
            }

            // No match — deactivate
            if (prev.active) {
              const next: TagSuggestionState = {
                active: false,
                range: null,
                query: '',
                decorationId: null,
              }
              options.onStateChange?.(next)
              return next
            }

            return prev
          },
        },

        props: {
          decorations(state) {
            const pluginState = tagSuggestionPluginKey.getState(state) as TagSuggestionState | undefined
            if (!pluginState?.active || !pluginState.range) {
              return DecorationSet.empty
            }

            return DecorationSet.create(state.doc, [
              Decoration.inline(pluginState.range.from, pluginState.range.to, {
                class: 'tag-suggestion-active',
              }),
            ])
          },

          handleKeyDown(view, event) {
            const pluginState = tagSuggestionPluginKey.getState(view.state) as TagSuggestionState | undefined
            if (!pluginState?.active) return false

            // Let the React component handle arrow keys, Enter, Escape
            if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) {
              // Dispatch a custom event the React component can listen to
              const customEvent = new CustomEvent('tag-suggestion-keydown', {
                detail: { key: event.key },
              })
              const handled = !window.dispatchEvent(customEvent)
              if (event.key === 'Escape') {
                view.dispatch(
                  view.state.tr.setMeta(tagSuggestionPluginKey, { dismiss: true })
                )
                return true
              }
              return handled
            }

            return false
          },
        },
      }),
    ]
  },
})

export { tagSuggestionPluginKey }
