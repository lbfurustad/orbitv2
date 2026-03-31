import { Handle, Position } from '@xyflow/react'
import { Buildings, User } from '@phosphor-icons/react'

interface ProjectNodeData {
  name: string
  scope: 'work' | 'personal'
  taskCountTotal: number
  taskCountDone: number
}

export function ProjectNode({ data }: { data: ProjectNodeData }) {
  const ScopeIcon = data.scope === 'work' ? Buildings : User
  const scopeColor = data.scope === 'work' ? 'text-red-400' : 'text-purple-400'
  const percent = data.taskCountTotal > 0 ? Math.round((data.taskCountDone / data.taskCountTotal) * 100) : 0
  const progressColor = data.scope === 'work' ? 'bg-success' : 'bg-accent'

  return (
    <div className="bg-surface rounded-xl border-2 border-accent p-4 min-w-[200px] shadow-lg shadow-black/20">
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2 !border-0" />
      <div className="flex items-center gap-2 mb-2">
        <ScopeIcon size={18} className={scopeColor} />
        <span className="text-[15px] font-semibold text-text-primary">{data.name}</span>
      </div>
      {data.taskCountTotal > 0 && (
        <>
          <div className="h-[3px] rounded-full bg-wash/[0.06] overflow-hidden mb-1">
            <div className={`h-full rounded-full ${progressColor} transition-all`} style={{ width: `${percent}%` }} />
          </div>
          <span className="text-[11px] text-text-muted font-mono tabular-nums">{data.taskCountDone}/{data.taskCountTotal} tasks</span>
        </>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2 !border-0" />
    </div>
  )
}
