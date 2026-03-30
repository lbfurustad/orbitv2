import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Tray, Star, Moon, CalendarBlank, Infinity, CloudSun, CheckCircle,
  Buildings, Folder, User, Plus, Circle, Check, X
} from '@phosphor-icons/react'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { api } from '../../lib/api'
import { useQuery } from '../../lib/hooks/useQuery'
import { TaskItem } from '../shared/TaskItem'
import { TaskInput } from '../shared/TaskInput'
import { TaskDetailPanel } from '../shared/TaskDetailPanel'
import { EmptyState } from '../shared/EmptyState'
import type { Task, Project, Person } from '../../lib/types'

// --- Filter types ---

type SmartFilter = 'inbox' | 'today' | 'evening' | 'upcoming' | 'anytime' | 'someday' | 'completed'
type ActiveFilter = SmartFilter | { project: string } | { person: string }

function isSmartFilter(f: ActiveFilter): f is SmartFilter {
  return typeof f === 'string'
}
function isProjectFilter(f: ActiveFilter): f is { project: string } {
  return typeof f === 'object' && 'project' in f
}
function isPersonFilter(f: ActiveFilter): f is { person: string } {
  return typeof f === 'object' && 'person' in f
}

// --- Filter config ---

const SMART_FILTERS: { key: SmartFilter; label: string; icon: typeof Tray; indent?: boolean }[] = [
  { key: 'inbox', label: 'Inbox', icon: Tray },
  { key: 'today', label: 'Today', icon: Star },
  { key: 'evening', label: 'This Evening', icon: Moon, indent: true },
  { key: 'upcoming', label: 'Upcoming', icon: CalendarBlank },
  { key: 'anytime', label: 'Anytime', icon: Infinity },
  { key: 'someday', label: 'Someday', icon: CloudSun },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
]

// --- Helper: build API params from filter ---

function filterToParams(filter: ActiveFilter): Record<string, string> {
  if (filter === 'inbox') return { inbox: 'true' }
  if (filter === 'today') return { view: 'today' }
  if (filter === 'evening') return { view: 'evening' }
  if (filter === 'upcoming') return { view: 'upcoming' }
  if (filter === 'anytime') return { view: 'anytime' }
  if (filter === 'someday') return { view: 'someday' }
  if (filter === 'completed') return { done: 'true' }
  if (isProjectFilter(filter)) return { project_id: filter.project }
  if (isPersonFilter(filter)) return { person_id: filter.person }
  return {}
}

function filterLabel(filter: ActiveFilter, projects: Project[] | null, people: (Person & { task_count: number })[] | null): string {
  if (isSmartFilter(filter)) {
    return SMART_FILTERS.find(f => f.key === filter)?.label || ''
  }
  if (isProjectFilter(filter)) {
    return projects?.find(p => p.id === filter.project)?.name || 'Prosjekt'
  }
  if (isPersonFilter(filter)) {
    return people?.find(p => p.id === filter.person)?.name || 'Person'
  }
  return ''
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// --- Droppable sidebar item ---

function DroppableSidebarItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg transition-all duration-150 ${isOver ? 'bg-accent/10 ring-1 ring-accent/30' : ''}`}
    >
      {children}
    </div>
  )
}

// --- Draggable task wrapper ---

function DraggableTaskItem({
  task,
  onToggle,
  onDelete,
  onUpdated,
  onSelect,
  showSource,
}: {
  task: Task
  onToggle: (task: Task) => void
  onDelete: (task: Task) => void
  onUpdated: () => void
  onSelect: (task: Task) => void
  showSource: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-30' : ''}`}
      {...attributes}
      {...listeners}
    >
      <TaskItem
        task={task}
        onToggle={onToggle}
        onDelete={onDelete}
        onUpdated={onUpdated}
        onSelect={onSelect}
        showSource={showSource}
      />
    </div>
  )
}

// --- Progress dots for projects ---

function ProgressDots({ done, total }: { done: number; total: number }) {
  if (total === 0) return null
  const maxDots = Math.min(total, 5)
  const filledDots = Math.min(done, maxDots)
  // If total > 5, scale proportionally
  const scaledFilled = total > 5 ? Math.round((done / total) * 5) : filledDots

  return (
    <div className="flex gap-[2px] items-center">
      {Array.from({ length: maxDots }, (_, i) => (
        <span
          key={i}
          className={`inline-block w-[5px] h-[5px] rounded-full ${
            i < scaledFilled ? 'bg-accent' : 'bg-wash/[0.08]'
          }`}
        />
      ))}
    </div>
  )
}

