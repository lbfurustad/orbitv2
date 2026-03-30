import { useState } from 'react'
import {
  CheckCircle, Circle, Trash, X, PencilSimple, Check, Flag,
  CalendarBlank, CaretLeft, CaretRight, Folder, Star, Moon
} from '@phosphor-icons/react'
import { api } from '../../lib/api'
import type { Task } from '../../lib/types'

interface TaskItemProps {
  task: Task
  onToggle: (task: Task) => void
  onDelete?: (task: Task) => void
  onUpdated?: () => void
  onSelect?: (task: Task) => void
  showSource?: boolean
}

const PRIORITY_CIRCLE: Record<number, string> = { 1: 'text-danger', 2: 'text-warning', 3: 'text-accent' }
const PRIORITY_LABELS: Record<number, string> = { 1: 'Urgent', 2: 'Hoy', 3: 'Medium' }
const PRIORITY_COLORS: Record<number, string> = { 1: 'text-danger', 2: 'text-warning', 3: 'text-accent' }

export function TaskItem({ task, onToggle, onDelete, onUpdated, onSelect, showSource = false }: TaskItemProps) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(task.text)
  const [showPriority, setShowPriority] = useState(false)
  const [showDate, setShowDate] = useState(false)

  const handleSave = async () => {
    if (!editText.trim() || editText === task.text) { setEditing(false); return }
    await api.updateTask(task.id, { action: 'edit', text: editText.trim() })
    setEditing(false)
    onUpdated?.()
  }

  const handleSetPriority = async (p: number | null) => {
    setShowPriority(false)
    await api.updateTask(task.id, { action: 'set_priority', priority: p })
    onUpdated?.()
  }

  const handleSetDate = async (date: string | null) => {
    setShowDate(false)
    await api.updateTask(task.id, { action: 'set_due_date', due_date: date })
    onUpdated?.()
  }

  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (task.starred) {
      await api.unstarTask(task.id)
    } else {
      await api.starTask(task.id)
    }
    onUpdated?.()
  }

  if (editing) {
    return (
      <div className="flex items-start gap-3 px-3 py-[7px] rounded-md bg-wash/[0.02]">
        <Circle size={16} className="text-text-muted/30 shrink-0 mt-[2px]" />
        <input type="text" value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          autoFocus className="flex-1 bg-transparent text-[13px] text-text-primary focus:outline-none" />
        <button onClick={handleSave} className="p-1 text-text-muted hover:text-success transition-colors"><Check size={13} /></button>
        <button onClick={() => setEditing(false)} className="p-1 text-text-muted hover:text-text-secondary transition-colors"><X size={13} /></button>
      </div>
    )
  }

  // Checkbox color based on priority
  const circleColor = task.done
    ? ''
    : task.priority
      ? PRIORITY_CIRCLE[task.priority]
      : 'text-text-muted group-hover:text-accent'

  const meaningfulProject = task.project_name && task.project_name !== 'Tasks' && task.project_name !== 'Inbox'

  // Deadline status
  const deadlineOverdue = task.deadline && new Date(task.deadline + 'T23:59:59') < new Date()
  const deadlineSoon = task.deadline && !deadlineOverdue && (() => {
    const d = new Date(task.deadline + 'T23:59:59')
    const diff = d.getTime() - Date.now()
    return diff < 2 * 86400000 // within 2 days
  })()

  const hasMeta = (!!task.scheduled_date && !task.done) || (!!task.deadline && !task.done) || (!!task.due_date && !task.done) || meaningfulProject || !!task.is_evening

  return (
    <div
      className={`group flex items-start gap-2 px-3 py-[9px] rounded-lg transition-colors relative mb-1 bg-wash/[0.02] hover:bg-wash/[0.04]`}>
      {/* Star icon */}
      <button
        onClick={handleToggleStar}
        className={`shrink-0 self-start mt-[5px] transition-colors ${
          task.starred
            ? 'text-amber-400'
            : 'text-transparent hover:text-amber-400/40'
        }`}
        title={task.starred ? 'Fjern stjerne' : 'Stjernemerk for Today'}
      >
        <Star size={14} weight={task.starred ? 'fill' : 'regular'} />
      </button>

      {/* Checkbox */}
      <button onClick={() => onToggle(task)} className="shrink-0 self-start mt-[5px]">
        {task.done
          ? <CheckCircle size={16} weight="fill" className="text-text-muted" />
          : <Circle size={16} weight={task.priority ? 'bold' : 'regular'} className={`${circleColor} transition-colors`} />}
      </button>

      {/* Content area */}
      <div
        className={`flex-1 min-w-0 ${onSelect ? 'cursor-pointer' : ''}`}
        onClick={() => onSelect?.(task)}
        onDoubleClick={(e) => { if (!task.done) { e.stopPropagation(); setEditing(true) } }}
      >
        {/* Task text */}
        <span className={`text-[13px] leading-5 ${task.done ? 'line-through text-text-muted' : 'text-text-primary'}`}>
          {task.text}
        </span>

        {/* Meta row */}
        {hasMeta && (
          <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
            {/* Evening icon */}
            {!!task.is_evening && !task.done && (
              <span className="text-indigo-300 flex items-center gap-0.5">
                <Moon size={11} weight="fill" />
                <span className="text-[10px]">Kveld</span>
              </span>
            )}

            {/* When (scheduled_date) */}
            {task.scheduled_date && !task.done && (
              <span className="text-[11px] text-text-muted tabular-nums">
                {fmtDate(task.scheduled_date)}
              </span>
            )}

            {/* Legacy due_date */}
            {!task.scheduled_date && task.due_date && !task.done && (
              <span className={`text-[11px] tabular-nums ${isOverdue(task.due_date) ? 'text-danger' : 'text-text-muted'}`}>
                {fmtDate(task.due_date)}
              </span>
            )}

            {/* Deadline */}
            {task.deadline && !task.done && (
              <span className={`text-[11px] tabular-nums flex items-center gap-0.5 ${
                deadlineOverdue ? 'text-danger' : deadlineSoon ? 'text-amber-400' : 'text-text-muted'
              }`}>
                <Flag size={10} weight={deadlineOverdue ? 'fill' : 'regular'} />
                {fmtDate(task.deadline)}
              </span>
            )}

            {meaningfulProject && (
              <span className="text-[11px] text-text-muted flex items-center gap-1">
                <Folder size={10} />
                {task.project_name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions — hover only */}
      {!task.done && (
        <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
          <div className="relative">
            <button onClick={() => { setShowPriority(!showPriority); setShowDate(false) }}
              onMouseDown={e => e.preventDefault()} title="Prioritet"
              className={`p-1 rounded transition-colors ${task.priority ? PRIORITY_COLORS[task.priority] + ' hover:bg-wash/[0.04]' : 'text-text-muted hover:text-text-secondary hover:bg-wash/[0.04]'}`}>
              <Flag size={13} weight={task.priority ? 'fill' : 'regular'} />
            </button>
            {showPriority && <PriorityPicker current={task.priority} onPick={handleSetPriority} />}
          </div>

          <div className="relative">
            <button onClick={() => { setShowDate(!showDate); setShowPriority(false) }}
              onMouseDown={e => e.preventDefault()} title="Dato"
              className={`p-1 rounded transition-colors ${task.due_date ? 'text-accent hover:bg-wash/[0.04]' : 'text-text-muted hover:text-text-secondary hover:bg-wash/[0.04]'}`}>
              <CalendarBlank size={13} />
            </button>
            {showDate && <DatePicker current={task.due_date || null} onPick={handleSetDate} />}
          </div>

          <button onClick={() => { setEditText(task.text); setEditing(true) }} title="Rediger"
            className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-wash/[0.04] transition-colors">
            <PencilSimple size={13} />
          </button>
          {onDelete && (
            <button onClick={() => onDelete(task)} title="Slett"
              className="p-1 rounded text-text-muted hover:text-danger hover:bg-wash/[0.04] transition-colors"><Trash size={13} /></button>
          )}
        </div>
      )}

      {(showPriority || showDate) && <div className="fixed inset-0 z-10" onClick={() => { setShowPriority(false); setShowDate(false) }} />}
    </div>
  )
}

// --- Priority Picker ---
function PriorityPicker({ current, onPick }: { current: number | null; onPick: (p: number | null) => void }) {
  return (
    <div className="absolute right-0 top-full mt-1 bg-base border border-border-hover rounded-lg py-1 z-20 shadow-xl shadow-black/50 w-28">
      {[1, 2, 3].map(p => (
        <button key={p} onMouseDown={e => e.preventDefault()} onClick={() => onPick(p)}
          className={`flex items-center gap-2 w-full px-3 py-1.5 text-[12px] hover:bg-wash/[0.04] ${current === p ? 'text-text-primary' : 'text-text-secondary'}`}>
          <Circle size={12} weight="bold" className={PRIORITY_COLORS[p]} />
          {PRIORITY_LABELS[p]}
        </button>
      ))}
      {current && (
        <>
          <div className="border-t border-border my-1" />
          <button onMouseDown={e => e.preventDefault()} onClick={() => onPick(null)}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-text-muted hover:bg-wash/[0.04]">Fjern</button>
        </>
      )}
    </div>
  )
}

// --- Date Picker ---
const DAY_NAMES = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lo', 'So']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des']

function pad(n: number) { return String(n).padStart(2, '0') }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function getPresets(): { label: string; date: string }[] {
  const now = new Date()
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7
  const saturday = new Date(now); saturday.setDate(now.getDate() + daysUntilSat)
  const daysUntilMon = (1 - now.getDay() + 7) % 7 || 7
  const nextMonday = new Date(now); nextMonday.setDate(now.getDate() + daysUntilMon)
  const later = new Date(now); later.setDate(now.getDate() + 14)
  return [
    { label: 'I dag', date: toDateStr(now) },
    { label: 'I morgen', date: toDateStr(tomorrow) },
    { label: 'Til helgen', date: toDateStr(saturday) },
    { label: 'Neste uke', date: toDateStr(nextMonday) },
    { label: 'Senere', date: toDateStr(later) },
  ]
}

function DatePicker({ current, onPick }: { current: string | null; onPick: (d: string | null) => void }) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(current ? parseInt(current.slice(0, 4)) : now.getFullYear())
  const [viewMonth, setViewMonth] = useState(current ? parseInt(current.slice(5, 7)) - 1 : now.getMonth())

  const todayStr = toDateStr(now)
  const presets = getPresets()

  const firstOfMonth = new Date(viewYear, viewMonth, 1)
  let startDay = firstOfMonth.getDay() - 1; if (startDay < 0) startDay = 6
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate()

  const cells: { date: string; day: number; currentMonth: boolean }[] = []
  for (let i = startDay - 1; i >= 0; i--) {
    const d = daysInPrev - i
    const pm = viewMonth === 0 ? 11 : viewMonth - 1
    const py = viewMonth === 0 ? viewYear - 1 : viewYear
    cells.push({ date: `${py}-${pad(pm + 1)}-${pad(d)}`, day: d, currentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`, day: d, currentMonth: true })
  const rem = 7 - (cells.length % 7); if (rem < 7) {
    const nm = viewMonth === 11 ? 0 : viewMonth + 1
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear
    for (let d = 1; d <= rem; d++) cells.push({ date: `${ny}-${pad(nm + 1)}-${pad(d)}`, day: d, currentMonth: false })
  }

  return (
    <div className="absolute right-0 top-full mt-1 bg-base border border-border-hover rounded-lg p-3 z-20 shadow-xl shadow-black/50 w-[240px]" onMouseDown={e => e.preventDefault()}>
      {/* Presets */}
      <div className="space-y-0.5 mb-3 pb-3 border-b border-border">
        {presets.map(p => (
          <button key={p.label} onClick={() => onPick(p.date)}
            className={`flex items-center justify-between w-full px-2 py-1 rounded text-[12px] hover:bg-wash/[0.04] ${current === p.date ? 'text-accent' : 'text-text-secondary'}`}>
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
            <button onClick={() => onPick(cell.date)}
              className={`w-[26px] h-[22px] rounded text-[11px] tabular-nums transition-colors ${
                cell.date === current ? 'bg-accent text-white font-medium'
                  : cell.date === todayStr ? 'ring-1 ring-accent/40 text-text-primary'
                  : cell.currentMonth ? 'text-text-secondary hover:bg-wash/[0.06]'
                  : 'text-text-muted/20'
              }`}>
              {cell.day}
            </button>
          </div>
        ))}
      </div>

      {current && (
        <button onClick={() => onPick(null)} className="w-full mt-2 pt-2 border-t border-border text-[11px] text-text-muted hover:text-text-secondary text-center">
          Fjern dato
        </button>
      )}
    </div>
  )
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  // Compare dates only (strip time) to get correct day diff
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const nDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((dDate.getTime() - nDate.getTime()) / 86400000)
  if (diff === 0) return 'i dag'
  if (diff === 1) return 'i morgen'
  if (diff === -1) return 'i g\u00e5r'
  if (diff > 1 && diff < 7) {
    const weekday = d.toLocaleDateString('nb-NO', { weekday: 'short' })
    const day = d.getDate()
    const month = d.toLocaleDateString('nb-NO', { month: 'short' })
    return `${weekday} ${day}. ${month}`
  }
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr + 'T23:59:59') < new Date()
}
