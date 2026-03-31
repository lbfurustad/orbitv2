import { Handle, Position } from '@xyflow/react'
import { Circle, CheckCircle } from '@phosphor-icons/react'

interface TaskNodeData {
  text: string
  done: boolean
  priority: number | null
  dueDate: string | null
}

const PRIORITY_COLORS: Record<number, string> = { 1: 'text-danger', 2: 'text-warning', 3: 'text-accent' }

export function TaskNode({ data }: { data: TaskNodeData }) {
  const circleColor = data.done ? 'text-text-muted' : (data.priority ? PRIORITY_COLORS[data.priority] : 'text-text-muted/40')

  return (
    <div className={`bg-surface rounded-lg border border-border px-3 py-2 min-w-[180px] max-w-[220px] shadow-md shadow-black/10 ${data.done ? 'opacity-50' : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-text-muted !w-1.5 !h-1.5 !border-0" />
      <div className="flex items-center gap-2">
        {data.done
          ? <CheckCircle size={14} weight="fill" className="text-text-muted shrink-0" />
          : <Circle size={14} weight={data.priority ? 'bold' : 'regular'} className={`${circleColor} shrink-0`} />
        }
        <span className={`text-[12px] truncate ${data.done ? 'line-through text-text-muted' : 'text-text-primary'}`}>
          {data.text}
        </span>
      </div>
      {data.dueDate && !data.done && (
        <span className="text-[10px] text-text-muted ml-[22px] mt-0.5 block tabular-nums">{data.dueDate}</span>
      )}
    </div>
  )
}
