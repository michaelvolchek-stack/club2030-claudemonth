import { getWeekTasks } from '@/lib/actions/tasks'
import { TaskViewClient } from '@/components/TaskViewClient'
import { format, startOfDay, addDays } from 'date-fns'
import { he } from 'date-fns/locale'
import { TaskWithRelations } from '@/types'

export const dynamic = 'force-dynamic'

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export default async function WeekPage() {
  const tasks = await getWeekTasks()

  // Group by day
  const today = startOfDay(new Date())
  const sections = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i)
    const dayTasks = tasks.filter(t => {
      if (!t.dueDate) return false
      const d = startOfDay(new Date(t.dueDate))
      return d.getTime() === day.getTime()
    })
    return {
      label: `${DAY_NAMES[day.getDay()]} · ${format(day, 'dd/MM', { locale: he })}`,
      tasks: dayTasks as TaskWithRelations[],
      emptyMessage: '',
      labelVariant: 'muted' as const,
    }
  }).filter(s => s.tasks.length > 0)

  return (
    <TaskViewClient
      title="השבוע"
      sections={
        sections.length
          ? sections
          : [{ label: 'כל השבוע', tasks: [], emptyMessage: 'אין משימות השבוע 🎉', labelVariant: 'muted' }]
      }
    />
  )
}
