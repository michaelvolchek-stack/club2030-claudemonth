import { getTodayTasks } from '@/lib/actions/tasks'
import { TaskViewClient } from '@/components/TaskViewClient'
import { TaskWithRelations } from '@/types'

export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  const { planned, dueToday, overdue } = await getTodayTasks()

  type Section = {
    label: string
    tasks: TaskWithRelations[]
    emptyMessage?: string
    labelVariant?: 'default' | 'overdue' | 'muted'
    sortable?: boolean
  }

  const sections: Section[] = [
    {
      label: 'מתוכנן להיום',
      tasks: planned,
      emptyMessage: 'אין משימות מתוכננות להיום',
      labelVariant: 'default',
      sortable: true,
    },
    {
      label: 'תאריך יעד היום',
      tasks: dueToday,
      emptyMessage: 'אין משימות עם יעד להיום',
      labelVariant: 'muted',
      sortable: true,
    },
    ...(overdue.length > 0
      ? [{ label: 'באיחור', tasks: overdue, emptyMessage: '', labelVariant: 'overdue' as const }]
      : []),
  ]

  return <TaskViewClient title="היום" sections={sections} />
}
