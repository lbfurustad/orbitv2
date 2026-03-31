import { useState, useEffect, useRef } from 'react'
import {
  X, CheckCircle, Circle, Flag, CalendarBlank, Folder,
  CaretLeft, CaretRight, PencilSimple, Check, Trash, FileText,
  Plus, Star, Moon, CloudSun
} from '@phosphor-icons/react'
import { api } from '../../lib/api'
import type { Task, Project } from '../../lib/types'

interface TaskDetailPanelProps {
  taskId: string | null
  onClose: () => void
  onUpdated?: () => void
}

const PRIORITY_OPTS: { value: number | null; label: string; color: string }[] = [
  { value: 1, label: 'Urgent', color: 'text-danger' },
  { value: 2, label: 'Hoy', color: 'text-warning' },
  { value: 3, label: 'Medium', color: 'text-accent' },
  { value: null, label: 'Ingen', color: 'text-text-muted' },
]

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function relativeDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  // Compare dates only (strip time) to get correct day diff
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const nDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((dDate.getTime() - nDate.getTime()) / 86400000)
  if (diff === 0) return 'I dag'
  if (diff === 1) return 'I morgen'
  if (diff === -1) return 'I g\u00e5r'
  if (diff < -1) return `${Math.abs(diff)} dager siden`
  if (diff < 7) return d.toLocaleDateString('nb-NO', { weekday: 'long' })
  return fmtDate(dateStr)
}

