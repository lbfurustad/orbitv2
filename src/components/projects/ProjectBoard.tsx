import { useState, useMemo } from 'react'
import { DndContext, DragOverlay, useDroppable, useDraggable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { ProjectCard } from './ProjectCard'
import type { ProjectWithCounts } from '../../lib/types'

interface ProjectBoardProps {
  projects: ProjectWithCounts[]
  onSelect: (project: ProjectWithCounts) => void
  onStatusChange: (id: string, status: string) => void
  onRefetch: () => void
}

const COLUMNS = [
  { id: 'backlog', label: 'BACKLOG' },
  { id: 'active', label: 'ACTIVE' },
  { id: 'someday', label: 'SOMEDAY' },
  { id: 'done', label: 'DONE' },
]

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`min-w-[240px] flex-1 rounded-lg border-2 border-dashed p-2 min-h-[200px] transition-colors ${
        isOver
          ? 'bg-accent/5 border-accent/20'
          : 'bg-transparent border-transparent'
      }`}
    >
      {children}
    </div>
  )
}

function DraggableCard({
  project,
  onSelect,
}: {
  project: ProjectWithCounts
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`transition-opacity ${isDragging ? 'opacity-40' : ''}`}
    >
      <ProjectCard project={project} onClick={onSelect} variant="board" />
    </div>
  )
}

export function ProjectBoard({ projects, onSelect, onStatusChange, onRefetch }: ProjectBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const grouped = useMemo(() => {
    const groups: Record<string, ProjectWithCounts[]> = {
      backlog: [],
      active: [],
      someday: [],
      done: [],
    }
    for (const p of projects) {
      const status = p.status as string
      if (groups[status]) {
        groups[status].push(p)
      } else {
        groups.active.push(p)
      }
    }
    return groups
  }, [projects])

  const activeProject = activeId ? projects.find(p => p.id === activeId) : null

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      const projectId = active.id as string
      const newStatus = over.id as string
      // Only update if dropping on a column
      if (COLUMNS.some(c => c.id === newStatus)) {
        onStatusChange(projectId, newStatus)
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => setActiveId(event.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const items = grouped[col.id] || []
          return (
            <div key={col.id} className="min-w-[240px] flex-1">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  {col.label}
                </span>
                <span className="text-[11px] text-text-muted/60 tabular-nums">
                  ({items.length})
                </span>
              </div>

              {/* Droppable area */}
              <DroppableColumn id={col.id}>
                <div className="flex flex-col gap-2">
                  {items.map(p => (
                    <DraggableCard
                      key={p.id}
                      project={p}
                      onSelect={() => onSelect(p)}
                    />
                  ))}
                  {items.length === 0 && (
                    <div className="py-8 text-center text-[11px] text-text-muted/40">
                      Ingen prosjekter
                    </div>
                  )}
                </div>
              </DroppableColumn>
            </div>
          )
        })}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeProject && (
          <div className="opacity-90">
            <ProjectCard project={activeProject} onClick={() => {}} variant="board" />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
