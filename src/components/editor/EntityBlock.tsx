import { useState, useCallback, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Circle,
  CheckCircle,
  CaretDown,
  CaretRight,
  Flag,
  CalendarBlank,
  Folder,
  VideoCamera,
  FolderSimple,
} from '@phosphor-icons/react'
import { api } from '../../lib/api'

// ─── Types ──────────────────────────────────────────────────────

interface EntityBlockProps {
  editor: Editor
  nodePos: number
  entityType: string
  taskDone: boolean
  taskPriority: number | null
  taskDueDate: string | null
  taskProjectId: string | null
  blockId: string | null
  projectStatus: string | null
  meetingDate: string | null
  children: React.ReactNode
}

// ─── Constants ──────────────────────────────────────────────────

const PRIORITY_COLORS: Record<number, string> = {
  1: 'text-danger',
  2: 'text-warning',
  3: 'text-accent',
}

const PRIORITY_BG: Record<number, string> = {
  1: 'bg-danger/10 text-danger border-danger/20',
  2: 'bg-warning/10 text-warning border-warning/20',
  3: 'bg-accent/10 text-accent border-accent/20',
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'P1',
  2: 'P2',
  3: 'P3',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  someday: 'bg-warning/10 text-warning border-warning/20',
  done: 'bg-text-muted/10 text-text-muted border-text-muted/20',
}

// ─── EntityBlock ────────────────────────────────────────────────

export function EntityBlock({
  editor,
  nodePos,
  entityType,
  taskDone,
  taskPriority,
  taskDueDate,
  taskProjectId,
  blockId,
  projectStatus,
  meetingDate,
  children,
}: EntityBlockProps) {
  const [expanded, setExpanded] = useState(false)

  const updateNodeAttr = useCallback(
    (attrs: Record<string, unknown>) => {
      const { tr } = editor.state
      const node = tr.doc.nodeAt(nodePos)
      if (!node) return

      tr.setNodeMarkup(nodePos, undefined, {
        ...node.attrs,
        ...attrs,
      })
      editor.view.dispatch(tr)

      // Persist to backend if blockId exists
      if (blockId) {
        api.updateBlockProperties(blockId, attrs).catch(console.error)
      }
    },
    [editor, nodePos, blockId],
  )

  if (entityType === 'task') {
    return (
      <TaskEntityBlock
        done={taskDone}
        priority={taskPriority}
        dueDate={taskDueDate}
        projectId={taskProjectId}
        expanded={expanded}
        onToggleExpand={() => setExpanded(!expanded)}
        onUpdateAttr={updateNodeAttr}
      >
        {children}
      </TaskEntityBlock>
    )
  }

  if (entityType === 'meeting') {
    return (
      <MeetingEntityBlock
        meetingDate={meetingDate}
        expanded={expanded}
        onToggleExpand={() => setExpanded(!expanded)}
      >
        {children}
      </MeetingEntityBlock>
    )
  }

  if (entityType === 'project') {
    return (
      <ProjectEntityBlock
        status={projectStatus}
        expanded={expanded}
        onToggleExpand={() => setExpanded(!expanded)}
        onUpdateAttr={updateNodeAttr}
      >
        {children}
      </ProjectEntityBlock>
    )
  }

  return <>{children}</>
}

// ─── Task Entity ────────────────────────────────────────────────

interface TaskEntityBlockProps {
  done: boolean
  priority: number | null
  dueDate: string | null
  projectId: string | null
  expanded: boolean
  onToggleExpand: () => void
  onUpdateAttr: (attrs: Record<string, unknown>) => void
  children: React.ReactNode
}

function TaskEntityBlock({
  done,
  priority,
  dueDate,
  expanded,
  onToggleExpand,
  onUpdateAttr,
  children,
}: TaskEntityBlockProps) {
  const circleColor = done
    ? 'text-text-muted'
    : priority
      ? PRIORITY_COLORS[priority]
      : 'text-text-muted hover:text-accent'

  return (
    <div className={`entity-block entity-block--task ${done ? 'entity-block--done' : ''}`}>
      {/* Main row: checkbox + content */}
      <div className="flex items-start gap-2">
        {/* Checkbox */}
        <button
          className={`shrink-0 mt-[3px] transition-colors ${circleColor}`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onUpdateAttr({ taskDone: !done })
          }}
          contentEditable={false}
        >
          {done ? (
            <CheckCircle size={16} weight="fill" />
          ) : (
            <Circle size={16} weight={priority ? 'bold' : 'regular'} />
          )}
        </button>

        {/* Content */}
        <div className={`flex-1 min-w-0 ${done ? 'entity-text--done' : ''}`}>
          {children}
        </div>

        {/* Expand toggle */}
        <button
          className="shrink-0 mt-[3px] text-text-muted hover:text-text-secondary transition-colors"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleExpand()
          }}
          contentEditable={false}
        >
          {expanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
        </button>
      </div>

      {/* Properties panel */}
      {expanded && (
        <TaskProperties
          done={done}
          priority={priority}
          dueDate={dueDate}
          onUpdateAttr={onUpdateAttr}
        />
      )}
    </div>
  )
}

