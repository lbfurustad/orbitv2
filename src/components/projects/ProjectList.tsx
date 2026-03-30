import { Buildings, User, Plus, Folder } from '@phosphor-icons/react'
import { EmptyState } from '../shared/EmptyState'
import type { ProjectWithCounts } from '../../lib/types'

interface ProjectListProps {
  projects: ProjectWithCounts[]
  onSelect: (project: ProjectWithCounts) => void
  onRefetch: () => void
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-success/10 text-success',
  backlog: 'bg-text-muted/10 text-text-muted',
  someday: 'bg-warning/10 text-warning',
  done: 'bg-text-muted/10 text-text-muted',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  backlog: 'Backlog',
  someday: 'Someday',
  done: 'Done',
}

export function ProjectList({ projects, onSelect, onRefetch }: ProjectListProps) {
  if (projects.length === 0) {
    return <EmptyState icon={<Folder size={32} />} title="Ingen prosjekter" description="Opprett et nytt prosjekt for a komme i gang" />
  }

  return (
    <div className="flex flex-col">
      {projects.map(project => {
        const ScopeIcon = project.scope === 'work' ? Buildings : User
        const scopeColor = project.scope === 'work' ? 'text-red-400' : 'text-purple-400'
        const statusStyle = STATUS_STYLES[project.status] || STATUS_STYLES.backlog

        return (
          <div
            key={project.id}
            className="flex items-center gap-3 px-3 py-[9px] rounded-lg hover:bg-wash/[0.03] transition-colors"
          >
            <ScopeIcon size={16} className={`${scopeColor} shrink-0`} />
            <span
              className="flex-1 min-w-0 text-[13px] font-medium text-text-primary cursor-pointer hover:text-accent truncate transition-colors"
              onClick={() => onSelect(project)}
            >
              {project.name}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${statusStyle}`}>
              {STATUS_LABELS[project.status] || project.status}
            </span>
            <span className="text-[12px] font-mono text-text-muted tabular-nums shrink-0">
              {project.task_count_done}/{project.task_count_total}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSelect(project)
              }}
              className="p-1 rounded text-text-muted hover:text-accent transition-colors shrink-0"
              title="Vis detaljer"
            >
              <Plus size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
