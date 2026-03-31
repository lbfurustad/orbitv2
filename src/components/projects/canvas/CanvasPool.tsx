import { useState, useEffect } from 'react'
import { MagnifyingGlass, CheckSquare, VideoCamera, ArrowsOutCardinal } from '@phosphor-icons/react'
import { api } from '../../../lib/api'
import type { UnconnectedEntities } from '../../../lib/types'

interface CanvasPoolProps {
  onRefetch: () => void
}

export function CanvasPool({ onRefetch }: CanvasPoolProps) {
  const [data, setData] = useState<UnconnectedEntities | null>(null)
  const [search, setSearch] = useState('')

  const fetchData = () => {
    api.unconnected().then(setData).catch(() => {})
  }

  useEffect(() => { fetchData() }, [])

  const filteredTasks = (data?.tasks || []).filter(t =>
    !search || t.text.toLowerCase().includes(search.toLowerCase())
  )
  const filteredMeetings = (data?.meetings || []).filter(m =>
    !search || m.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleDragStart = (e: React.DragEvent, type: 'task' | 'meeting', id: string) => {
    e.dataTransfer.setData('application/orbit-entity', JSON.stringify({ type, id }))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-[260px] bg-sidebar border-r border-border h-full overflow-y-auto shrink-0">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <ArrowsOutCardinal size={14} className="text-text-muted" />
          <span className="text-[12px] font-medium text-text-secondary">Ikke koblet</span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <MagnifyingGlass size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Søk..."
            className="w-full pl-7 pr-2 py-1.5 text-[12px] bg-surface rounded-md border border-border text-text-primary placeholder:text-text-muted/40 focus:border-accent/40"
          />
        </div>

        {/* Tasks */}
        {filteredTasks.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <CheckSquare size={12} className="text-emerald-400" />
              <span className="text-[11px] font-medium text-text-muted">Tasks ({filteredTasks.length})</span>
            </div>
            <div className="space-y-1">
              {filteredTasks.slice(0, 20).map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'task', task.id)}
                  className="px-2 py-1.5 bg-surface rounded-md border border-border text-[11px] text-text-secondary truncate cursor-grab active:cursor-grabbing hover:border-border-hover transition-colors"
                >
                  {task.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meetings */}
        {filteredMeetings.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <VideoCamera size={12} className="text-amber-400" />
              <span className="text-[11px] font-medium text-text-muted">Møter ({filteredMeetings.length})</span>
            </div>
            <div className="space-y-1">
              {filteredMeetings.slice(0, 20).map(meeting => (
                <div
                  key={meeting.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'meeting', meeting.id)}
                  className="px-2 py-1.5 bg-surface rounded-md border border-warning/20 text-[11px] text-text-secondary truncate cursor-grab active:cursor-grabbing hover:border-warning/30 transition-colors"
                >
                  {meeting.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {(!data || (filteredTasks.length === 0 && filteredMeetings.length === 0)) && (
          <p className="text-[11px] text-text-muted/40 text-center py-8">
            {search ? 'Ingen treff' : 'Alt er koblet!'}
          </p>
        )}
      </div>
    </div>
  )
}
