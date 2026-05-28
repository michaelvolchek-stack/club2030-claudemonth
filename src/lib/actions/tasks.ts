'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  Priority,
  TaskFilters,
  TaskSort,
  TaskStatus,
  TaskWithRelations,
  RecurringRule,
} from '@/types'
import { addDays, addWeeks, addMonths, setDate } from 'date-fns'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TASK_INCLUDE = {
  project: { select: { id: true, name: true, color: true } },
  checklistItems: { orderBy: { order: 'asc' as const } },
  tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
  history: { orderBy: { changedAt: 'desc' as const } },
}

function diffTask(
  oldTask: Record<string, unknown>,
  newData: Record<string, unknown>
): { field: string; old: unknown; new: unknown }[] {
  const watchedFields = [
    'title', 'description', 'status', 'priority',
    'dueDate', 'dueHasTime', 'plannedDate',
    'isRecurring', 'recurringRule', 'projectId',
  ]
  return watchedFields
    .filter(f => {
      const oldVal = oldTask[f]
      const newVal = newData[f]
      if (newVal === undefined) return false
      return String(oldVal ?? '') !== String(newVal ?? '')
    })
    .map(f => ({ field: f, old: oldTask[f], new: newData[f] }))
}

function buildNextRecurringDate(task: { dueDate: Date | null; recurringRule: string | null }): Date | null {
  if (!task.dueDate || !task.recurringRule) return null
  try {
    const rule: RecurringRule = JSON.parse(task.recurringRule)
    const base = new Date(task.dueDate)
    if (rule.freq === 'daily') return addDays(base, rule.interval ?? 1)
    if (rule.freq === 'weekly') return addWeeks(base, rule.interval ?? 1)
    if (rule.freq === 'monthly') {
      const next = addMonths(base, rule.interval ?? 1)
      if (rule.dayOfMonth) return setDate(next, rule.dayOfMonth)
      return next
    }
    return null
  } catch {
    return null
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  title: string
  description?: string
  status?: TaskStatus
  priority?: Priority
  dueDate?: Date | null
  dueHasTime?: boolean
  plannedDate?: Date | null
  isRecurring?: boolean
  recurringRule?: string
  projectId?: string
  parentTaskId?: string
  tagIds?: string[]
}

export async function createTask(data: CreateTaskInput): Promise<TaskWithRelations> {
  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      status: data.status ?? TaskStatus.ACTIVE,
      priority: data.priority ?? Priority.MEDIUM,
      dueDate: data.dueDate ?? null,
      dueHasTime: data.dueHasTime ?? false,
      plannedDate: data.plannedDate ?? null,
      isRecurring: data.isRecurring ?? false,
      recurringRule: data.recurringRule,
      projectId: data.projectId,
      parentTaskId: data.parentTaskId,
      tags: data.tagIds?.length
        ? { create: data.tagIds.map(tagId => ({ tagId })) }
        : undefined,
    },
    include: TASK_INCLUDE,
  })
  revalidatePath('/all'); revalidatePath('/today'); revalidatePath('/week')
  return task as unknown as TaskWithRelations
}

// ─── Update ───────────────────────────────────────────────────────────────────

export type UpdateTaskInput = Partial<CreateTaskInput>

export async function updateTask(id: string, data: UpdateTaskInput): Promise<TaskWithRelations> {
  const existing = await prisma.task.findUniqueOrThrow({ where: { id } })

  const changes = diffTask(existing as Record<string, unknown>, data as Record<string, unknown>)

  const { tagIds, ...rest } = data

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...rest,
      ...(tagIds !== undefined && {
        tags: {
          deleteMany: {},
          create: tagIds.map(tagId => ({ tagId })),
        },
      }),
      history: changes.length
        ? {
            create: changes.map(c => ({
              field: c.field,
              oldValue: c.old != null ? JSON.stringify(c.old) : null,
              newValue: c.new != null ? JSON.stringify(c.new) : null,
            })),
          }
        : undefined,
    },
    include: TASK_INCLUDE,
  })

  revalidatePath('/all'); revalidatePath('/today'); revalidatePath('/week')
  return task as unknown as TaskWithRelations
}

// ─── Complete ─────────────────────────────────────────────────────────────────

