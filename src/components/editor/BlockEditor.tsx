import { useEffect, useRef, useCallback, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TiptapTaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { UniqueID } from './extensions/UniqueID'
import { TagBadge } from './extensions/TagBadge'
import { TagSuggestionPlugin } from './extensions/TagSuggestion'
import type { TagSuggestionState } from './extensions/TagSuggestion'
import { EntityBlockExtension } from './extensions/EntityBlockExtension'
import { EntityBlockView } from './extensions/EntityBlockView'
import { TagSuggestionPopup } from './TagSuggestionPopup'
import { api } from '../../lib/api'
import type { Tag } from '../../lib/types'

interface BlockEditorProps {
  content?: Record<string, unknown>
  onUpdate?: (json: Record<string, unknown>) => void
  editable?: boolean
}

export function BlockEditor({ content, onUpdate, editable = true }: BlockEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  const [tags, setTags] = useState<Tag[]>([])
  const [suggestionState, setSuggestionState] = useState<TagSuggestionState>({
    active: false,
    range: null,
    query: '',
    decorationId: null,
  })

  // Load tags on mount
  useEffect(() => {
    api.tags().then(setTags).catch(console.error)
  }, [])

  const handleSuggestionStateChange = useCallback((state: TagSuggestionState) => {
    setSuggestionState(state)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TaskList,
      TiptapTaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Skriv noe...' }),
      TextStyle,
      Color,
      UniqueID,
      TagBadge,
      EntityBlockExtension,
      EntityBlockView,
      TagSuggestionPlugin.configure({
        onStateChange: handleSuggestionStateChange,
      }),
    ],
    content: content || { type: 'doc', content: [{ type: 'paragraph' }] },
    editable,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[60px] prose-notes',
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onUpdateRef.current?.(ed.getJSON() as Record<string, unknown>)
      }, 2000)
    },
  })

  // Sync editable prop
  useEffect(() => {
    if (editor) editor.setEditable(editable)
  }, [editor, editable])

  // Sync content from parent
  const initialContentSet = useRef(false)
  useEffect(() => {
    if (!editor || !content) return
    if (!initialContentSet.current) {
      initialContentSet.current = true
      return
    }
    // Only update if content truly changed (avoid cursor jump)
    const current = JSON.stringify(editor.getJSON())
    const incoming = JSON.stringify(content)
    if (current !== incoming) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  if (!editor) return null

  return (
    <div className="relative group/editor rounded-lg border border-transparent focus-within:border-border/50 hover:border-border/30 transition-colors">
      <div className="px-2 pb-2">
        <EditorContent editor={editor} />
      </div>
      <TagSuggestionPopup
        editor={editor}
        state={suggestionState}
        tags={tags}
      />
    </div>
  )
}
