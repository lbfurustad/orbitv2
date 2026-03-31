import type { Task, Document, DailyData, Tag, Project, ProjectWithCounts, Person, Whiteboard, Meeting, ProjectGraph, UnconnectedEntities } from './types'

function cleanParams(params?: Record<string, string | undefined>): string {
  if (!params) return ''
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined)
  ) as Record<string, string>
  const qs = new URLSearchParams(clean).toString()
  return qs ? `?${qs}` : ''
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  // Today
  today: (date?: string) =>
    fetchJson<DailyData>(`/today${cleanParams({ date })}`),

  // Tasks
  tasks: (params?: { scope?: string; done?: string; project_id?: string; person_id?: string; due_date?: string; inbox?: string; view?: string }) =>
    fetchJson<Task[]>(`/tasks${cleanParams(params)}`),

  createTask: (data: {
    text: string
    project_id?: string
    scope?: string
    priority?: number
    due_date?: string
    parent_task_id?: string
    source_document_id?: string
  }) =>
    fetchJson<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (id: string, data: { action: string; [key: string]: unknown }) =>
    fetchJson<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  toggleTask: (id: string) =>
    fetchJson<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'toggle' }),
    }),

  deleteTask: (id: string) =>
    fetchJson<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'delete' }),
    }),

  starTask: (id: string) =>
    fetchJson<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'star' }) }),

  unstarTask: (id: string) =>
    fetchJson<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'unstar' }) }),

  scheduleTask: (id: string, date: string) =>
    fetchJson<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'schedule', date }) }),

  setDeadline: (id: string, deadline: string) =>
    fetchJson<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'set_deadline', deadline }) }),

  setEvening: (id: string) =>
    fetchJson<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'set_evening' }) }),

  setSomeday: (id: string) =>
    fetchJson<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'set_someday' }) }),

  batchUpdateTasks: (ids: string[], updates: Record<string, unknown>) =>
    fetchJson<{ success: boolean }>('/tasks/batch', { method: 'POST', body: JSON.stringify({ ids, updates }) }),

  // Habits
  updateHabits: (data: { date: string; walk?: boolean; weight?: boolean; water?: boolean; journal?: boolean }) =>
    fetchJson<void>(`/today/habits`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Daily banner
  setDailyBanner: (date: string, banner_url: string) =>
    fetchJson<{ success: boolean; banner_url: string }>(`/today/banner/${date}`, {
      method: 'POST',
      body: JSON.stringify({ banner_url }),
    }),

  // Documents
  documents: (params?: { type?: string }) =>
    fetchJson<Document[]>(`/documents${cleanParams(params)}`),

  createDocument: (data: {
    type: string
    title: string
    date?: string
    content?: string
  }) =>
    fetchJson<Document>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  document: (id: string) => fetchJson<Document>(`/documents/${id}`),

  updateDocument: (id: string, data: Partial<Document>) =>
    fetchJson<Document>(`/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Tags
  tags: () => fetchJson<Tag[]>('/tags'),

  createTag: (data: { name: string; color?: string; icon?: string }) =>
    fetchJson<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Block properties (entity blocks)
  updateBlockProperties: (blockId: string, properties: Record<string, unknown>) =>
    fetchJson(`/blocks/${blockId}/properties`, {
      method: 'PATCH',
      body: JSON.stringify(properties),
    }),

  // Projects
  projects: (params?: { status?: string; scope?: string }) =>
    fetchJson<ProjectWithCounts[]>(`/projects${cleanParams(params)}`),

  project: (id: string) =>
    fetchJson<ProjectWithCounts>(`/projects/${id}`),

  createProject: (data: {
    name: string
    status?: string
    scope?: string
    priority?: number
    start_date?: string
    target_date?: string
    description?: string
  }) =>
    fetchJson<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProject: (id: string, data: { action?: string; [key: string]: unknown }) =>
    fetchJson<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteProject: (id: string) =>
    fetchJson<void>(`/projects/${id}`, { method: 'DELETE' }),

  projectGraph: (id: string) =>
    fetchJson<ProjectGraph>(`/projects/${id}/graph`),

  unconnected: () =>
    fetchJson<UnconnectedEntities>(`/projects/unconnected`),

  updateMeeting: (id: string, data: Record<string, unknown>) =>
    fetchJson<Meeting>(`/meetings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // People
  people: () =>
    fetchJson<(Person & { task_count: number })[]>('/people'),

  // Single task
  task: (id: string) =>
    fetchJson<Task>(`/tasks/${id}`),

  // Subtasks for a task
  subtasks: (id: string) =>
    fetchJson<Task[]>(`/tasks/${id}/subtasks`),

  // Whiteboards
  whiteboards: (params?: { project_id?: string; meeting_id?: string }) =>
    fetchJson<Whiteboard[]>(`/whiteboards${cleanParams(params)}`),

  whiteboard: (id: string) =>
    fetchJson<Whiteboard>(`/whiteboards/${id}`),

  createWhiteboard: (data: { name: string; project_id?: string; meeting_id?: string }) =>
    fetchJson<Whiteboard>('/whiteboards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  saveWhiteboard: (id: string, data: any, thumbnail?: string) =>
    fetchJson<{ success: boolean }>(`/whiteboards/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data, thumbnail }),
    }),

  updateWhiteboard: (id: string, data: Partial<Pick<Whiteboard, 'name' | 'project_id' | 'meeting_id'>>) =>
    fetchJson<Whiteboard>(`/whiteboards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteWhiteboard: (id: string) =>
    fetchJson<{ success: boolean }>(`/whiteboards/${id}`, {
      method: 'DELETE',
    }),

  // SSE Events
  events: () => {
    const source = new EventSource('/api/events')
    return source
  },
}
