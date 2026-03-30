import { useState, useRef, useEffect, useMemo, useCallback, type ChangeEvent } from 'react'
import { Circle, CaretRight, CaretLeft, Plus, Check, X, ImageSquare, Trash, CalendarBlank, Moon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useQuery } from '../../lib/hooks/useQuery'
import { TaskItem } from '../shared/TaskItem'
import { TaskInput } from '../shared/TaskInput'
import { TaskDetailPanel } from '../shared/TaskDetailPanel'
import { BlockEditor } from '../editor/BlockEditor'
import type { Task, DailyData } from '../../lib/types'

const WEEKDAYS = ['Sondag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lordag']
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember']

const HABITS = [
  { key: 'walk', label: 'Gatur', emoji: '🚶' },
  { key: 'weight', label: 'Vekt', emoji: '⚖️' },
  { key: 'water', label: 'Vann', emoji: '💧' },
  { key: 'journal', label: 'Journal', emoji: '📝' },
] as const

function SectionHeader({ title, count, to }: { title: string; count?: number; to?: string }) {
  const inner = (
    <div className="flex items-center gap-2 group">
      <h2 className="text-[13px] font-medium text-text-muted uppercase tracking-wider">{title}</h2>
      {count !== undefined && count > 0 && (
        <span className="text-[12px] font-mono text-text-muted/60 tabular-nums">{count}</span>
      )}
      {to && <CaretRight size={10} className="text-text-muted/40 group-hover:text-text-muted transition-colors" />}
    </div>
  )
  if (to) return <Link to={to} className="hover:opacity-80 transition-opacity">{inner}</Link>
  return inner
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function TodayView() {
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const { data, loading, refetch } = useQuery<DailyData>(() => api.today(selectedDate), [selectedDate])
  const [newTask, setNewTask] = useState('')
  const [showAddTask, setShowAddTask] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Listen for Ctrl+Shift+Arrow day navigation from Shell
  useEffect(() => {
    const handler = (e: Event) => {
      const delta = (e as CustomEvent).detail as number
      setSelectedDate(prev => {
        const d = new Date(prev + 'T12:00:00')
        d.setDate(d.getDate() + delta)
        return d.toISOString().split('T')[0]
      })
    }
    window.addEventListener('orbit:nav-day', handler)
    return () => window.removeEventListener('orbit:nav-day', handler)
  }, [])

  // Listen for SSE sync events to refetch tasks when they change
  useEffect(() => {
    const source = api.events()
    source.addEventListener('sync', (e: Event) => {
      const msgEvent = e as MessageEvent
      try {
        const payload = JSON.parse(msgEvent.data)
        if (payload?.type?.startsWith('task_') || payload?.type === 'document_updated') {
          refetch()
        }
      } catch { /* ignore parse errors */ }
    })
    return () => source.close()
  }, [refetch])

  const isToday = selectedDate === todayStr()

  const goToPrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }
  const goToNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const handleToggle = async (task: Task) => {
    await api.toggleTask(task.id)
    refetch()
  }

  const handleDelete = async (task: Task) => {
    await api.deleteTask(task.id)
    refetch()
  }

  const handleAddTask = async () => {
    if (!newTask.trim()) return
    await api.createTask({
      text: newTask.trim(),
      due_date: selectedDate,
    })
    setNewTask('')
    setShowAddTask(false)
    refetch()
  }

  const handleToggleHabit = async (habit: string, current: boolean) => {
    await api.updateHabits({ date: selectedDate, [habit]: !current })
    refetch()
  }

  const handleBannerSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setBannerUploading(true)

    try {
      const bannerUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === 'string') resolve(reader.result)
          else reject(new Error('Failed to read banner file'))
        }
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read banner file'))
        reader.readAsDataURL(file)
      })

      await api.setDailyBanner(selectedDate, bannerUrl)
      await refetch()
    } finally {
      setBannerUploading(false)
      e.target.value = ''
    }
  }

  const handleRemoveBanner = async () => {
    await api.setDailyBanner(selectedDate, '')
    refetch()
  }

  // Split tasks into regular and evening
  const { pendingTasks, eveningTasks, doneTasks, totalTasks } = useMemo(() => {
    const allTasks = data?.tasks || []
    const pending = allTasks.filter((t: Task) => !t.done && !t.is_evening)
    const evening = allTasks.filter((t: Task) => !t.done && t.is_evening)
    const done = allTasks.filter((t: Task) => t.done)
    return {
      pendingTasks: pending,
      eveningTasks: evening,
      doneTasks: done,
      totalTasks: allTasks.length,
    }
  }, [data?.tasks])

  // Parse daily note content for the BlockEditor
  const noteContent = useMemo(() => {
    if (!data?.dailyNote?.content) return undefined
    try {
      const raw = data.dailyNote.content
      return typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch {
      return undefined
    }
  }, [data?.dailyNote?.content])

  const handleNoteUpdate = useCallback(
    async (json: Record<string, unknown>) => {
      const docId = data?.dailyNote?.document_id
      if (!docId) return
      await api.updateDocument(docId, { content: JSON.stringify(json) })
      // After document save (which runs syncTasksFromDocument on backend),
      // refetch to pick up any task changes from the editor
      refetch()
    },
    [data?.dailyNote?.document_id, refetch],
  )

  const bannerFileRef = useRef<HTMLInputElement>(null)
  const [bannerUploading, setBannerUploading] = useState(false)

  if (loading) return <div className="p-8 text-text-muted text-[13px]">Laster...</div>

  const d = new Date(selectedDate + 'T12:00:00')
  const dateStr = `${WEEKDAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`

  const doneCount = doneTasks.length
  const banner = data?.dailyNote?.banner_url

  return (
    <div className="flex flex-col min-h-dvh overflow-x-hidden">
      {/* Banner */}
      <div className="group/banner relative shrink-0">
        {banner ? (
          <>
            <img src={banner} alt="" className="w-full h-[120px] sm:h-[200px] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-base via-transparent to-transparent" />
            {/* Banner controls */}
            <div className="absolute bottom-3 left-10 flex gap-1.5 opacity-0 group-hover/banner:opacity-100 transition-all">
              <button onClick={() => bannerFileRef.current?.click()}
                className="px-2 py-1 rounded-md bg-black/40 text-white/60 hover:text-white hover:bg-black/60 text-[11px] transition-colors">
                Bytt
              </button>
              <button
                onClick={handleRemoveBanner}
                className="p-1 rounded-md bg-black/40 text-white/60 hover:text-white hover:bg-black/60 transition-colors">
                <Trash size={14} />
              </button>
            </div>
          </>
        ) : (
          <div className="h-[32px] flex items-end justify-start px-4 sm:px-6 lg:px-10">
            <button onClick={() => bannerFileRef.current?.click()}
              disabled={bannerUploading}
              className="flex items-center gap-1.5 text-[11px] text-text-muted/0 group-hover/banner:text-text-muted hover:!text-text-secondary transition-all">
              <ImageSquare size={13} />
              {bannerUploading ? 'Laster opp...' : 'Legg til banner'}
            </button>
          </div>
        )}
        <input ref={bannerFileRef} type="file" accept="image/*" className="hidden" onChange={handleBannerSelected} />
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          <div className="max-w-[780px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-10">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">{dateStr}</h1>
                  <div className="flex items-center gap-0.5">
                    <button onClick={goToPrevDay} className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-wash/[0.04] transition-colors">
                      <CaretLeft size={14} weight="bold" />
                    </button>
                    <button onClick={goToNextDay} className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-wash/[0.04] transition-colors">
                      <CaretRight size={14} weight="bold" />
                    </button>
                  </div>
                  {!isToday && (
                    <button
                      onClick={() => setSelectedDate(todayStr())}
                      className="text-[11px] text-accent hover:text-accent-hover transition-colors"
                    >
                      I dag
                    </button>
                  )}
                </div>
                <p className="text-[13px] text-text-muted mt-1">
                  {totalTasks > 0
                    ? `${doneCount} av ${totalTasks} tasks ferdig`
                    : isToday ? 'Ingen tasks i dag' : 'Ingen tasks denne dagen'
                  }
                </p>
              </div>
            </div>

            {/* Habits bar */}
            {data?.habits && (
              <div className="flex items-center gap-3 mb-8 -mx-1">
                {HABITS.map(h => {
                  const active = data.habits?.[h.key as keyof typeof data.habits] as boolean
                  return (
                    <button
                      key={h.key}
                      onClick={() => handleToggleHabit(h.key, active)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] transition-all ${
                        active
                          ? 'bg-accent/10 text-accent border border-accent/20'
                          : 'bg-wash/[0.03] text-text-muted border border-border hover:border-border-hover hover:text-text-secondary'
                      }`}
                    >
                      <span>{h.emoji}</span>
                      <span>{h.label}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Tasks */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <SectionHeader title="Tasks" count={pendingTasks.length + eveningTasks.length} to="/tasks" />
                <button
                  onClick={() => setShowAddTask(!showAddTask)}
                  className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-wash/[0.04] transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Add task input */}
              {showAddTask && (
                <div className="flex items-center gap-2 mb-2 -mx-3 px-3">
                  <Circle size={16} className="text-text-muted/30 shrink-0" />
                  <TaskInput
                    value={newTask}
                    onChange={setNewTask}
                    onSubmit={handleAddTask}
                    onCancel={() => { setShowAddTask(false); setNewTask('') }}
                  />
                  <button onClick={handleAddTask} disabled={!newTask.trim()} className="p-1 text-text-muted hover:text-success disabled:opacity-30 transition-colors">
                    <Check size={14} />
                  </button>
                  <button onClick={() => { setShowAddTask(false); setNewTask('') }} className="p-1 text-text-muted hover:text-text-secondary transition-colors">
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="-mx-3">
                {pendingTasks.length === 0 && eveningTasks.length === 0 && doneTasks.length === 0 && !showAddTask && (
                  <div className="py-6 px-3 text-[13px] text-text-muted">Ingen tasks i dag</div>
                )}

                {/* Regular tasks */}
                {pendingTasks.map((task: Task) => (
                  <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} onUpdated={refetch} onSelect={(t) => setSelectedTaskId(t.id)} />
                ))}

                {/* This Evening separator */}
                {eveningTasks.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mx-3 mt-4 mb-2">
                      <Moon size={14} weight="fill" className="text-indigo-300" />
                      <span className="text-[12px] font-medium text-indigo-300 uppercase tracking-wider">This Evening</span>
                      <div className="flex-1 border-t border-indigo-300/20" />
                      <span className="text-[11px] font-mono text-indigo-300/60 tabular-nums">{eveningTasks.length}</span>
                    </div>
                    {eveningTasks.map((task: Task) => (
                      <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} onUpdated={refetch} onSelect={(t) => setSelectedTaskId(t.id)} />
                    ))}
                  </>
                )}

                {/* Done tasks */}
                {doneTasks.length > 0 && (pendingTasks.length > 0 || eveningTasks.length > 0) && (
                  <div className="mx-3 my-2" />
                )}
                {doneTasks.map((task: Task) => (
                  <TaskItem key={task.id} task={task} onToggle={handleToggle} onUpdated={refetch} onSelect={(t) => setSelectedTaskId(t.id)} />
                ))}
              </div>
            </div>

            {/* Notes — BlockEditor */}
            {data?.dailyNote?.document_id && (
              <div className="mb-10">
                <div className="mb-3">
                  <SectionHeader title="Notater" />
                </div>
                <BlockEditor content={noteContent} onUpdate={handleNoteUpdate} />
              </div>
            )}

            {/* Calendar events placeholder */}
            {data?.calendarEvents && data.calendarEvents.length > 0 && (
              <div className="mb-10">
                <div className="mb-3">
                  <SectionHeader title="Kalender" count={data.calendarEvents.length} />
                </div>
                <div className="space-y-1">
                  {data.calendarEvents.map((evt) => (
                    <div key={evt.ical_uid} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-wash/[0.03] transition-colors">
                      <span className="text-[11px] text-text-muted w-14 shrink-0 tabular-nums">
                        {evt.is_all_day ? 'Hele dagen' : evt.start_time?.slice(11, 16)}
                      </span>
                      <span className="text-[13px] text-text-primary">{evt.subject}</span>
                      {evt.is_teams && (
                        <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">Teams</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Calendar sidebar placeholder */}
        <div className="hidden lg:block w-[280px] shrink-0 border-l border-border/50 bg-base">
          <div className="p-4 text-[12px] text-text-muted">
            <CalendarBlank size={16} className="mb-2 text-text-muted/40" />
            Kalender-sidebar kommer snart
          </div>
        </div>
      </div>

      {/* Task detail modal */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={refetch}
      />
    </div>
  )
}
