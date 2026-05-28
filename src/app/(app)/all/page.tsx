import { getTasks } from '@/lib/actions/tasks'
import { TaskViewClient } from '@/components/TaskViewClient'
import { TaskStatus } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AllPage() {
  const tasks = await getTasks(
    { status: [TaskStatus.DRAFT, TaskStatus.ACTIVE] },
    { field: 'dueDate', dir: 'asc' }
  )

  return (
    <TaskViewClient
      title="כל המשימות"
      sections={[
        {
          label: 'משימות פעילות',
          tasks,
          emptyMessage: 'אין משימות — הוסף את הראשונה!',
          labelVariant: 'muted',
        },
      ]}
    />
  )
}
