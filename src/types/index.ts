// ─── Enums (as const, since SQLite stores strings) ───────────────────────────

export const TaskStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus]

export const Priority = {
  URGENT: 'URGENT',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const
export type Priority = (typeof Priority)[keyof typeof Priority]

export const ReminderStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const
export type ReminderStatus = (typeof ReminderStatus)[keyof typeof ReminderStatus]

// ─── Priority helpers ─────────────────────────────────────────────────────────

export const PRIORITY_LABELS: Record<Priority, string> = {
  URGENT: 'דחוף',
  HIGH: 'גבוה',
  MEDIUM: 'בינוני',
  LOW: 'נמוך',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  URGENT: 'text-red-600 bg-red-50 border-red-200',
  HIGH: 'text-orange-600 bg-orange-50 border-orange-200',
  MEDIUM: 'text-blue-600 bg-blue-50 border-blue-200',
  LOW: 'text-slate-500 bg-slate-50 border-slate-200',
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<TaskStatus, string> = {
  DRAFT: 'טיוטה',
  ACTIVE: 'פעיל',
  COMPLETED: 'הושלם',
  CANCELLED: 'בוטל',
}

// ─── Recurring rule ───────────────────────────────────────────────────────────

export type RecurringFreq = 'daily' | 'weekly' | 'monthly'

export interface RecurringRule {
  freq: RecurringFreq
  interval?: number        // e.g. every 2 weeks
  days?: number[]          // 0=Sun … 6=Sat, for weekly
  dayOfMonth?: number      // 1-31, for monthly
}

// ─── Quick Add parsed result ──────────────────────────────────────────────────

export interface QuickAddResult {
  title: string
  dueDate?: Date
  dueHasTime: boolean
  plannedDate?: Date      // ~מחר syntax → plan for today, due later
  priority: Priority
  projectName?: string
  tagNames: string[]
}

// ─── Full task with relations (for UI) ───────────────────────────────────────

export interface TaskWithRelations {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  dueDate: Date | null
  dueHasTime: boolean
  plannedDate: Date | null
  isRecurring: boolean
  recurringRule: string | null
  projectId: string | null
  parentTaskId: string | null
  order: number
  createdAt: Date
  updatedAt: Date
  project: { id: string; name: string; color: string | null } | null
  checklistItems: SubTaskItem[]
  tags: { tag: { id: string; name: string; color: string | null } }[]
  history: HistoryItem[]
  subTasks?: TaskWithRelations[]
}

export interface SubTaskItem {
  id: string
  title: string
  completed: boolean
  order: number
}

export interface HistoryItem {
  id: string
  field: string
  oldValue: string | null
  newValue: string | null
  changedAt: Date
}

export interface ProjectWithChildren {
  id: string
  name: string
  color: string | null
  parentId: string | null
  children: ProjectWithChildren[]
  _count?: { tasks: number }
}

// ─── Filter / Sort types ──────────────────────────────────────────────────────

export interface TaskFilters {
  status?: TaskStatus[]
  priority?: Priority[]
  projectId?: string
  tagIds?: string[]
  fromDate?: Date
  toDate?: Date
  hasTime?: boolean
  search?: string
}

export type SortField = 'dueDate' | 'priority' | 'createdAt' | 'title' | 'order'
export type SortDir = 'asc' | 'desc'

export interface TaskSort {
  field: SortField
  dir: SortDir
}
