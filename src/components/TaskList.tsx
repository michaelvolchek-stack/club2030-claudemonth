import { TaskWithRelations } from '@/types'
import { TaskItem } from './TaskItem'

interface TaskListProps {
  tasks: TaskWithRelations[]
  onOpen?: (task: TaskWithRelations) => void
  emptyMessage?: string
}

export function TaskList({ tasks, onOpen, emptyMessage = 'אין משימות' }: TaskListProps) {
  if (!tasks.length) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} onOpen={onOpen} />
      ))}
    </div>
  )
}
