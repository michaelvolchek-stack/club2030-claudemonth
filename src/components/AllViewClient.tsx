'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  TaskWithRelations,
  TaskFilters,
  TaskSort,
  TaskStatus,
  Priority,
  STATUS_LABELS,
  PRIORITY_LABELS,
  ProjectWithChildren,
  SortField,
  SortDir,
} from '@/types'
import { TaskList } from './TaskList'
import { TaskPanel } from './TaskPanel'
import { QuickAddBar } from './QuickAddBar'
import { cn } from '@/lib/utils'
import { ArrowDownAZ, ArrowUpAZ, SlidersHorizontal, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'

interface AllViewClientProps {
  tasks: TaskWithRelations[]
  projects: ProjectWithChildren[]
  activeFilters: TaskFilters
  activeSort: TaskSort
}

const SORT_LABELS: Record<SortField, string> = {
  dueDate: 'תאריך יעד',
  priority: 'עדיפות',
  createdAt: 'תאריך יצירה',
  title: 'כותרת',
}

const STATUS_OPTIONS = [TaskStatus.ACTIVE, TaskStatus.DRAFT, TaskStatus.COMPLETED, TaskStatus.CANCELLED]
const PRIORITY_OPTIONS = [Priority.URGENT, Priority.HIGH, Priority.MEDIUM, Priority.LOW]

function flattenProjects(
  nodes: ProjectWithChildren[],
  depth = 0
): { id: string; name: string; depth: number }[] {
  const result: { id: string; name: string; depth: number }[] = []
  for (const n of nodes) {
    result.push({ id: n.id, name: n.name, depth })
    if (n.children.length) result.push(...flattenProjects(n.children, depth + 1))
  }
  return result
}

export function AllViewClient({ tasks, projects, activeFilters, activeSort }: AllViewClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const selectedTask = selectedTaskId
    ? (tasks.find(t => t.id === selectedTaskId) ?? null)
    : null

  const flatProjects = flattenProjects(projects)

  // ── URL helpers ──────────────────────────────────────────────────────────────

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (!v) params.delete(k)
      else params.set(k, v)
    }
    router.push(`/all?${params.toString()}`)
  }

  // ── Filters ──────────────────────────────────────────────────────────────────

  function toggleStatus(s: TaskStatus) {
    const current = activeFilters.status ?? []
    const next = current.includes(s) ? current.filter(x => x !== s) : [...current, s]
    updateParams({ status: next.length ? next.join(',') : undefined })
  }

  function togglePriority(p: Priority) {
    const current = activeFilters.priority ?? []
    const next = current.includes(p) ? current.filter(x => x !== p) : [...current, p]
    updateParams({ priority: next.length ? next.join(',') : undefined })
  }

  function setProject(id: string) {
    updateParams({ projectId: id || undefined })
  }

  function toggleSortDir() {
    updateParams({ dir: activeSort.dir === 'asc' ? 'desc' : 'asc' })
  }

  function setSortField(field: SortField) {
    updateParams({ sort: field, dir: 'asc' })
  }

  const hasActiveFilters =
    !!activeFilters.projectId ||
    (activeFilters.priority?.length ?? 0) > 0 ||
    JSON.stringify(activeFilters.status?.slice().sort()) !==
      JSON.stringify([TaskStatus.ACTIVE, TaskStatus.DRAFT].sort())

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">כל המשימות</h2>
        {hasActiveFilters && (
          <button
            onClick={() => router.push('/all')}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            אפס פילטרים
          </button>
        )}
      </div>

      {/* Quick Add */}
      <QuickAddBar />

      {/* Filter + Sort bar */}
      <div className="rounded-lg border bg-muted/20 px-3 py-2.5 space-y-2">
        {/* Row 1: status + priority */}
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

          {/* Status */}
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={cn(
                'text-xs px-2.5 py-0.5 rounded-full border transition-colors',
                activeFilters.status?.includes(s)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}

          <span className="w-px h-4 bg-border" />

          {/* Priority */}
          {PRIORITY_OPTIONS.map(p => {
            const active = activeFilters.priority?.includes(p)
            return (
              <button
                key={p}
                onClick={() => togglePriority(p)}
                className={cn(
                  'text-xs px-2.5 py-0.5 rounded-full border transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                )}
              >
                {PRIORITY_LABELS[p]}
              </button>
            )
          })}
        </div>

        {/* Row 2: project + sort */}
        <div className="flex items-center gap-2">
          {/* Project dropdown */}
          {flatProjects.length > 0 && (
            <Select
              value={activeFilters.projectId ?? ''}
              onValueChange={v => setProject(v ?? '')}
            >
              <SelectTrigger className="h-7 text-xs w-auto px-2.5 gap-1.5 border-border bg-background">
                <span className="truncate max-w-[120px]">
                  {activeFilters.projectId
                    ? (flatProjects.find(p => p.id === activeFilters.projectId)?.name ?? 'פרויקט')
                    : 'כל הפרויקטים'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">כל הפרויקטים</SelectItem>
                {flatProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {'—'.repeat(p.depth)} {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sort — pushed to end */}
          <div className="flex items-center gap-1 mr-auto">
            <span className="text-xs text-muted-foreground">מיין:</span>
            <Select
              value={activeSort.field}
              onValueChange={v => setSortField((v ?? 'dueDate') as SortField)}
            >
              <SelectTrigger className="h-7 text-xs w-auto px-2.5 gap-1.5 border-border bg-background">
                <span>{SORT_LABELS[activeSort.field]}</span>
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(SORT_LABELS) as [SortField, string][]).map(([f, label]) => (
                  <SelectItem key={f} value={f}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={toggleSortDir}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={activeSort.dir === 'asc' ? 'סדר עולה — לחץ להיפוך' : 'סדר יורד — לחץ להיפוך'}
            >
              {activeSort.dir === 'asc'
                ? <ArrowUpAZ className="h-3.5 w-3.5" />
                : <ArrowDownAZ className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {tasks.length === 0 ? 'אין משימות תואמות' : `${tasks.length} משימות`}
      </p>

      {/* Task list */}
      <TaskList
        tasks={tasks}
        onOpen={t => setSelectedTaskId(t.id)}
        emptyMessage="אין משימות — שנה פילטרים או הוסף משימה חדשה"
      />

      {/* Task panel */}
      <TaskPanel
        task={selectedTask}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  )
}
