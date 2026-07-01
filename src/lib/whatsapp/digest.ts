import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { getTodayTasks } from '@/lib/actions/tasks'
import type { TaskWithRelations } from '@/types'

const PRIORITY_ICON: Record<string, string> = {
  URGENT: '🔴',
  HIGH: '🟠',
  MEDIUM: '🔵',
  LOW: '⚪',
}

function taskLine(task: TaskWithRelations): string {
  const icon = PRIORITY_ICON[task.priority] ?? '•'
  let s = `${icon} ${task.title}`
  if (task.dueDate && task.dueHasTime) s += ` (${format(new Date(task.dueDate), 'HH:mm')})`
  if (task.project) s += ` — ${task.project.name}`
  return s
}

/**
 * Builds the daily WhatsApp digest of today's tasks (planned + due + overdue).
 * Uses WhatsApp markdown (*bold*, _italic_).
 */
export async function buildDailyDigest(): Promise<string> {
  const { planned, dueToday, overdue } = await getTodayTasks()
  const today = format(new Date(), "EEEE, d 'ב'MMMM", { locale: he })

  const total = planned.length + dueToday.length + overdue.length
  if (total === 0) {
    return `📋 *המשימות שלך להיום*\n${today}\n\nאין משימות פתוחות להיום — יום פנוי! 🎉`
  }

  const parts: string[] = [`📋 *המשימות שלך להיום*\n${today}`]

  if (overdue.length) {
    parts.push(`\n⏰ *באיחור (${overdue.length})*\n` + overdue.map(taskLine).join('\n'))
  }
  if (planned.length) {
    parts.push(`\n📌 *מתוכננות להיום (${planned.length})*\n` + planned.map(taskLine).join('\n'))
  }
  if (dueToday.length) {
    parts.push(`\n🎯 *יעד היום (${dueToday.length})*\n` + dueToday.map(taskLine).join('\n'))
  }

  parts.push('\n_להשלמת משימה שלחו: סגור <שם>. למשימה חדשה: פשוט כתבו אותה._')
  return parts.join('\n')
}
