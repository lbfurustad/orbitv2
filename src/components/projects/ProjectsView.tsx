import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SquaresFour, List, Kanban, Plus, Graph } from '@phosphor-icons/react'
import { api } from '../../lib/api'
import { useQuery } from '../../lib/hooks/useQuery'
import { ProjectList } from './ProjectList'
import { ProjectGrid } from './ProjectGrid'
import { ProjectBoard } from './ProjectBoard'
import { ProjectDetail } from './ProjectDetail'
import { CreateProjectDialog } from './CreateProjectDialog'
import type { ProjectWithCounts, ProjectViewMode } from '../../lib/types'

const ProjectCanvas = lazy(() => import('./canvas/ProjectCanvas'))

const SCOPE_FILTERS = [
  { id: 'all' as const, label: 'Alle' },
  { id: 'work' as const, label: 'Jobb' },
  { id: 'personal' as const, label: 'Privat' },
]

const VIEW_MODES: { id: ProjectViewMode; icon: typeof List }[] = [
  { id: 'list', icon: List },
  { id: 'grid', icon: SquaresFour },
  { id: 'board', icon: Kanban },
  { id: 'canvas', icon: Graph },
]

function getStoredViewMode(): ProjectViewMode {
  const stored = localStorage.getItem('orbit-projects-view')
  if (stored === 'list' || stored === 'grid' || stored === 'board' || stored === 'canvas') return stored
  return 'list'
}

export function ProjectsView() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()

  const [viewMode, setViewMode] = useState<ProjectViewMode>(getStoredViewMode)
  const [scopeFilter, setScopeFilter] = useState<'all' | 'work' | 'personal'>('all')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Sync route param to state
  useEffect(() => {
    if (id) setSelectedProjectId(id)
  }, [id])

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('orbit-projects-view', viewMode)
  }, [viewMode])

  const fetchParams = useMemo(() => {
    return { scope: scopeFilter === 'all' ? undefined : scopeFilter }
  }, [scopeFilter])

  const { data: projects, loading, refetch } = useQuery<ProjectWithCounts[]>(
    () => api.projects(fetchParams),
    [fetchParams]
  )

  const handleSelect = useCallback((project: ProjectWithCounts) => {
    setSelectedProjectId(project.id)
    navigate(`/projects/${project.id}`, { replace: true })
  }, [navigate])

  const handleCloseDetail = useCallback(() => {
    setSelectedProjectId(null)
    navigate('/projects', { replace: true })
  }, [navigate])

  const handleStatusChange = useCallback(async (projectId: string, status: string) => {
    await api.updateProject(projectId, { action: 'set_status', status })
    refetch()
  }, [refetch])

  const handleCreated = useCallback(() => {
    refetch()
  }, [refetch])

  if (loading && !projects) {
    return <div className="p-8 text-text-muted text-[13px]">Laster...</div>
  }

  const list = projects || []

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-semibold text-text-primary">Prosjekter</h1>
          <div className="flex items-center gap-3">
            {/* Scope filter pills */}
            <div className="flex items-center gap-1">
              {SCOPE_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setScopeFilter(f.id)}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                    scopeFilter === f.id
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* View mode toggle */}
            <div className="bg-surface rounded-lg p-0.5 flex gap-0.5">
              {VIEW_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setViewMode(m.id)}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === m.id
                      ? 'text-text-primary'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                  title={m.id}
                >
                  <m.icon size={14} />
                </button>
              ))}
            </div>

            {/* + New project button */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[12px] font-medium hover:bg-accent-hover transition-colors"
            >
              <Plus size={12} weight="bold" />
              Nytt prosjekt
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'canvas' ? (
        selectedProjectId ? (
          <Suspense fallback={<div className="flex items-center justify-center h-[60vh] text-text-muted text-[13px]">Laster canvas...</div>}>
            <ProjectCanvas projectId={selectedProjectId} />
          </Suspense>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <Graph size={32} className="text-accent mb-3 opacity-40" />
            <p className="text-text-secondary text-[14px] font-medium">Velg et prosjekt</p>
            <p className="text-text-muted text-[12px] mt-1">Klikk på et prosjekt i listen for å se canvas-visningen</p>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-md">
              {list.filter(p => p.status === 'active').slice(0, 6).map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className="px-3 py-2 bg-surface rounded-lg border border-border hover:border-border-hover text-[12px] text-text-secondary truncate transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="px-6 pb-6">
          {viewMode === 'list' && (
            <ProjectList projects={list} onSelect={handleSelect} onRefetch={refetch} />
          )}
          {viewMode === 'grid' && (
            <ProjectGrid projects={list} onSelect={handleSelect} onRefetch={refetch} />
          )}
          {viewMode === 'board' && (
            <ProjectBoard
              projects={list}
              onSelect={handleSelect}
              onStatusChange={handleStatusChange}
              onRefetch={refetch}
            />
          )}
        </div>
      )}

      {/* Detail slide-over (not shown in canvas mode) */}
      {selectedProjectId && viewMode !== 'canvas' && (
        <ProjectDetail
          projectId={selectedProjectId}
          onClose={handleCloseDetail}
          onRefetch={refetch}
        />
      )}

      {/* Create dialog */}
      {showCreate && (
        <CreateProjectDialog
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