export function TaskDetailPanel({ taskId, onClose, onUpdated }: TaskDetailPanelProps) {
  const [task, setTask] = useState<Task | null>(null)
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleText, setTitleText] = useState('')
  const [newSubtask, setNewSubtask] = useState('')
  const [showAddSubtask, setShowAddSubtask] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const subtaskRef = useRef<HTMLInputElement>(null)

  const reload = () => {
    if (!taskId) return
    Promise.all([
      api.task(taskId).then(setTask),
      api.subtasks(taskId).then(setSubtasks),
    ]).catch(() => {})
  }

  useEffect(() => {
    if (!taskId) { setTask(null); setSubtasks([]); setEditingTitle(false); return }
    setLoading(true)
    Promise.all([
      api.task(taskId),
      api.subtasks(taskId),
    ]).then(([t, st]) => {
      setTask(t)
      setSubtasks(st)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [taskId])

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus()
  }, [editingTitle])

  useEffect(() => {
    if (showAddSubtask) subtaskRef.current?.focus()
  }, [showAddSubtask])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!taskId) return null

  const isOverdue = task?.due_date && new Date(task.due_date + 'T23:59:59') < new Date() && !task.done
  const deadlineOverdue = task?.deadline && new Date(task.deadline + 'T23:59:59') < new Date() && !task.done
  const deadlineSoon = task?.deadline && !deadlineOverdue && (() => {
    const d = new Date(task.deadline + 'T23:59:59')
    return d.getTime() - Date.now() < 2 * 86400000
  })()

  const update = async (fn: () => Promise<unknown>) => {
    await fn()
    onUpdated?.()
    reload()
  }

  const handleToggle = () => update(() => api.toggleTask(taskId))
  const handlePriority = (p: number | null) => update(() => api.updateTask(taskId, { action: 'set_priority', priority: p }))
  const handleDueDate = (d: string | null) => update(() => api.updateTask(taskId, { action: 'set_due_date', due_date: d }))
  const handleScheduledDate = (d: string | null) => update(() => {
    if (d) return api.scheduleTask(taskId, d)
    return api.updateTask(taskId, { action: 'schedule', date: null })
  })
  const handleDeadline = (d: string | null) => update(() => {
    if (d) return api.setDeadline(taskId, d)
    return api.updateTask(taskId, { action: 'set_deadline', deadline: null })
  })
  const handleToggleStar = () => update(() => task?.starred ? api.unstarTask(taskId) : api.starTask(taskId))
  const handleToggleEvening = () => update(() => api.setEvening(taskId))
  const handleToggleSomeday = () => update(() => api.setSomeday(taskId))
  const handleDelete = async () => {
    await api.deleteTask(taskId)
    onUpdated?.()
    onClose()
  }

  const handleSaveTitle = async () => {
    if (!titleText.trim() || titleText === task?.text) { setEditingTitle(false); return }
    await update(() => api.updateTask(taskId, { action: 'edit', text: titleText.trim() }))
    setEditingTitle(false)
  }

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return
    await api.createTask({
      text: newSubtask.trim(),
      parent_task_id: taskId,
      scope: task?.scope,
      project_id: task?.project_id || undefined,
      due_date: task?.due_date || undefined,
    })
    setNewSubtask('')
    setShowAddSubtask(false)
    onUpdated?.()
    reload()
  }

  const handleToggleSubtask = async (st: Task) => {
    await api.toggleTask(st.id)
    onUpdated?.()
    reload()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        className="fixed z-40 top-[10%] left-1/2 -translate-x-1/2 w-[90vw] max-w-[560px] max-h-[80vh] bg-base border border-border rounded-xl shadow-2xl shadow-black/60 overflow-y-auto"
      >
        {loading && !task ? (
          <div className="p-6 text-[13px] text-text-muted">Laster...</div>
        ) : task ? (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-base z-10 px-6 pt-5 pb-4 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Star button */}
                  <button onClick={handleToggleStar} className="shrink-0 mt-0.5" title={task.starred ? 'Fjern stjerne' : 'Stjernemerk'}>
                    <Star size={18} weight={task.starred ? 'fill' : 'regular'} className={task.starred ? 'text-amber-400' : 'text-text-muted/40 hover:text-amber-400/60 transition-colors'} />
                  </button>

                  <button onClick={handleToggle} className="shrink-0 mt-0.5">
                    {task.done
                      ? <CheckCircle size={20} weight="fill" className="text-success" />
                      : <Circle size={20} weight={task.priority ? 'bold' : 'regular'} className={task.priority ? PRIORITY_OPTS.find(p => p.value === task.priority)?.color || 'text-text-muted' : 'text-text-muted hover:text-accent transition-colors'} />
                    }
                  </button>
                  {editingTitle ? (
                    <div className="flex-1 flex items-center gap-1">
                      <input ref={titleRef} value={titleText}
                        onChange={e => setTitleText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                        className="flex-1 bg-transparent text-[15px] font-medium text-text-primary focus:outline-none" />
                      <button onClick={handleSaveTitle} className="p-0.5 text-text-muted hover:text-success"><Check size={14} /></button>
                      <button onClick={() => setEditingTitle(false)} className="p-0.5 text-text-muted hover:text-text-secondary"><X size={14} /></button>
                    </div>
                  ) : (
                    <h2
                      className={`text-[15px] font-medium leading-snug cursor-pointer group ${task.done ? 'line-through text-text-muted' : 'text-text-primary'}`}
                      onClick={() => { setTitleText(task.text); setEditingTitle(true) }}
                    >
                      {task.text}
                      <PencilSimple size={12} className="inline ml-1.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </h2>
                  )}
                </div>
                <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-wash/[0.04] transition-colors shrink-0">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Properties */}
              <div className="space-y-1">
                {/* Priority */}
                <EditableProperty label="Prioritet">
                  <InlinePicker
                    options={PRIORITY_OPTS.map(p => ({ value: String(p.value), label: p.label, color: p.color }))}
                    current={String(task.priority)}
                    onPick={v => handlePriority(v === 'null' ? null : Number(v))}
                  >
                    <div className="flex items-center gap-1.5 cursor-pointer hover:bg-wash/[0.04] rounded px-1.5 py-0.5 -mx-1.5 transition-colors">
                      <Flag size={13} weight={task.priority ? 'fill' : 'regular'} className={task.priority ? PRIORITY_OPTS.find(p => p.value === task.priority)?.color || 'text-text-muted' : 'text-text-muted'} />
                      <span className={`text-[13px] ${task.priority ? PRIORITY_OPTS.find(p => p.value === task.priority)?.color : 'text-text-muted'}`}>
                        {task.priority ? PRIORITY_OPTS.find(p => p.value === task.priority)?.label : 'Ingen'}
                      </span>
                    </div>
                  </InlinePicker>
                </EditableProperty>

                {/* When (scheduled_date) */}
                <EditableProperty label="When">
                  <InlineDatePicker
                    current={task.scheduled_date || null}
                    onPick={handleScheduledDate}
                    presets={getWhenPresets()}
                  >
                    <div className="flex items-center gap-1.5 cursor-pointer hover:bg-wash/[0.04] rounded px-1.5 py-0.5 -mx-1.5 transition-colors">
                      <CalendarBlank size={13} className="text-text-muted" />
                      <span className={`text-[13px] ${task.scheduled_date ? 'text-text-secondary' : 'text-text-muted'}`}>
                        {task.scheduled_date ? relativeDate(task.scheduled_date) : 'Ingen dato'}
                      </span>
                    </div>
                  </InlineDatePicker>
                </EditableProperty>

                {/* Deadline */}
                <EditableProperty label="Deadline">
                  <InlineDatePicker current={task.deadline || null} onPick={handleDeadline}>
                    <div className="flex items-center gap-1.5 cursor-pointer hover:bg-wash/[0.04] rounded px-1.5 py-0.5 -mx-1.5 transition-colors">
                      <Flag size={13} className={deadlineOverdue ? 'text-danger' : deadlineSoon ? 'text-amber-400' : 'text-text-muted'} />
                      <span className={`text-[13px] ${deadlineOverdue ? 'text-danger' : deadlineSoon ? 'text-amber-400' : task.deadline ? 'text-text-secondary' : 'text-text-muted'}`}>
                        {task.deadline ? relativeDate(task.deadline) : 'Ingen deadline'}
                      </span>
                    </div>
                  </InlineDatePicker>
                </EditableProperty>

                {/* Legacy due date (backward compat) */}
                <EditableProperty label="Frist">
                  <InlineDatePicker current={task.due_date || null} onPick={handleDueDate}>
                    <div className="flex items-center gap-1.5 cursor-pointer hover:bg-wash/[0.04] rounded px-1.5 py-0.5 -mx-1.5 transition-colors">
                      <CalendarBlank size={13} className={isOverdue ? 'text-danger' : 'text-text-muted'} />
                      <span className={`text-[13px] ${isOverdue ? 'text-danger' : task.due_date ? 'text-text-secondary' : 'text-text-muted'}`}>
                        {task.due_date ? relativeDate(task.due_date) : 'Ingen frist'}
                      </span>
                    </div>
                  </InlineDatePicker>
                </EditableProperty>

                {/* Evening toggle */}
                <EditableProperty label="Kveld">
                  <button
                    onClick={handleToggleEvening}
                    className="flex items-center gap-1.5 cursor-pointer hover:bg-wash/[0.04] rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
                  >
                    <Moon size={13} weight={task.is_evening ? 'fill' : 'regular'} className={task.is_evening ? 'text-indigo-300' : 'text-text-muted'} />
                    <span className={`text-[13px] ${task.is_evening ? 'text-indigo-300' : 'text-text-muted'}`}>
                      {task.is_evening ? 'This Evening' : 'Av'}
                    </span>
                  </button>
                </EditableProperty>

                {/* Someday toggle */}
                <EditableProperty label="Someday">
                  <button
                    onClick={handleToggleSomeday}
                    className="flex items-center gap-1.5 cursor-pointer hover:bg-wash/[0.04] rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
                  >
                    <CloudSun size={13} weight={task.someday ? 'fill' : 'regular'} className={task.someday ? 'text-accent' : 'text-text-muted'} />
                    <span className={`text-[13px] ${task.someday ? 'text-accent' : 'text-text-muted'}`}>
                      {task.someday ? 'Ja' : 'Nei'}
                    </span>
                  </button>
                </EditableProperty>

                {/* Status */}
                <EditableProperty label="Status">
                  <button onClick={handleToggle} className="flex items-center gap-1.5 cursor-pointer hover:bg-wash/[0.04] rounded px-1.5 py-0.5 -mx-1.5 transition-colors">
                    <span className={`text-[13px] ${task.done ? 'text-success' : 'text-text-secondary'}`}>
                      {task.done ? 'Fullfort' : 'Aktiv'}
                    </span>
                  </button>
                </EditableProperty>

                {/* Scope */}
                <EditableProperty label="Scope">
                  <span className="text-[13px] text-text-secondary capitalize px-1.5 py-0.5 -mx-1.5">{task.scope}</span>
                </EditableProperty>

                {/* Project */}
                {task.project_name && (
                  <EditableProperty label="Prosjekt">
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 -mx-1.5">
                      <Folder size={13} className="text-text-muted" />
                      <span className="text-[13px] text-text-secondary">{task.project_name}</span>
                    </div>
                  </EditableProperty>
                )}
              </div>

              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-text-muted" />
                    <h3 className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Subtasks</h3>
                    {subtasks.length > 0 && (
                      <span className="text-[11px] font-mono text-text-muted/60 tabular-nums">
                        {subtasks.filter(st => st.done).length}/{subtasks.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowAddSubtask(!showAddSubtask)}
                    className="p-0.5 rounded text-text-muted hover:text-text-secondary hover:bg-wash/[0.04] transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {showAddSubtask && (
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Circle size={14} className="text-text-muted/30 shrink-0" />
                    <input
                      ref={subtaskRef}
                      value={newSubtask}
                      onChange={e => setNewSubtask(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask(); if (e.key === 'Escape') { setShowAddSubtask(false); setNewSubtask('') } }}
                      placeholder="Ny subtask..."
                      className="flex-1 bg-transparent text-[12px] text-text-primary focus:outline-none"
                    />
                    <button onClick={handleAddSubtask} disabled={!newSubtask.trim()} className="p-0.5 text-text-muted hover:text-success disabled:opacity-30 transition-colors">
                      <Check size={12} />
                    </button>
                    <button onClick={() => { setShowAddSubtask(false); setNewSubtask('') }} className="p-0.5 text-text-muted hover:text-text-secondary transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                )}

                {subtasks.length > 0 ? (
                  <div className="space-y-px">
                    {subtasks.map(st => (
                      <div key={st.id} className="flex items-center gap-2.5 px-1 py-1 rounded-md hover:bg-wash/[0.03] transition-colors">
                        <button onClick={() => handleToggleSubtask(st)} className="shrink-0">
                          {st.done
                            ? <CheckCircle size={14} weight="fill" className="text-text-muted" />
                            : <Circle size={14} className="text-text-muted/40 hover:text-accent transition-colors" />
                          }
                        </button>
                        <span className={`text-[12px] truncate ${st.done ? 'line-through text-text-muted' : 'text-text-secondary'}`}>
                          {st.text}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : !showAddSubtask ? (
                  <div className="text-[12px] text-text-muted/50 px-1">Ingen subtasks</div>
                ) : null}
              </div>

              {/* Source document */}
              {task.source_document_id && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className="text-text-muted" />
                    <h3 className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Kilde</h3>
                  </div>
                  <div className="flex items-center gap-2 px-1 text-[12px] text-text-secondary">
                    <FileText size={13} className="text-text-muted shrink-0" />
                    <span>Dokument {task.source_document_id.slice(0, 8)}</span>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-2 border-t border-border space-y-1">
                <div className="text-[11px] text-text-muted">
                  Opprettet: {new Date(task.created_at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                {task.completed_at && (
                  <div className="text-[11px] text-text-muted">
                    Fullfort: {new Date(task.completed_at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] text-danger hover:bg-danger/10 transition-colors"
              >
                <Trash size={13} />
                <span>Slett task</span>
              </button>
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}

// --- When presets (Things 3 style) ---

function pad(n: number) { return String(n).padStart(2, '0') }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function getWhenPresets(): { label: string; date: string }[] {
  const now = new Date()
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7
  const saturday = new Date(now); saturday.setDate(now.getDate() + daysUntilSat)
  const daysUntilMon = (1 - now.getDay() + 7) % 7 || 7
  const nextMonday = new Date(now); nextMonday.setDate(now.getDate() + daysUntilMon)
  return [
    { label: 'I dag', date: toDateStr(now) },
    { label: 'I morgen', date: toDateStr(tomorrow) },
    { label: 'Til helgen', date: toDateStr(saturday) },
    { label: 'Neste uke', date: toDateStr(nextMonday) },
  ]
}

// --- Sub-components ---

function EditableProperty({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[11px] text-text-muted w-16 shrink-0">{label}</span>
      <div>{children}</div>
    </div>
  )
}

// --- Inline picker (dropdown) ---
function InlinePicker({ options, current, onPick, children }: {
  options: { value: string; label: string; color: string }[]
  current: string
  onPick: (value: string) => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(!open)}>{children}</div>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-base border border-border-hover rounded-lg py-1 z-20 shadow-xl shadow-black/50 w-32">
          {options.map(opt => (
            <button key={String(opt.value)} onClick={() => { onPick(opt.value); setOpen(false) }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-[12px] hover:bg-wash/[0.06] transition-colors ${current === opt.value ? 'text-text-primary' : 'text-text-secondary'}`}>
              <Flag size={12} weight={current === opt.value ? 'fill' : 'regular'} className={opt.color} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Inline date picker ---
const DAY_NAMES = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lo', 'So']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des']

function InlineDatePicker({ current, onPick, children, presets: customPresets }: {
  current: string | null
  onPick: (d: string | null) => void
  children: React.ReactNode
  presets?: { label: string; date: string }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const now = new Date()
  const [viewYear, setViewYear] = useState(current ? parseInt(current.slice(0, 4)) : now.getFullYear())
  const [viewMonth, setViewMonth] = useState(current ? parseInt(current.slice(5, 7)) - 1 : now.getMonth())

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const todayStr = toDateStr(now)
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  const daysUntilMon = (1 - now.getDay() + 7) % 7 || 7
  const nextMon = new Date(now); nextMon.setDate(now.getDate() + daysUntilMon)

  const defaultPresets = [
    { label: 'I dag', date: todayStr },
    { label: 'I morgen', date: toDateStr(tomorrow) },
    { label: 'Neste uke', date: toDateStr(nextMon) },
  ]

  const presets = customPresets || defaultPresets

  const firstOfMonth = new Date(viewYear, viewMonth, 1)
  let startDay = firstOfMonth.getDay() - 1; if (startDay < 0) startDay = 6
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate()

  const cells: { date: string; day: number; cur: boolean }[] = []
  for (let i = startDay - 1; i >= 0; i--) {
    const d = daysInPrev - i
    const pm = viewMonth === 0 ? 11 : viewMonth - 1
    const py = viewMonth === 0 ? viewYear - 1 : viewYear
    cells.push({ date: `${py}-${pad(pm + 1)}-${pad(d)}`, day: d, cur: false })
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`, day: d, cur: true })
  const rem = 7 - (cells.length % 7); if (rem < 7) {
    const nm = viewMonth === 11 ? 0 : viewMonth + 1
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear
    for (let d = 1; d <= rem; d++) cells.push({ date: `${ny}-${pad(nm + 1)}-${pad(d)}`, day: d, cur: false })
  }

  const pick = (d: string | null) => { onPick(d); setOpen(false) }

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(!open)}>{children}</div>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-base border border-border-hover rounded-lg p-3 z-20 shadow-xl shadow-black/50 w-[250px]">
          {/* Quick picks */}
          <div className="space-y-0.5 mb-3 pb-3 border-b border-border">
            {presets.map(p => (
              <button key={p.label} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.stopPropagation(); pick(p.date) }}
                className={`flex items-center justify-between w-full px-2 py-1 rounded text-[12px] hover:bg-wash/[0.06] ${current === p.date ? 'text-accent' : 'text-text-secondary'}`}>
                <span>{p.label}</span>
                <span className="text-[10px] text-text-muted font-mono tabular-nums">{p.date.slice(5)}</span>
              </button>
            ))}
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-text-secondary">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <div className="flex gap-0.5">
              <button onClick={() => { if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) } else setViewMonth(viewMonth - 1) }}
                className="p-0.5 rounded hover:bg-wash/[0.06] text-text-muted"><CaretLeft size={10} weight="bold" /></button>
              <button onClick={() => { if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) } else setViewMonth(viewMonth + 1) }}
                className="p-0.5 rounded hover:bg-wash/[0.06] text-text-muted"><CaretRight size={10} weight="bold" /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map(d => <span key={d} className="text-[9px] text-text-muted/40 text-center">{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map(cell => (
              <div key={cell.date} className="flex justify-center">
                <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.stopPropagation(); pick(cell.date) }}
                  className={`w-[28px] h-[24px] rounded text-[11px] tabular-nums transition-colors ${
                    cell.date === current ? 'bg-accent text-white font-medium'
                      : cell.date === todayStr ? 'ring-1 ring-accent/40 text-text-primary'
                      : cell.cur ? 'text-text-secondary hover:bg-wash/[0.06]'
                      : 'text-text-muted/20'
                  }`}>
                  {cell.day}
                </button>
              </div>
            ))}
          </div>

          {current && (
            <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.stopPropagation(); pick(null) }} className="w-full mt-2 pt-2 border-t border-border text-[11px] text-text-muted hover:text-text-secondary text-center">
              Fjern dato
            </button>
          )}
        </div>
      )}
    </div>
  )
}
