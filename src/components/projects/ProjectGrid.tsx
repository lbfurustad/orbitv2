import { useState, useEffect, useMemo } from 'react'
import { Folder } from '@phosphor-icons/react'
import { api } from '../../lib/api'
import { ProjectCard } from './ProjectCard'
import { EmptyState } from '../shared/EmptyState'
import type { ProjectWithCounts, Task } from '../../lib/types'

interface ProjectGridProps {
  projects: ProjectWithCounts[]
  onSelect: (project: ProjectWithCounts) => void
  onRefetch: () => void
}

export function ProjectGrid({ projects, onSelect, onRefetch }: ProjectGridProps) {
  const [allTasks, setAllTasks] = useState<Task[]>([])

  // Fetch all undone tasks once for preview
  useEffect(() => {
    api.tasks({ done: 'false' }).then(setAllTasks).catch(() => setAllTasks([]))
  }, [projects])

  const tasksByProject = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const task of allTasks) {
      if (task.project_id) {
        if (!map[task.project_id]) map[task.project_id] = []
        map[task.project_id].push(task)
      }
    }
    return map
  }, [allTasks])

  if (projects.length === 0) {
    return <EmptyState icon={<Folder size={32} />} title="Ingen prosjekter" description="Opprett et nytt prosjekt for a komme i gang" />
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {projects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => onSelect(project)}
          variant="grid"
          tasks={tasksByProject[project.id]?.slice(0, 4)}
        />
      ))}
    </div>
  )
}
