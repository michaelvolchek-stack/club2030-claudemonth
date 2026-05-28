'use client'

import { useState, useTransition, useEffect } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TaskWithRelations, TaskStatus, Priority, STATUS_LABELS, PRIORITY_LABELS } from '@/types'
import { updateTask, completeTask } from '@/lib/actions/tasks'
import { addSubTask, toggleSubTask, deleteSubTask } from '@/lib/actions/subtasks'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Check, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DateTimePicker } from './DateTimePicker'
import { TagSelector } from './TagSelector'

interface TaskPanelProps {
  task: TaskWithRelations | null
  open: boolean
  onClose: () => void
}

export function TaskPanel({ task, open, onClose }: TaskPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [newSubTask, setNewSubTask] = useState('')
  const [status, setStatus] = useState<TaskStatus>(task?.status as TaskStatus ?? TaskStatus.ACTIVE)
  const [priority, setPriority] = useState<Priority>(task?.priority as Priority ?? Priority.MEDIUM)

  // Sync local state when task changes (intentionally depend only on id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (task) {
      setStatus(task.status as TaskStatus)
      setPriority(task.priority as Priority)
    }
  }, [task?.id])

  if (!task) return null

  function handleUpdate(data: Parameters<typeof updateTask>[1]) {
    startTransition(async () => {
      try {
        await updateTask(task!.id, data)
      } catch {
        toast.error('שגיאה בשמירה')
      }
    })
  }

  function handleAddSubTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubTask.trim()) return
    startTransition(async () => {
      await addSubTask(task!.id, newSubTask.trim())
      setNewSubTask('')
    })
  }

  function handleToggleSub(id: string) {
    startTransition(async () => { await toggleSubTask(id) })
  }

  function handleDeleteSub(id: string) {
    startTransition(async () => { await deleteSubTask(id) })
  }

  const completedCount = task.checklistItems.filter(s => s.completed).length

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="left"
        className="w-full max-w-md overflow-y-auto flex flex-col gap-0 p-0"
        dir="rtl"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-right text-base font-semibold">
            פרטי משימה
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 px-6 py-4 space-y-5 overflow-y-auto">
          {/* Title */}
          <div>
            <Input
              defaultValue={task.title}
              className="text-base font-medium border-0 px-0 focus-visible:ring-0"
              onBlur={e => {
                if (e.target.value !== task.title) handleUpdate({ title: e.target.value })
              }}
            />
          </div>

          {/* Status & Priority */}
          <div className="flex gap-3">
            <Select
              value={status}
              onValueChange={v => {
                setStatus(v as TaskStatus)
                handleUpdate({ status: v as TaskStatus })
              }}
            >
              <SelectTrigger className="w-32 text-xs">
                <span>{STATUS_LABELS[status]}</span>
              </SelectTrigger>
              <SelectContent>
                {Object.values(TaskStatus).map(s => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={priority}
              onValueChange={v => {
                setPriority(v as Priority)
                handleUpdate({ priority: v as Priority })
              }}
            >
              <SelectTrigger className="w-28 text-xs">
                <span>{PRIORITY_LABELS[priority]}</span>
              </SelectTrigger>
              <SelectContent>
                {Object.values(Priority).map(p => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due date */}
          <div className="flex items-center gap-1 text-sm -mx-2">
            <span className="text-muted-foreground px-2 shrink-0">תאריך יעד:</span>
            <DateTimePicker
              value={task.dueDate ? new Date(task.dueDate) : null}
              hasTime={task.dueHasTime}
              onChange={(date, ht) => handleUpdate({ dueDate: date ?? undefined, dueHasTime: ht })}
              placeholder="לא נקבע"
            />
          </div>

          {/* Project */}
          {task.project && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground shrink-0">פרויקט:</span>
              <Badge variant="outline">{task.project.name}</Badge>
            </div>
          )}

          {/* Tags */}
          <div className="flex items-start gap-2 text-sm">
            <span className="text-muted-foreground shrink-0 pt-0.5">תגיות:</span>
            <TagSelector
              selectedTagIds={task.tags.map(({ tag }) => tag.id)}
              onChange={tagIds => handleUpdate({ tagIds })}
              disabled={isPending}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              תיאור / הערות
            </label>
            <Textarea
              defaultValue={task.description ?? ''}
              placeholder="הוסף תיאור..."
              className="resize-none text-sm min-h-[80px]"
              onBlur={e => {
                const val = e.target.value || null
                if (val !== task.description) handleUpdate({ description: val ?? undefined })
              }}
            />
          </div>

          <Separator />

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">
                תת-משימות
                {task.checklistItems.length > 0 && (
                  <span className="mr-1 text-xs">
                    ({completedCount}/{task.checklistItems.length})
                  </span>
                )}
              </label>
            </div>

            <div className="space-y-1.5 mb-2">
              {task.checklistItems.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 group">
                  <Checkbox
                    checked={sub.completed}
                    onCheckedChange={() => handleToggleSub(sub.id)}
                    id={`sub-${sub.id}`}
                  />
                  <label
                    htmlFor={`sub-${sub.id}`}
                    className={cn(
                      'text-sm flex-1 cursor-pointer',
                      sub.completed && 'line-through text-muted-foreground'
                    )}
                  >
                    {sub.title}
                  </label>
                  <button
                    onClick={() => handleDeleteSub(sub.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddSubTask} className="flex gap-2">
              <Input
                value={newSubTask}
                onChange={e => setNewSubTask(e.target.value)}
                placeholder="הוסף תת-משימה..."
                className="text-sm h-8"
              />
              <Button type="submit" variant="ghost" size="sm" className="h-8 px-2">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <Separator />

          {/* History */}
          {task.history.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                היסטוריה
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {task.history.map(h => (
                  <div key={h.id} className="flex gap-2 text-xs">
                    <span className="text-muted-foreground shrink-0">
                      {format(new Date(h.changedAt), 'dd/MM HH:mm', { locale: he })}
                    </span>
                    <span>
                      <span className="font-medium">{h.field}</span>:{' '}
                      {h.oldValue ? (
                        <>
                          <span className="line-through text-muted-foreground">
                            {formatHistoryValue(h.oldValue)}
                          </span>{' '}
                          →{' '}
                        </>
                      ) : null}
                      <span>{formatHistoryValue(h.newValue ?? '')}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t flex gap-2">
          {task.status !== TaskStatus.COMPLETED && (
            <Button
              onClick={() => {
                startTransition(async () => {
                  await completeTask(task.id)
                  toast.success('משימה הושלמה!')
                  onClose()
                })
              }}
              className="flex-1"
              disabled={isPending}
            >
              <Check className="h-4 w-4 ml-2" />
              סמן כהושלם
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            סגור
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function formatHistoryValue(val: string) {
  try {
    const parsed = JSON.parse(val)
    if (typeof parsed === 'string') return parsed
    return val
  } catch {
    return val
  }
}
