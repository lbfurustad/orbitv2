import { Handle, Position } from '@xyflow/react'

interface PersonNodeData {
  name: string
  role: string | null
  company: string | null
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function PersonNode({ data }: { data: PersonNodeData }) {
  return (
    <div className="bg-surface rounded-lg border border-border px-3 py-2 min-w-[160px] shadow-md shadow-black/10">
      <Handle type="target" position={Position.Left} className="!bg-accent !w-1.5 !h-1.5 !border-0" />
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-accent">{getInitials(data.name)}</span>
        </div>
        <div className="min-w-0">
          <span className="text-[12px] text-text-primary block truncate">{data.name}</span>
          {data.role && <span className="text-[10px] text-text-muted block truncate">{data.role}</span>}
        </div>
      </div>
    </div>
  )
}
