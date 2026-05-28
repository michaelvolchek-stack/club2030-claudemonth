'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { TaskWithRelations, TaskStatus, Priority } from '@/types'
import { PriorityBadge } from './PriorityBadge'
import { completeTask, deleteTask, updateTask } from '@/lib/actions/tasks'
import { toast } from 'sonner'
import {
  Check,
  Trash2,
  ChevronDown,
  RotateCcw,
  Clock,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TaskItemProps {
  task: TaskWithRelations
  onOpen?: (task: TaskWithRelations) => void
}

export function TaskItem({ task, onOpen }: TaskItemProps) {
  const [loading, setLoading] = useState(false)
  const isCompleted = task.status === TaskStatus.COMPLETED
  const isCancelled = task.status === TaskStatus.CANCELLED

  async function handleComplete() {
    setLoading(true)
    try {
      await completeTask(task.id)
      toast.success('משימה הושלמה!')
    } catch {
      toast.error('שגיאה')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteTask(task.id)
      toast.success('משימה נמחקה')
    } catch {
      toast.error('שגיאה')
    } finally {
      setLoading(false)
    }
  }

  async function handlePriority(priority: Priority) {
    try {
      await updateTask(task.id, { priority })
      toast.success('עדיפות עודכנה')
    } catch {
      toast.error('שגיאה')
    }
  }

  const dueLabel = task.dueDate
    ? task.dueHasTime
      ? format(new Date(task.dueDate), 'dd/MM HH:mm', { locale: he })
      : format(new Date(task.dueDate), 'dd/MM', { locale: he })
    : null

  const overdueNow =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    !isCompleted &&
    !isCancelled

  const completedPct = task.checklistItems.length
    ? Math.round(
        (task.checklistItems.filter(s => s.completed).length / task.checklistItems.length) * 100
      )
    : null

  return (
    <div
      className={cn(
        'group flex items-start gap-3 px-4 py-3 border-b last:border-b-0',
        'hover:bg-muted/40 transition-colors cursor-pointer',
        isCompleted && 'opacity-60',
        loading && 'pointer-events-none opacity-50'
      )}
      onClick={() => onOpen?.(task)}
    >
      {/* Complete button */}
      <button
        onClick={e => {
          e.stopPropagation()
          if (!isCompleted) handleComplete()
        }}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          isCompleted
            ? 'border-green-500 bg-green-500 text-white'
            : 'border-muted-foreground/40 hover:border-green-500 hover:bg-green-50'
        )}
      >
        {isCompleted && <Check className="h-3 w-3" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', isCompleted && 'line-through')}>
          {task.title}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <PriorityBadge priority={task.priority} />

          {dueLabel && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                overdueNow ? 'text-red-600 font-medium' : 'text-muted-foreground'
              )}
            >
              <Clock className="h-3 w-3" />
              {dueLabel}
            </span>
          )}

          {task.project && (
            <span className="text-xs text-muted-foreground">
              {task.project.color && (
                <span
                  className="inline-block w-2 h-2 rounded-full ml-1"
                  style={{ backgroundColor: task.project.color }}
                />
              )}
              {task.project.name}
            </span>
          )}

          {task.tags.map(({ tag }) => (
            <span
              key={tag.id}
              className="text-xs px-1.5 py-0.5 rounded-full border"
              style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
            >
              {tag.name}
            </span>
          ))}

          {completedPct !== null && (
            <span className="text-xs text-muted-foreground">{completedPct}%</span>
          )}

          {task.isRecurring && (
            <RotateCcw className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
        {/* Priority dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-muted text-muted-foreground inline-flex items-center">
            <ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.values(Priority).map(p => (
              <DropdownMenuItem key={p} onClick={() => handlePriority(p)}>
                <PriorityBadge priority={p} />
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={e => {
                e.stopPropagation()
                handleDelete()
              }}
            >
              <Trash2 className="h-4 w-4 ml-2" />
              מחק
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