// ─── Task Properties ────────────────────────────────────────────

interface TaskPropertiesProps {
  done: boolean
  priority: number | null
  dueDate: string | null
  onUpdateAttr: (attrs: Record<string, unknown>) => void
}

function TaskProperties({ done, priority, dueDate, onUpdateAttr }: TaskPropertiesProps) {
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  return (
    <div
      className="entity-properties"
      contentEditable={false}
      suppressContentEditableWarning
    >
      {/* Priority */}
      <div className="relative">
        <button
          className={`entity-prop-btn ${
            priority ? PRIORITY_BG[priority] : 'bg-wash/[0.03] text-text-muted border-border'
          }`}
          onClick={() => {
            setShowPriorityPicker(!showPriorityPicker)
            setShowDatePicker(false)
          }}
        >
          <Flag size={11} weight={priority ? 'fill' : 'regular'} />
          <span>{priority ? PRIORITY_LABELS[priority] : 'Prioritet'}</span>
        </button>
        {showPriorityPicker && (
          <InlinePriorityPicker
            current={priority}
            onPick={(p) => {
              onUpdateAttr({ taskPriority: p })
              setShowPriorityPicker(false)
            }}
            onClose={() => setShowPriorityPicker(false)}
          />
        )}
      </div>

      {/* Due date */}
      <div className="relative">
        <button
          className={`entity-prop-btn ${
            dueDate
              ? isOverdue(dueDate) && !done
                ? 'bg-danger/10 text-danger border-danger/20'
                : 'bg-accent/10 text-accent border-accent/20'
              : 'bg-wash/[0.03] text-text-muted border-border'
          }`}
          onClick={() => {
            setShowDatePicker(!showDatePicker)
            setShowPriorityPicker(false)
          }}
        >
          <CalendarBlank size={11} />
          <span>{dueDate ? fmtDate(dueDate) : 'Frist'}</span>
        </button>
        {showDatePicker && (
          <InlineDatePicker
            current={dueDate}
            onPick={(d) => {
              onUpdateAttr({ taskDueDate: d })
              setShowDatePicker(false)
            }}
            onClose={() => setShowDatePicker(false)}
          />
        )}
      </div>

      {/* Backdrop to close pickers */}
      {(showPriorityPicker || showDatePicker) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowPriorityPicker(false)
            setShowDatePicker(false)
          }}
        />
      )}
    </div>
  )
}

// ─── Meeting Entity ─────────────────────────────────────────────

interface MeetingEntityBlockProps {
  meetingDate: string | null
  expanded: boolean
  onToggleExpand: () => void
  children: React.ReactNode
}

