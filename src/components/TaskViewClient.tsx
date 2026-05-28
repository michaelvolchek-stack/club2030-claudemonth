'use client'

import { useState, useMemo } from 'react'
import { TaskWithRelations } from '@/types'
import { TaskList } from './TaskList'
import { TaskPanel } from './TaskPanel'
import { QuickAddBar } from './QuickAddBar'

interface Section {
  label: string
  tasks: TaskWithRelations[]
  emptyMessage?: string
  labelVariant?: 'default' | 'overdue' | 'muted'
}

interface TaskViewClientProps {
  sections: Section[]
  title: string
}

export function TaskViewClient({ sections, title }: TaskViewClientProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Always derive the current task from fresh server data
  const allTasks = useMemo(
    () => sections.flatMap(s => s.tasks),
    [sections]
  )

  const selectedTask = selectedTaskId
    ? (allTasks.find(t => t.id === selectedTaskId) ?? null)
    : null

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>

      {/* Quick Add */}
      <QuickAddBar />

      {/* Sections */}
      {sections.map(section => (
        <div key={section.label}>
          <h3
            className={
              section.labelVariant === 'overdue'
                ? 'text-sm font-semibold text-red-600 mb-2'
                : section.labelVariant === 'muted'
                  ? 'text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2'
                  : 'text-sm font-semibold text-foreground mb-2'
            }
          >
            {section.label}
            <span className="mr-2 text-muted-foreground font-normal">
              ({section.tasks.length})
            </span>
          </h3>
          <TaskList
            tasks={section.tasks}
            onOpen={t => setSelectedTaskId(t.id)}
            emptyMessage={section.emptyMessage}
          />
        </div>
      ))}

      {/* Task Panel — receives live data from server */}
      <TaskPanel
        task={selectedTask}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  )
}
