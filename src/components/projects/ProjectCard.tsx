import { Buildings, User, Plus, Circle } from '@phosphor-icons/react'
import type { ProjectWithCounts, Task } from '../../lib/types'

interface ProjectCardProps {
  project: ProjectWithCounts
  onClick: () => void
  variant?: 'grid' | 'board'
  tasks?: Task[]
}

const PRIORITY_COLORS: Record<number, string> = {
  1: 'text-danger',
  2: 'text-warning',
  3: 'text-accent',
}

const PRIORITY_BG: Record<number, string> = {
  1: 'bg-danger/10 text-danger',
  2: 'bg-warning/10 text-warning',
}

export function ProjectCard({ project, onClick, variant = 'grid', tasks }: ProjectCardProps) {
  const ScopeIcon = project.scope === 'work' ? Buildings : User
  const scopeColor = project.scope === 'work' ? 'text-red-400' : 'text-purple-400'
  const progressColor = project.scope === 'work' ? 'bg-success' : 'bg-accent'

  const total = project.task_count_total
  const done = project.task_count_done
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  if (variant === 'board') {
    return (
      <div
        className="bg-surface rounded-lg border border-border hover:border-border-hover transition-colors cursor-pointer p-4"
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          <ScopeIcon size={14} className={`${scopeColor} shrink-0`} />
          <span className="flex-1 min-w-0 text-[13px] font-medium text-text-primary truncate">
            {project.name}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[12px] font-mono text-text-muted tabular-nums">
            {done}/{total}
          </span>
          <button
            onClick={(e) => { e.stopPropagation() }}
            className="p-0.5 rounded text-text-muted hover:text-accent transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
    )
  }

  // Grid variant
  return (
    <div
      className="bg-surface rounded-lg border border-border hover:border-border-hover transition-colors cursor-pointer p-4"
      onClick={onClick}
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <ScopeIcon size={14} className={`${scopeColor} shrink-0`} />
        <span className="flex-1 min-w-0 text-[13px] font-medium text-text-primary truncate">
          {project.name}
        </span>
        <span className="text-[11px] font-mono text-text-muted tabular-nums shrink-0">
          {done}/{total}
        </span>
        <button
          onClick={(e) => { e.stopPropagation() }}
          className="p-0.5 rounded text-text-muted hover:text-accent transition-colors shrink-0"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mt-3 mb-2">
          <div className="h-[3px] rounded-full bg-wash/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full ${progressColor} transition-all`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">
            {done}/{total}
          </span>
        </div>
      )}

      {/* Task preview */}
      {tasks && tasks.length > 0 && (
        <div className="mt-2 space-y-1">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 min-w-0">
              <Circle
                size={8}
                weight="fill"
                className={task.priority ? PRIORITY_COLORS[task.priority] || 'text-text-muted/30' : 'text-text-muted/30'}
              />
              <span className="text-[12px] text-text-secondary truncate flex-1 min-w-0">
                {task.text}
              </span>
              {task.priority && task.priority <= 2 && (
                <span className={`text-[9px] font-semibold px-1 rounded shrink-0 ${PRIORITY_BG[task.priority]}`}>
                  P{task.priority}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
