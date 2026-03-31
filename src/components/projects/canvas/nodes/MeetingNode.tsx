import { Handle, Position } from '@xyflow/react'
import { VideoCamera } from '@phosphor-icons/react'

interface MeetingNodeData {
  title: string
  date: string
}

export function MeetingNode({ data }: { data: MeetingNodeData }) {
  return (
    <div className="bg-surface rounded-lg border border-warning/20 px-3 py-2 min-w-[180px] max-w-[220px] shadow-md shadow-black/10">
      <Handle type="target" position={Position.Left} className="!bg-warning !w-1.5 !h-1.5 !border-0" />
      <div className="flex items-center gap-2">
        <VideoCamera size={14} className="text-warning shrink-0" />
        <span className="text-[12px] text-text-primary truncate">{data.title}</span>
      </div>
      <span className="text-[10px] text-text-muted ml-[22px] mt-0.5 block tabular-nums">{data.date}</span>
    </div>
  )
}
