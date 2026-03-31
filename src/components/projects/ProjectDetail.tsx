import { useState, useCallback } from 'react'
import { X, Buildings, User, Circle, Check, Plus } from '@phosphor-icons/react'
import { api } from '../../lib/api'
import { useQuery } from '../../lib/hooks/useQuery'
import { TaskItem } from '../shared/TaskItem'
import { TaskInput } from '../shared/TaskInput'
import type { ProjectWithCounts, Task } from '../../lib/types'

interface ProjectDetailProps {
  projectId: string
  onClose: () => void
  onRefetch: () => void
}

const STATUS_OPTIONS = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'active', label: 'Active' },
  { id: 'someday', label: 'Someday' },
  { id: 'done', label: 'Done' },
]

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  backlog: 'bg-text-muted/10 text-text-muted border-text-muted/20',
  someday: 'bg-warning/10 text-warning border-warning/20',
  done: 'bg-text-muted/10 text-text-muted border-text-muted/20',
}

const PRIORITY_LABELS: Record<number, string> = { 1: 'P1 - Urgent', 2: 'P2 - Hoy', 3: 'P3 - Medium' }
const PRIORITY_COLORS: Record<number, string> = { 1: 'text-danger', 2: 'text-warning', 3: 'text-accent' }

export function ProjectDetail({ projectId, onClose, onRefetch }: ProjectDetailProps) {
  const { data: project, refetch: refetchProject } = useQuery<ProjectWithCounts>(
    () => api.project(projectId),
    [projectId]
  )
  const { data: tasks, refetch: refetchTasks } = useQuery<Task[]>(
    () => api.tasks({ project_id: projectId }),
    [projectId]
  )

  const [showStatusPicker, setShowStatusPicker] = useState(false)
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskText, setNewTaskText] = useState('')
  const [description, setDescription] = useState<string | null>(null)
  const [descriptionDirty, setDescriptionDirty] = useState(false)

  // Initialize description from project data
  const currentDescription = descriptionDirty ? description : (project?.description || '')

  const handleStatusChange = async (status: string) => {
    setShowStatusPicker(false)
    await api.updateProject(projectId, { action: 'set_status', status })
    refetchProject()
    onRefetch()
  }

  const handlePriorityChange = async (priority: number | null) => {
    setShowPriorityPicker(false)
    await api.updateProject(projectId, { action: 'set_priority', priority })
    refetchProject()
    onRefetch()
  }

  const handleScopeToggle = async () => {
    if (!project) return
    const newScope = project.scope === 'work' ? 'personal' : 'work'
    await api.updateProject(projectId, { action: 'set_scope', scope: newScope })
    refetchProject()
    onRefetch()
  }

  const handleToggleTask = async (task: Task) => {
    await api.toggleTask(task.id)
    refetchTasks()
    refetchProject()
    onRefetch()
  }

  const handleDeleteTask = async (task: Task) => {
    await api.deleteTask(task.id)
    refetchTasks()
    refetchProject()
    onRefetch()
  }

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return
    await api.createTask({
      text: newTaskText.trim(),
      project_id: projectId,
      scope: project?.scope,
    })
    setNewTaskText('')
    setShowAddTask(false)
    refetchTasks()
    refetchProject()
    onRefetch()
  }

  const handleDescriptionBlur = useCallback(async () => {
    if (!descriptionDirty || description === null) return
    await api.updateProject(projectId, { action: 'set_description', description })
    setDescriptionDirty(false)
    refetchProject()
  }, [projectId, description, descriptionDirty, refetchProject])

  const handleArchive = async () => {
    await api.updateProject(projectId, { action: 'set_status', status: 'archived' })
    onRefetch()
    onClose()
  }

  const pendingTasks = tasks?.filter(t => !t.done) || []
  const doneTasks = tasks?.filter(t => t.done) || []
  const totalTasks = (tasks || []).length

  const ScopeIcon = project?.scope === 'work' ? Buildings : User
  const scopeColor = project?.scope === 'work' ? 'text-red-400' : 'text-purple-400'
  const scopeLabel = project?.scope === 'work' ? 'Jobb' : 'Privat'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-dvh w-[440px] bg-base border-l border-border shadow-xl z-30 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex-1 min-w-0">
            {project && (
              <div className="flex items-center gap-2 mb-2">
                <ScopeIcon size={16} className={scopeColor} />
                <span className="text-[11px] text-text-muted uppercase tracking-wider">{scopeLabel}</span>
              </div>
            )}
            <h2 className="text-[18px] font-semibold text-text-primary leading-tight">
              {project?.name || 'Laster...'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-wash/[0.04] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {project && (
          <>
            {/* Properties */}
            <div className="px-6 pb-6 space-y-3">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-text-muted w-20">Status</span>
                <div className="relative">
                  <button
                    onClick={() => { setShowStatusPicker(!showStatusPicker); setShowPriorityPicker(false) }}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      STATUS_STYLES[project.status] || STATUS_STYLES.backlog
                    }`}
                  >
                    {STATUS_OPTIONS.find(s => s.id === project.status)?.label || project.status}
                  </button>
                  {showStatusPicker && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowStatusPicker(false)} />
                      <div className="absolute right-0 top-full mt-1 bg-base border border-border-hover rounded-lg py-1 z-20 shadow-xl shadow-black/50 w-32">
                        {STATUS_OPTIONS.map(s => (
                          <button
                            key={s.id}
                            onClick={() => handleStatusChange(s.id)}
                            className={`flex items-center gap-2 w-full px-3 py-1.5 text-[12px] hover:bg-wash/[0.04] transition-colors ${
                              project.status === s.id ? 'text-text-primary' : 'text-text-secondary'
                            }`}
                          >
                            {project.status === s.id && <Check size={10} />}
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-text-muted w-20">Prioritet</span>
                <div className="relative">
                  <button
                    onClick={() => { setShowPriorityPicker(!showPriorityPicker); setShowStatusPicker(false) }}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full border border-border transition-colors ${
                      project.priority ? PRIORITY_COLORS[project.priority] : 'text-text-muted'
                    }`}
                  >
                    {project.priority ? PRIORITY_LABELS[project.priority] : 'Ingen'}
                  </button>
                  {showPriorityPicker && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowPriorityPicker(false)} />
                      <div className="absolute right-0 top-full mt-1 bg-base border border-border-hover rounded-lg py-1 z-20 shadow-xl shadow-black/50 w-32">
                        {[1, 2, 3].map(p => (
                          <button
                            key={p}
                            onClick={() => handlePriorityChange(p)}
                            className={`flex items-center gap-2 w-full px-3 py-1.5 text-[12px] hover:bg-wash/[0.04] transition-colors ${
                              project.priority === p ? 'text-text-primary' : 'text-text-secondary'
                            }`}
                          >
                            <Circle size={10} weight="bold" className={PRIORITY_COLORS[p]} />
                            {PRIORITY_LABELS[p]}
                          </button>
                        ))}
                        {!!project.priority && (
                          <>
                            <div className="border-t border-border my-1" />
                            <button
                              onClick={() => handlePriorityChange(null)}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-text-muted hover:bg-wash/[0.04] transition-colors"
                            >
                              Fjern
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Scope */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-text-muted w-20">Scope</span>
                <button
                  onClick={handleScopeToggle}
                  className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border border-border hover:border-border-hover transition-colors"
                >
                  <ScopeIcon size={12} className={scopeColor} />
                  <span className={scopeColor}>{scopeLabel}</span>
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="px-6 pb-6">
              <span className="text-[12px] text-text-muted block mb-2">Beskrivelse</span>
              <textarea
                className="w-full bg-transparent text-[13px] text-text-secondary resize-none focus:text-text-primary min-h-[60px] placeholder:text-text-muted/40"
                placeholder="Legg til beskrivelse..."
                value={currentDescription || ''}
                onChange={(e) => { setDescription(e.target.value); setDescriptionDirty(true) }}
                onBlur={handleDescriptionBlur}
              />
            </div>

            {/* Tasks */}
            <div className="px-6 pb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-medium text-text-muted uppercase tracking-wider">
                  Tasks ({totalTasks})
                </span>
                <button
                  onClick={() => setShowAddTask(!showAddTask)}
                  className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-wash/[0.04] transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Add task input */}
              {showAddTask && (
                <div className="flex items-center gap-2 mb-2">
                  <Circle size={16} className="text-text-muted/30 shrink-0" />
                  <TaskInput
                    value={newTaskText}
                    onChange={setNewTaskText}
                    onSubmit={handleAddTask}
                    onCancel={() => { setShowAddTask(false); setNewTaskText('') }}
                    placeholder="Ny task i prosjektet..."
                  />
                </div>
              )}

              {/* Pending tasks */}
              <div className="-mx-3">
                {pendingTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                    onUpdated={() => { refetchTasks(); refetchProject(); onRefetch() }}
                  />
                ))}
              </div>

              {/* Done tasks */}
              {doneTasks.length > 0 && (
                <>
                  {pendingTasks.length > 0 && <div className="my-2" />}
                  <div className="-mx-3">
                    {doneTasks.map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={handleToggleTask}
                        onUpdated={() => { refetchTasks(); refetchProject(); onRefetch() }}
                      />
                    ))}
                  </div>
                </>
              )}

              {totalTasks === 0 && !showAddTask && (
                <p className="text-[12px] text-text-muted py-4">Ingen tasks enna</p>
              )}
            </div>

            {/* Danger zone */}
            <div className="px-6 pb-8 pt-4 border-t border-border/50">
              <button
                onClick={handleArchive}
                className="text-[12px] text-text-muted hover:text-danger transition-colors"
              >
                Arkiver prosjekt
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