function MeetingEntityBlock({
  meetingDate,
  expanded,
  onToggleExpand,
  children,
}: MeetingEntityBlockProps) {
  return (
    <div className="entity-block entity-block--meeting">
      <div className="flex items-start gap-2">
        <span className="shrink-0 mt-[3px] text-warning" contentEditable={false}>
          <VideoCamera size={16} weight="fill" />
        </span>
        <div className="flex-1 min-w-0">{children}</div>
        <button
          className="shrink-0 mt-[3px] text-text-muted hover:text-text-secondary transition-colors"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleExpand()
          }}
          contentEditable={false}
        >
          {expanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
        </button>
      </div>
      {expanded && (
        <div className="entity-properties" contentEditable={false} suppressContentEditableWarning>
          <span className="entity-prop-btn bg-wash/[0.03] text-text-muted border-border">
            <CalendarBlank size={11} />
            <span>{meetingDate || 'Ingen dato'}</span>
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Project Entity ─────────────────────────────────────────────

interface ProjectEntityBlockProps {
  status: string | null
  expanded: boolean
  onToggleExpand: () => void
  onUpdateAttr: (attrs: Record<string, unknown>) => void
  children: React.ReactNode
}

function ProjectEntityBlock({
  status,
  expanded,
  onToggleExpand,
  onUpdateAttr,
  children,
}: ProjectEntityBlockProps) {
  const [showStatusPicker, setShowStatusPicker] = useState(false)

  return (
    <div className="entity-block entity-block--project">
      <div className="flex items-start gap-2">
        <span className="shrink-0 mt-[3px] text-danger" contentEditable={false}>
          <FolderSimple size={16} weight="fill" />
        </span>
        <div className="flex-1 min-w-0">{children}</div>
        <button
          className="shrink-0 mt-[3px] text-text-muted hover:text-text-secondary transition-colors"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleExpand()
          }}
          contentEditable={false}
        >
          {expanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
        </button>
      </div>
      {expanded && (
        <div className="entity-properties" contentEditable={false} suppressContentEditableWarning>
          <div className="relative">
            <button
              className={`entity-prop-btn ${STATUS_STYLES[status || ''] || 'bg-wash/[0.03] text-text-muted border-border'}`}
              onClick={() => setShowStatusPicker(!showStatusPicker)}
            >
              <Folder size={11} />
              <span>{status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Status'}</span>
            </button>
            {showStatusPicker && (
              <div className="absolute left-0 top-full mt-1 bg-base border border-border-hover rounded-lg py-1 z-20 shadow-xl shadow-black/50 w-28">
                {['active', 'someday', 'done'].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onUpdateAttr({ projectStatus: s })
                      setShowStatusPicker(false)
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-[12px] hover:bg-wash/[0.04] ${
                      status === s ? 'text-text-primary' : 'text-text-secondary'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        s === 'active'
                          ? 'bg-success'
                          : s === 'someday'
                            ? 'bg-warning'
                            : 'bg-text-muted'
                      }`}
                    />
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {showStatusPicker && (
            <div className="fixed inset-0 z-10" onClick={() => setShowStatusPicker(false)} />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Inline Pickers ─────────────────────────────────────────────

function InlinePriorityPicker({
  current,
  onPick,
  onClose,
}: {
  current: number | null
  onPick: (p: number | null) => void
  onClose: () => void
}) {
  return (
    <div className="absolute left-0 top-full mt-1 bg-base border border-border-hover rounded-lg py-1 z-20 shadow-xl shadow-black/50 w-28">
      {[1, 2, 3].map((p) => (
        <button
          key={p}
          onClick={() => onPick(p)}
          className={`flex items-center gap-2 w-full px-3 py-1.5 text-[12px] hover:bg-wash/[0.04] ${
            current === p ? 'text-text-primary' : 'text-text-secondary'
          }`}
        >
          <Circle size={12} weight="bold" className={PRIORITY_COLORS[p]} />
          {PRIORITY_LABELS[p]}
        </button>
      ))}
      {current && (
        <>
          <div className="border-t border-border my-1" />
          <button
            onClick={() => onPick(null)}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-text-muted hover:bg-wash/[0.04]"
          >
            Fjern
          </button>
        </>
      )}
    </div>
  )
}

function InlineDatePicker({
  current,
  onPick,
  onClose,
}: {
  current: string | null
  onPick: (d: string | null) => void
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dateInput, setDateInput] = useState(current || '')

  useEffect(() => {
    setDateInput(current || '')
  }, [current])

  const presets = getPresets()

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-full mt-1 bg-base border border-border-hover rounded-lg p-2.5 z-20 shadow-xl shadow-black/50 w-[200px]"
    >
      {/* Quick presets */}
      <div className="space-y-0.5 mb-2 pb-2 border-b border-border">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => onPick(p.date)}
            className={`flex items-center justify-between w-full px-2 py-1 rounded text-[11px] hover:bg-wash/[0.04] ${
              current === p.date ? 'text-accent' : 'text-text-secondary'
            }`}
          >
            <span>{p.label}</span>
            <span className="text-[10px] text-text-muted font-mono tabular-nums">
              {p.date.slice(5)}
            </span>
          </button>
        ))}
      </div>

      {/* Manual date input */}
      <input
        type="date"
        value={dateInput}
        onChange={(e) => {
          setDateInput(e.target.value)
          if (e.target.value) onPick(e.target.value)
        }}
        className="w-full px-2 py-1 text-[11px] bg-wash/[0.03] border border-border rounded text-text-secondary"
      />

      {current && (
        <button
          onClick={() => onPick(null)}
          className="w-full mt-2 pt-1.5 border-t border-border text-[11px] text-text-muted hover:text-text-secondary text-center"
        >
          Fjern dato
        </button>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function getPresets(): { label: string; date: string }[] {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const daysUntilMon = (1 - now.getDay() + 7) % 7 || 7
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + daysUntilMon)
  const later = new Date(now)
  later.setDate(now.getDate() + 14)
  return [
    { label: 'I dag', date: toDateStr(now) },
    { label: 'I morgen', date: toDateStr(tomorrow) },
    { label: 'Neste uke', date: toDateStr(nextMonday) },
    { label: 'Senere', date: toDateStr(later) },
  ]
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  // Compare dates only (strip time) to get correct day diff
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const nDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((dDate.getTime() - nDate.getTime()) / 86400000)
  if (diff === 0) return 'I dag'
  if (diff === 1) return 'I morgen'
  if (diff === -1) return 'I går'
  if (diff > 1 && diff < 7) return d.toLocaleDateString('nb-NO', { weekday: 'short' })
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr + 'T23:59:59') < new Date()
}