export async function completeTask(id: string): Promise<TaskWithRelations> {
  const existing = await prisma.task.findUniqueOrThrow({ where: { id } })

  const task = await prisma.task.update({
    where: { id },
    data: {
      status: TaskStatus.COMPLETED,
      history: {
        create: {
          field: 'status',
          oldValue: JSON.stringify(existing.status),
          newValue: JSON.stringify(TaskStatus.COMPLETED),
        },
      },
    },
    include: TASK_INCLUDE,
  })

  // If recurring, create the next occurrence
  if (existing.isRecurring) {
    const nextDue = buildNextRecurringDate(existing)
    if (nextDue) {
      await prisma.task.create({
        data: {
          title: existing.title,
          description: existing.description,
          status: TaskStatus.ACTIVE,
          priority: existing.priority,
          dueDate: nextDue,
          dueHasTime: existing.dueHasTime,
          isRecurring: true,
          recurringRule: existing.recurringRule,
          projectId: existing.projectId,
        },
      })
    }
  }

  revalidatePath('/all'); revalidatePath('/today'); revalidatePath('/week')
  return task as unknown as TaskWithRelations
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTask(id: string): Promise<void> {
  await prisma.task.delete({ where: { id } })
  revalidatePath('/all'); revalidatePath('/today'); revalidatePath('/week')
}

// ─── Get one ──────────────────────────────────────────────────────────────────

export async function getTaskById(id: string): Promise<TaskWithRelations | null> {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      ...TASK_INCLUDE,
      subTasks: { include: TASK_INCLUDE },
    },
  })
  return task as unknown as TaskWithRelations | null
}

// ─── Get many ─────────────────────────────────────────────────────────────────

export async function getTasks(
  filters: TaskFilters = {},
  sort: TaskSort = { field: 'dueDate', dir: 'asc' }
): Promise<TaskWithRelations[]> {
  const where: Record<string, unknown> = {
    parentTaskId: null, // top-level only
  }

  if (filters.status?.length) where.status = { in: filters.status }
  if (filters.priority?.length) where.priority = { in: filters.priority }
  if (filters.projectId) where.projectId = filters.projectId
  if (filters.hasTime !== undefined) where.dueHasTime = filters.hasTime

  if (filters.fromDate || filters.toDate) {
    where.dueDate = {
      ...(filters.fromDate ? { gte: filters.fromDate } : {}),
      ...(filters.toDate ? { lte: filters.toDate } : {}),
    }
  }

  if (filters.tagIds?.length) {
    where.tags = { some: { tagId: { in: filters.tagIds } } }
  }

  if (filters.search) {
    const q = filters.search
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { checklistItems: { some: { title: { contains: q } } } },
      { tags: { some: { tag: { name: { contains: q } } } } },
      { project: { name: { contains: q } } },
    ]
  }

  const orderBy: Record<string, string> = {}
  if (sort.field === 'priority') {
    // Custom priority ordering via raw is complex; sort in JS
    orderBy.createdAt = sort.dir
  } else {
    orderBy[sort.field] = sort.dir
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy,
    include: TASK_INCLUDE,
  })

  // Sort by priority if needed (URGENT > HIGH > MEDIUM > LOW)
  if (sort.field === 'priority') {
    const order = [Priority.URGENT, Priority.HIGH, Priority.MEDIUM, Priority.LOW]
    tasks.sort((a, b) => {
      const ai = order.indexOf(a.priority as Priority)
      const bi = order.indexOf(b.priority as Priority)
      return sort.dir === 'asc' ? ai - bi : bi - ai
    })
  }

  return tasks as unknown as TaskWithRelations[]
}

// ─── Today view ───────────────────────────────────────────────────────────────

export async function getTodayTasks() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [planned, dueToday, overdue] = await Promise.all([
    // Planned for today
    prisma.task.findMany({
      where: {
        plannedDate: { gte: today, lt: tomorrow },
        status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
        parentTaskId: null,
      },
      include: TASK_INCLUDE,
      orderBy: { priority: 'asc' },
    }),
    // Due today (not planned)
    prisma.task.findMany({
      where: {
        dueDate: { gte: today, lt: tomorrow },
        plannedDate: null,
        status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
        parentTaskId: null,
      },
      include: TASK_INCLUDE,
      orderBy: { dueDate: 'asc' },
    }),
    // Overdue
    prisma.task.findMany({
      where: {
        dueDate: { lt: today },
        status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
        parentTaskId: null,
      },
      include: TASK_INCLUDE,
      orderBy: { dueDate: 'asc' },
    }),
  ])

  return {
    planned: planned as unknown as TaskWithRelations[],
    dueToday: dueToday as unknown as TaskWithRelations[],
    overdue: overdue as unknown as TaskWithRelations[],
  }
}

// ─── Week view ────────────────────────────────────────────────────────────────

export async function getWeekTasks() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endOfWeek = addDays(today, 7)

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: today, lt: endOfWeek },
      status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
      parentTaskId: null,
    },
    include: TASK_INCLUDE,
    orderBy: { dueDate: 'asc' },
  })

  return tasks as unknown as TaskWithRelations[]
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchTasks(query: string): Promise<TaskWithRelations[]> {
  if (!query.trim()) return []
  return getTasks({ search: query.trim() })
}
