'use server'

import { prisma } from '@/lib/prisma'
import { addDays } from 'date-fns'
import { format } from 'date-fns'

export interface DashboardData {
  totalActive: number
  totalCompleted: number
  totalOverdue: number
  completedThisWeek: number
  streak: number
  completedByDay: { date: string; count: number; dayLabel: string }[]
  byPriority: { priority: string; count: number }[]
  byProject: { projectId: string; projectName: string; color: string | null; count: number }[]
}

const HEB_DAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

export async function getDashboardData(): Promise<DashboardData> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekAgo = addDays(today, -6)   // 7 days incl. today
  const monthAgo = addDays(today, -30)
  const tomorrow = addDays(today, 1)

  const [
    totalActive,
    totalCompleted,
    totalOverdue,
    recentCompleted,
    activeByPriority,
    completionsForStreak,
    activeWithProject,
  ] = await Promise.all([
    prisma.task.count({
      where: { status: 'ACTIVE', parentTaskId: null },
    }),
    prisma.task.count({
      where: { status: 'COMPLETED' },
    }),
    prisma.task.count({
      where: { status: { in: ['ACTIVE', 'DRAFT'] }, dueDate: { lt: today }, parentTaskId: null },
    }),
    // Tasks completed in the last 7 days
    prisma.task.findMany({
      where: { status: 'COMPLETED', updatedAt: { gte: weekAgo, lt: tomorrow } },
      select: { updatedAt: true },
    }),
    // Active tasks grouped by priority (Prisma groupBy)
    prisma.task.groupBy({
      by: ['priority'],
      where: { status: 'ACTIVE', parentTaskId: null },
      _count: { id: true },
    }),
    // Completed in last 30 days for streak
    prisma.task.findMany({
      where: { status: 'COMPLETED', updatedAt: { gte: monthAgo } },
      select: { updatedAt: true },
    }),
    // Active tasks with projects
    prisma.task.findMany({
      where: { status: 'ACTIVE', projectId: { not: null }, parentTaskId: null },
      select: {
        projectId: true,
        project: { select: { name: true, color: true } },
      },
    }),
  ])

  // ─── completedThisWeek ────────────────────────────────────────────────────
  const completedThisWeek = recentCompleted.length

  // ─── completedByDay — last 7 days ─────────────────────────────────────────
  const dayMap: Record<string, number> = {}
  const dayLabels: Record<string, string> = {}
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, -6 + i)
    const key = format(d, 'yyyy-MM-dd')
    dayMap[key] = 0
    dayLabels[key] = HEB_DAYS_SHORT[d.getDay()]
  }
  for (const t of recentCompleted) {
    const key = format(new Date(t.updatedAt), 'yyyy-MM-dd')
    if (key in dayMap) dayMap[key]++
  }
  const completedByDay = Object.entries(dayMap).map(([date, count]) => ({
    date,
    count,
    dayLabel: dayLabels[date],
  }))

  // ─── Streak ───────────────────────────────────────────────────────────────
  const completionDateSet = new Set(
    completionsForStreak.map(t => format(new Date(t.updatedAt), 'yyyy-MM-dd'))
  )
  let streak = 0
  let checkDate = new Date(today)
  // If today has no completions, start checking from yesterday
  if (!completionDateSet.has(format(checkDate, 'yyyy-MM-dd'))) {
    checkDate = addDays(checkDate, -1)
  }
  while (completionDateSet.has(format(checkDate, 'yyyy-MM-dd'))) {
    streak++
    checkDate = addDays(checkDate, -1)
  }

  // ─── byPriority ───────────────────────────────────────────────────────────
  const byPriority = activeByPriority.map(g => ({
    priority: g.priority,
    count: (g._count as Record<string, number>).id ?? 0,
  }))

  // ─── byProject ───────────────────────────────────────────────────────────
  const projectMap: Record<string, { name: string; color: string | null; count: number }> = {}
  for (const t of activeWithProject) {
    if (!t.projectId || !t.project) continue
    if (!projectMap[t.projectId]) {
      projectMap[t.projectId] = { name: t.project.name, color: t.project.color, count: 0 }
    }
    projectMap[t.projectId].count++
  }
  const byProject = Object.entries(projectMap)
    .map(([projectId, { name, color, count }]) => ({
      projectId,
      projectName: name,
      color,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  return {
    totalActive,
    totalCompleted,
    totalOverdue,
    completedThisWeek,
    streak,
    completedByDay,
    byPriority,
    byProject,
  }
}
