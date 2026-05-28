import { getWeekTasks } from '@/lib/actions/tasks'
import { TaskViewClient } from '@/components/TaskViewClient'
import { format, startOfDay, addDays } from 'date-fns'
import { he } from 'date-fns/locale'
import { TaskWithRelations } from '@/types'

export const dynamic = 'force-dynamic'

export default async function WeekPage() {
  const { thisWeek, overdue } = await getWeekTasks()

  const today = startOfDay(new Date())

  // Build one section per day (next 7 days)
  const daySections = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i)
    const dayStart = day.getTime()

    const dayTasks = thisWeek.filter(t => {
      if (!t.dueDate) return false
      return startOfDay(new Date(t.dueDate)).getTime() === dayStart
    }) as TaskWithRelations[]

    // Label: "היום — ראשון, 28 במאי" / "מחר — שני, 29 במאי" / "שלישי, 30 במאי"
    const dayName = format(day, 'EEEE', { locale: he })
    const dayDate = format(day, "d 'ב'MMMM", { locale: he })
    const prefix = i === 0 ? 'היום — ' : i === 1 ? 'מחר — ' : ''
    const label = `${prefix}${dayName}, ${dayDate}`

    return {
      label,
      tasks: dayTasks,
      emptyMessage: i === 0 ? 'אין משימות עם יעד להיום' : '',
      labelVariant: (i === 0 ? 'default' : 'muted') as 'default' | 'muted',
      isToday: i === 0,
    }
  })

  // Always show today; hide future empty days
  const filteredDays = daySections.filter(s => s.isToday || s.tasks.length > 0)

  const sections = [
    // Overdue — always first if exists
    ...(overdue.length > 0
      ? [{
          label: `באיחור — ${overdue.length} משימות`,
          tasks: overdue,
          emptyMessage: '',
          labelVariant: 'overdue' as const,
        }]
      : []),
    ...filteredDays,
  ]

  // If truly nothing at all
  if (sections.length === 0) {
    return (
      <TaskViewClient
        title="השבוע"
        sections={[{
          label: 'השבוע',
          tasks: [],
          emptyMessage: 'אין משימות השבוע 🎉',
          labelVariant: 'muted',
        }]}
      />
    )
  }

  return <TaskViewClient title="השבוע" sections={sections} />
}
