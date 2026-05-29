'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskWithRelations } from '@/types'
import { TaskItem } from './TaskItem'
import { reorderTasks } from '@/lib/actions/tasks'

// ─── Sortable wrapper for a single task item ──────────────────────────────────

function SortableTaskItem({
  task,
  onOpen,
  isGhost,
}: {
  task: TaskWithRelations
  onOpen?: (task: TaskWithRelations) => void
  isGhost: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem
        task={task}
        onOpen={onOpen}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging || isGhost}
      />
    </div>
  )
}

// ─── SortableTaskList ─────────────────────────────────────────────────────────

interface SortableTaskListProps {
  tasks: TaskWithRelations[]
  onOpen?: (task: TaskWithRelations) => void
  emptyMessage?: string
}

export function SortableTaskList({
  tasks,
  onOpen,
  emptyMessage = 'אין משימות',
}: SortableTaskListProps) {
  const [items, setItems] = useState<TaskWithRelations[]>(tasks)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const isDraggingRef = useRef(false)

  // Sync with fresh server data, but only when not mid-drag
  useEffect(() => {
    if (!isDraggingRef.current) {
      setItems(tasks)
    }
  }, [tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  )

  function handleDragStart({ active }: DragStartEvent) {
    isDraggingRef.current = true
    setActiveId(active.id as string)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    isDraggingRef.current = false
    setActiveId(null)

    if (!over || active.id === over.id) return

    let newItems: TaskWithRelations[] = []
    setItems(prev => {
      const oldIndex = prev.findIndex(t => t.id === active.id)
      const newIndex = prev.findIndex(t => t.id === over.id)
      newItems = arrayMove(prev, oldIndex, newIndex)
      return newItems
    })

    // Persist to DB in background
    startTransition(async () => {
      const projectId = newItems[0]?.projectId ?? undefined
      await reorderTasks(newItems.map(t => t.id), projectId ?? undefined)
    })
  }

  function handleDragCancel() {
    isDraggingRef.current = false
    setActiveId(null)
  }

  const activeTask = activeId ? items.find(t => t.id === activeId) : null

  if (!items.length) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={items.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="rounded-lg border bg-card overflow-hidden">
          {items.map(task => (
            <SortableTaskItem
              key={task.id}
              task={task}
              onOpen={onOpen}
              isGhost={task.id === activeId}
            />
          ))}
        </div>
      </SortableContext>

      {/* Floating drag overlay */}
      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
        {activeTask ? (
          <div className="rounded-lg border bg-card shadow-xl opacity-95 rotate-1 scale-[1.02]">
            <TaskItem task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