// --- Main Component ---

export function TasksView() {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('today')
  const [sidebarTab, setSidebarTab] = useState<'projects' | 'people'>('projects')
  const [newTask, setNewTask] = useState('')
  const [showAddTask, setShowAddTask] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  // Sensors: require 5px drag distance so clicks pass through to TaskItem
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  // Fetch data
  const { data: tasks, loading, refetch } = useQuery(
    () => api.tasks(filterToParams(activeFilter)),
    [JSON.stringify(activeFilter)]
  )

  const { data: allTasks, refetch: refetchAll } = useQuery(() => api.tasks(), [])
  const { data: projects, refetch: refetchProjects } = useQuery(() => api.projects(), [])
  const { data: people } = useQuery(() => api.people(), [])

  const refetchEverything = useCallback(() => {
    refetch()
    refetchAll()
    refetchProjects()
  }, [refetch, refetchAll, refetchProjects])

  // Compute smart filter counts from allTasks
  const counts = useMemo(() => {
    const all = allTasks || []
    const today = todayStr()

    return {
      inbox: all.filter(t => !t.done && !t.project_id && !t.scheduled_date && !t.someday).length,
      today: all.filter(t => !t.done && (t.starred || t.scheduled_date === today || t.deadline === today)).length,
      evening: all.filter(t => !t.done && t.is_evening).length,
      upcoming: all.filter(t => !t.done && t.scheduled_date && t.scheduled_date > today).length,
      anytime: all.filter(t => !t.done && !t.someday).length,
      someday: all.filter(t => !t.done && t.someday).length,
      completed: all.filter(t => t.done).length,
    }
  }, [allTasks])

  const handleToggle = async (task: Task) => {
    await api.toggleTask(task.id)
    refetchEverything()
  }

  const handleDelete = async (task: Task) => {
    await api.deleteTask(task.id)
    refetchEverything()
  }

  const handleCreateTask = async () => {
    if (!newTask.trim()) return

    const data: Parameters<typeof api.createTask>[0] = { text: newTask.trim() }

    // Auto-assign context from active filter
    if (activeFilter === 'today') {
      data.due_date = todayStr()
    } else if (isProjectFilter(activeFilter)) {
      data.project_id = activeFilter.project
    }

    await api.createTask(data)
    setNewTask('')
    setShowAddTask(false)
    refetchEverything()
  }

  // --- Drag and Drop ---

  const handleDragStart = (event: DragStartEvent) => {
    const task = (event.active.data?.current as { task: Task } | undefined)?.task
    if (task) setDraggedTask(task)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggedTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = String(active.id)
    const dropTarget = String(over.id)

    let updates: Record<string, unknown> = {}

    switch (dropTarget) {
      case 'drop-today':
        updates = { action: 'star' }
        await api.updateTask(taskId, updates)
        break
      case 'drop-evening':
        // Star + set evening
        await api.updateTask(taskId, { action: 'star' })
        await api.updateTask(taskId, { action: 'set_evening' })
        break
      case 'drop-someday':
        await api.updateTask(taskId, { action: 'set_someday' })
        break
      case 'drop-inbox':
        // Remove project, scheduled_date, someday
        await api.batchUpdateTasks([taskId], {
          project_id: null,
          scheduled_date: null,
          someday: false,
          starred: false,
        })
        break
      default:
        // Check if dropped on a project
        if (dropTarget.startsWith('drop-project-')) {
          const projectId = dropTarget.replace('drop-project-', '')
          await api.updateTask(taskId, { action: 'move_to_project', project_id: projectId })
        }
        break
    }

    refetchEverything()
  }

  // --- Keyboard Shortcuts ---

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire if user is typing in an input
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if ((e.key === 't' || e.key === 'T') && !e.metaKey && !e.ctrlKey) {
        // Star selected task for today
        if (selectedTaskId) {
          e.preventDefault()
          api.starTask(selectedTaskId).then(refetchEverything)
        }
      }

      if ((e.key === 'e' || e.key === 'E') && !e.metaKey && !e.ctrlKey) {
        // Set selected task as evening
        if (selectedTaskId) {
          e.preventDefault()
          api.setEvening(selectedTaskId).then(refetchEverything)
        }
      }

      if (e.key === 's' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        // Set someday (Cmd/Ctrl+S in task context)
        if (selectedTaskId) {
          e.preventDefault()
          api.setSomeday(selectedTaskId).then(refetchEverything)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedTaskId, refetchEverything])

  const heading = filterLabel(activeFilter, projects, people)

  // Map filter keys to drop IDs
  const filterDropId = (key: SmartFilter) => `drop-${key}`

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-[220px] shrink-0 border-r border-border/50 bg-sidebar overflow-y-auto">
          <div className="py-4">
            {/* Smart Filters */}
            <div className="px-3 mb-4">
              {SMART_FILTERS.map(({ key, label, icon: Icon, indent }) => {
                const isActive = activeFilter === key
                const count = counts[key]
                return (
                  <DroppableSidebarItem key={key} id={filterDropId(key)}>
                    <button
                      onClick={() => setActiveFilter(key)}
                      className={`flex items-center gap-2 w-full py-[6px] rounded-md text-[13px] transition-colors ${
                        indent ? 'pl-8 pr-3' : 'px-3'
                      } ${
                        isActive
                          ? 'text-accent font-medium'
                          : 'text-text-secondary hover:text-text-primary hover:bg-wash/[0.03]'
                      }`}
                    >
                      <Icon
                        size={15}
                        weight={isActive && key === 'today' ? 'fill' : key === 'evening' ? 'regular' : 'regular'}
                        className={
                          isActive
                            ? key === 'today' ? 'text-amber-400' : key === 'evening' ? 'text-indigo-300' : 'text-accent'
                            : key === 'today' ? 'text-amber-400/60' : key === 'evening' ? 'text-indigo-300/60' : 'text-text-muted'
                        }
                      />
                      <span className="flex-1 text-left">{label}</span>
                      {count > 0 && (
                        key === 'inbox' ? (
                          <span className="bg-accent text-white rounded-full px-1.5 text-[10px] font-medium min-w-[18px] text-center">
                            {count}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-text-muted tabular-nums">{count}</span>
                        )
                      )}
                    </button>
                  </DroppableSidebarItem>
                )
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-border/50 mx-3 mb-3" />

            {/* Projects / People tabs */}
            <div className="px-3">
              <div className="flex gap-3 px-1 mb-2">
                <button
                  onClick={() => setSidebarTab('projects')}
                  className={`text-[11px] font-medium uppercase tracking-wider transition-colors ${
                    sidebarTab === 'projects' ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Projects
                </button>
                <button
                  onClick={() => setSidebarTab('people')}
                  className={`text-[11px] font-medium uppercase tracking-wider transition-colors ${
                    sidebarTab === 'people' ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  People
                </button>
              </div>

              {sidebarTab === 'projects' && (
                <div className="space-y-[1px]">
                  {(projects || []).map(project => {
                    const isActive = isProjectFilter(activeFilter) && activeFilter.project === project.id
                    const total = project.task_count_total ?? project.task_count ?? 0
                    const done = project.task_count_done ?? project.task_done_count ?? 0
                    return (
                      <DroppableSidebarItem key={project.id} id={`drop-project-${project.id}`}>
                        <button
                          onClick={() => setActiveFilter({ project: project.id })}
                          className={`flex items-center gap-2 w-full px-3 py-[6px] rounded-md text-[13px] transition-colors ${
                            isActive
                              ? 'text-accent font-medium'
                              : 'text-text-secondary hover:text-text-primary hover:bg-wash/[0.03]'
                          }`}
                        >
                          {project.scope === 'work'
                            ? <Buildings size={14} className={isActive ? 'text-accent' : 'text-text-muted'} />
                            : <Folder size={14} className={isActive ? 'text-accent' : 'text-text-muted'} />
                          }
                          <div className="flex-1 text-left min-w-0">
                            <span className="block truncate">{project.name}</span>
                            {total > 0 && (
                              <div className="mt-0.5">
                                <ProgressDots done={done} total={total} />
                              </div>
                            )}
                          </div>
                          {total > 0 && (
                            <span className="text-[10px] font-mono text-text-muted/60 tabular-nums shrink-0">
                              {done}/{total}
                            </span>
                          )}
                        </button>
                      </DroppableSidebarItem>
                    )
                  })}
                  {(!projects || projects.length === 0) && (
                    <div className="px-3 py-2 text-[12px] text-text-muted">Ingen prosjekter</div>
                  )}
                </div>
              )}

              {sidebarTab === 'people' && (
                <div className="space-y-[1px]">
                  {(people || []).filter(p => p.task_count > 0).map(person => {
                    const isActive = isPersonFilter(activeFilter) && activeFilter.person === person.id
                    return (
                      <button
                        key={person.id}
                        onClick={() => setActiveFilter({ person: person.id })}
                        className={`flex items-center gap-2 w-full px-3 py-[6px] rounded-md text-[13px] transition-colors ${
                          isActive
                            ? 'text-accent font-medium'
                            : 'text-text-secondary hover:text-text-primary hover:bg-wash/[0.03]'
                        }`}
                      >
                        <User size={14} className={isActive ? 'text-accent' : 'text-text-muted'} />
                        <span className="flex-1 text-left truncate">{person.name}</span>
                        {person.task_count > 0 && (
                          <span className="text-[11px] font-mono text-text-muted tabular-nums">{person.task_count}</span>
                        )}
                      </button>
                    )
                  })}
                  {(!people || people.filter(p => p.task_count > 0).length === 0) && (
                    <div className="px-3 py-2 text-[12px] text-text-muted">Ingen personer med tasks</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[780px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
            {/* Header */}
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight mb-6">{heading}</h1>

            {/* Task input */}
            <div className="mb-4">
              {showAddTask ? (
                <div className="flex items-center gap-3 px-3 py-[7px] rounded-lg bg-wash/[0.02] border border-border/50">
                  <Circle size={16} className="text-text-muted/30 shrink-0" />
                  <TaskInput
                    value={newTask}
                    onChange={setNewTask}
                    onSubmit={handleCreateTask}
                    onCancel={() => { setShowAddTask(false); setNewTask('') }}
                    placeholder="Ny task... (@ person, # prosjekt)"
                  />
                  <button
                    onClick={handleCreateTask}
                    disabled={!newTask.trim()}
                    className="p-1 text-text-muted hover:text-success disabled:opacity-30 transition-colors"
                  >
                    <Check size={13} />
                  </button>
                  <button
                    onClick={() => { setShowAddTask(false); setNewTask('') }}
                    className="p-1 text-text-muted hover:text-text-secondary transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddTask(true)}
                  className="flex items-center gap-2.5 w-full px-3 py-[9px] rounded-lg text-[13px] text-text-muted hover:text-text-secondary hover:bg-wash/[0.02] transition-colors border border-transparent hover:border-border/50"
                >
                  <Plus size={14} />
                  <span>Ny task... (@ person, # prosjekt)</span>
                </button>
              )}
            </div>

            {/* Task list */}
            {loading ? (
              <div className="text-text-muted text-[13px] py-8 text-center">Laster tasks...</div>
            ) : !tasks || tasks.length === 0 ? (
              <EmptyState
                icon={<CheckCircle size={28} />}
                title={activeFilter === 'completed' ? 'Ingen fullforte tasks' : 'Ingen tasks her'}
                description={activeFilter === 'inbox' ? 'Tasks uten prosjekt og dato havner her' : undefined}
              />
            ) : (
              <div className="-mx-3">
                {tasks.map(task => (
                  <DraggableTaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onUpdated={refetchEverything}
                    onSelect={(t) => setSelectedTaskId(t.id)}
                    showSource={!isProjectFilter(activeFilter)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drag overlay — ghost of dragged task */}
        <DragOverlay dropAnimation={null}>
          {draggedTask ? (
            <div className="bg-base border border-accent/30 rounded-lg shadow-xl shadow-black/30 px-3 py-2 opacity-90 max-w-[360px]">
              <span className="text-[13px] text-text-primary truncate block">{draggedTask.text}</span>
            </div>
          ) : null}
        </DragOverlay>

        {/* Task detail modal */}
        <TaskDetailPanel
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={refetchEverything}
        />
      </div>
    </DndContext>
  )
}
