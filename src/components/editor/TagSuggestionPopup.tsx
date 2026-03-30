import { useState, useEffect, useCallback, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import type { TagSuggestionState } from './extensions/TagSuggestion'
import { tagSuggestionPluginKey } from './extensions/TagSuggestion'
import type { Tag } from '../../lib/types'

interface TagSuggestionPopupProps {
  editor: Editor
  state: TagSuggestionState
  tags: Tag[]
}

const DEFAULT_TAG_COLORS: Record<string, string> = {
  task: '#3CCB7F',
  meeting: '#F5A524',
  project: '#EF4444',
  idea: '#A78BFA',
  person: '#5E6AD2',
  note: '#9898a0',
}

export function TagSuggestionPopup({ editor, state, tags }: TagSuggestionPopupProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const popupRef = useRef<HTMLDivElement>(null)

  // Filter tags by query
  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(state.query.toLowerCase())
  )

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [state.query])

  const selectTag = useCallback(
    (tag: Tag) => {
      if (!state.range) return

      const { from, to } = state.range
      const color = tag.color || DEFAULT_TAG_COLORS[tag.name] || '#9898a0'

      // Delete the #query text and insert the tag badge
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, [
          {
            type: 'tagBadge',
            attrs: {
              tagName: tag.name,
              tagId: tag.id,
              color,
            },
          },
          { type: 'text', text: ' ' },
        ])
        .run()

      // Dismiss the suggestion
      editor.view.dispatch(
        editor.state.tr.setMeta(tagSuggestionPluginKey, { dismiss: true })
      )
    },
    [editor, state.range]
  )

  // Handle keyboard events from the plugin
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail) return

      switch (detail.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < filteredTags.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredTags.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (filteredTags[selectedIndex]) {
            selectTag(filteredTags[selectedIndex])
          }
          break
      }
    }

    window.addEventListener('tag-suggestion-keydown', handler)
    return () => window.removeEventListener('tag-suggestion-keydown', handler)
  }, [filteredTags, selectedIndex, selectTag])

  // Calculate position
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!state.active || !state.range) {
      setPosition(null)
      return
    }

    const coords = editor.view.coordsAtPos(state.range.from)
    const editorRect = editor.view.dom.closest('.relative')?.getBoundingClientRect()
    if (!editorRect) {
      setPosition({ top: coords.bottom + 4, left: coords.left })
      return
    }

    setPosition({
      top: coords.bottom - editorRect.top + 4,
      left: coords.left - editorRect.left,
    })
  }, [editor, state.active, state.range])

  if (!state.active || !position || filteredTags.length === 0) {
    return null
  }

  return (
    <div
      ref={popupRef}
      className="absolute z-50 min-w-[180px] max-w-[260px] py-1 bg-base border border-border-hover rounded-lg shadow-xl shadow-black/50"
      style={{ top: position.top, left: position.left }}
    >
      {filteredTags.map((tag, index) => {
        const color = tag.color || DEFAULT_TAG_COLORS[tag.name] || '#9898a0'
        return (
          <button
            key={tag.id}
            className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-left text-[13px] transition-colors ${
              index === selectedIndex
                ? 'bg-accent-muted text-text-primary'
                : 'text-text-secondary hover:bg-surface'
            }`}
            onMouseDown={(e) => {
              e.preventDefault() // Prevent editor blur
              selectTag(tag)
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="truncate">#{tag.name}</span>
          </button>
        )
      })}
    </div>
  )
}
