import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api } from '../../../lib/api'
import { CanvasPool } from './CanvasPool'
import { ProjectNode } from './nodes/ProjectNode'
import { TaskNode } from './nodes/TaskNode'
import { MeetingNode } from './nodes/MeetingNode'
import { PersonNode } from './nodes/PersonNode'
import type { ProjectGraph } from '../../../lib/types'

interface ProjectCanvasProps {
  projectId: string
}

const nodeTypes: NodeTypes = {
  project: ProjectNode,
  task: TaskNode,
  meeting: MeetingNode,
  person: PersonNode,
} as unknown as NodeTypes

function buildGraphData(graph: ProjectGraph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Center project node
  nodes.push({
    id: `project-${graph.project.id}`,
    type: 'project',
    position: { x: 0, y: 0 },
    data: {
      name: graph.project.name,
      scope: graph.project.scope,
      taskCountTotal: graph.project.task_count_total,
      taskCountDone: graph.project.task_count_done,
    },
  })

  // Tasks in a ring around the project
  const taskRadius = 300
  graph.tasks.forEach((task, i) => {
    const angle = (i / Math.max(graph.tasks.length, 1)) * 2 * Math.PI - Math.PI / 2
    nodes.push({
      id: `task-${task.id}`,
      type: 'task',
      position: {
        x: Math.cos(angle) * taskRadius,
        y: Math.sin(angle) * taskRadius,
      },
      data: {
        text: task.text,
        done: task.done,
        priority: task.priority,
        dueDate: task.due_date,
      },
    })
    edges.push({
      id: `edge-task-${task.id}`,
      source: `project-${graph.project.id}`,
      target: `task-${task.id}`,
      style: { stroke: 'var(--text-muted-val)', strokeOpacity: 0.3 },
      type: 'default',
    })
  })

  // Meetings in outer ring
  const meetingRadius = 450
  graph.meetings.forEach((meeting, i) => {
    const angle = (i / Math.max(graph.meetings.length, 1)) * 2 * Math.PI - Math.PI / 2
    const offset = Math.PI / (graph.meetings.length + 1)
    nodes.push({
      id: `meeting-${meeting.id}`,
      type: 'meeting',
      position: {
        x: Math.cos(angle + offset) * meetingRadius,
        y: Math.sin(angle + offset) * meetingRadius,
      },
      data: {
        title: meeting.title,
        date: meeting.date,
      },
    })
    edges.push({
      id: `edge-meeting-${meeting.id}`,
      source: `project-${graph.project.id}`,
      target: `meeting-${meeting.id}`,
      style: { stroke: 'var(--warning-val)', strokeOpacity: 0.3, strokeDasharray: '5 5' },
      type: 'default',
    })
  })

  // People in outermost ring
  const personRadius = 550
  graph.people.forEach((person, i) => {
    const angle = (i / Math.max(graph.people.length, 1)) * 2 * Math.PI
    nodes.push({
      id: `person-${person.id}`,
      type: 'person',
      position: {
        x: Math.cos(angle) * personRadius,
        y: Math.sin(angle) * personRadius,
      },
      data: {
        name: person.name,
        role: person.role,
        company: person.company,
      },
    })
    edges.push({
      id: `edge-person-${person.id}`,
      source: `project-${graph.project.id}`,
      target: `person-${person.id}`,
      style: { stroke: 'var(--accent-val)', strokeOpacity: 0.2, strokeDasharray: '2 4' },
      type: 'default',
    })
  })

  return { nodes, edges }
}

export default function ProjectCanvas({ projectId }: ProjectCanvasProps) {
  const [graph, setGraph] = useState<ProjectGraph | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [poolKey, setPoolKey] = useState(0)
  const reactFlowRef = useRef<HTMLDivElement>(null)

  const fetchGraph = useCallback(() => {
    api.projectGraph(projectId).then(data => {
      setGraph(data)
      const { nodes: n, edges: e } = buildGraphData(data)
      setNodes(n)
      setEdges(e)
    }).catch(err => {
      console.error('Failed to fetch project graph:', err)
    })
  }, [projectId, setNodes, setEdges])

  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  // Handle drop from pool sidebar
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/orbit-entity')
    if (!raw) return

    try {
      const { type, id } = JSON.parse(raw)

      if (type === 'task') {
        await api.updateTask(id, { action: 'set_project', project_id: projectId })
      } else if (type === 'meeting') {
        await api.updateMeeting(id, { project_id: projectId })
      }

      // Refetch both graph and pool
      fetchGraph()
      setPoolKey(k => k + 1)
    } catch (err) {
      console.error('Drop handler error:', err)
    }
  }, [projectId, fetchGraph])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  // Handle edge click (disconnect entity)
  const handleEdgeClick = useCallback(async (_event: React.MouseEvent, edge: Edge) => {
    const target = edge.target
    if (!target) return

    const dashIndex = target.indexOf('-')
    if (dashIndex === -1) return

    const entityType = target.substring(0, dashIndex)
    const actualId = target.substring(dashIndex + 1)

    if (!actualId) return

    if (entityType === 'task') {
      await api.updateTask(actualId, { action: 'set_project', project_id: null })
    } else if (entityType === 'meeting') {
      await api.updateMeeting(actualId, { project_id: null })
    } else {
      return // Don't disconnect people (they're indirectly linked)
    }

    fetchGraph()
    setPoolKey(k => k + 1)
  }, [fetchGraph])

  if (!graph) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-[13px]">
        Laster graf...
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Pool sidebar */}
      <CanvasPool key={poolKey} onRefetch={fetchGraph} />

      {/* Canvas area */}
      <div
        className="flex-1 relative"
        ref={reactFlowRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeClick={handleEdgeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          style={{ backgroundColor: 'var(--base)' }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          maxZoom={2}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--border-val)" />
          <Controls
            className="!bg-surface !border-border !rounded-lg !shadow-lg"
            showInteractive={false}
          />
          <MiniMap
            className="!bg-surface !border-border !rounded-lg"
            nodeColor={(n) => {
              if (n.type === 'project') return 'var(--accent-val)'
              if (n.type === 'task') return 'var(--success-val)'
              if (n.type === 'meeting') return 'var(--warning-val)'
              return 'var(--text-muted-val)'
            }}
            maskColor="rgba(0,0,0,0.2)"
          />
        </ReactFlow>
      </div>
    </div>
  )
}
