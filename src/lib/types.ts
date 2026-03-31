export interface Whiteboard {
  id: string
  document_id: string | null
  name: string
  data: any | null
  thumbnail: string | null
  meeting_id: string | null
  project_id: string | null
  project_name?: string
  meeting_title?: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  text: string
  done: boolean
  priority: number | null
  due_date: string | null
  project_id: string | null
  person_id: string | null
  scope: 'work' | 'personal'
  source_document_id: string | null
  source_block_id: string | null
  parent_task_id: string | null
  sort_order: number
  declined: boolean
  scheduled_date: string | null    // "When" — when you plan to do it
  deadline: string | null          // Hard deadline (separate from scheduled_date)
  is_evening: boolean              // "This Evening"
  someday: boolean                 // Parked in Someday
  starred: boolean                 // Starred for Today
  created_at: string
  completed_at: string | null
  updated_at: string
  // Joined fields
  project_name?: string
}

export interface Project {
  id: string
  document_id: string | null
  name: string
  status: 'backlog' | 'active' | 'someday' | 'done' | 'archived'
  scope: 'work' | 'personal'
  priority: number | null
  start_date: string | null
  target_date: string | null
  description: string | null
  task_count: number
  task_done_count: number
  created_at: string
  updated_at: string
}

export interface ProjectWithCounts extends Project {
  task_count_total: number
  task_count_done: number
}

export type ProjectViewMode = 'list' | 'grid' | 'board' | 'canvas'

export interface Document {
  id: string
  type: 'daily_note' | 'meeting' | 'project' | 'person' | 'journal' | 'note' | 'whiteboard'
  title: string
  date: string | null
  content: string | null
  created_at: string
  updated_at: string
}

export interface DailyNote {
  id: string
  document_id: string | null
  date: string
  habit_walk: boolean
  habit_weight: boolean
  habit_weight_value: number | null
  habit_water: boolean
  habit_journal: boolean
  banner_url: string | null
  created_at: string
  updated_at: string
}

export interface Person {
  id: string
  document_id: string | null
  name: string
  email: string | null
  phone: string | null
  role: string | null
  company: string | null
  department: string | null
  team: string | null
  category: string | null
  reports_to_id: string | null
  avatar_url: string | null
  notes: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface Meeting {
  id: string
  document_id: string | null
  title: string
  date: string
  start_time: string | null
  end_time: string | null
  category: string | null
  project_id: string | null
  calendar_event_id: string | null
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  ical_uid: string
  subject: string
  start_time: string
  end_time: string
  local_date: string
  location: string
  organizer: string
  required_attendees: string
  optional_attendees: string
  is_all_day: boolean
  is_teams: boolean
  teams_link: string
  outlook_link: string
  importance: string
  show_as: string
  sensitivity: string
  response_type: string
  body_preview: string
}

export interface JournalEntry {
  id: string
  document_id: string | null
  date: string
  mood: string | null
  energy: number | null
  highlight: string | null
  created_at: string
  updated_at: string
}

export interface Tag {
  id: string
  name: string
  color: string | null
  icon: string | null
  description: string | null
  created_at: string
}

export interface DailyData {
  date: string
  exists: boolean
  habits: {
    walk: boolean
    weight: boolean
    weightValue: number | null
    water: boolean
    journal: boolean
  } | null
  tasks: Task[]
  meetings: Meeting[]
  calendarEvents: CalendarEvent[]
  dailyNote: {
    id: string
    document_id: string | null
    date: string
    content: string | null
    banner_url: string | null
  } | null
}

export interface ProjectGraph {
  project: ProjectWithCounts
  tasks: Task[]
  meetings: Meeting[]
  people: Person[]
  whiteboards: any[]
}

export interface UnconnectedEntities {
  tasks: Task[]
  meetings: Meeting[]
}
