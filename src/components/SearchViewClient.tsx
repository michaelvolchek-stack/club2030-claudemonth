'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Search, X } from 'lucide-react'
import { TaskWithRelations } from '@/types'
import { TaskPanel } from './TaskPanel'
import { PriorityBadge } from './PriorityBadge'
import { cn } from '@/lib/utils'

interface SearchViewClientProps {
  tasks: TaskWithRelations[]
  query: string
}

export function SearchViewClient({ tasks, query }: SearchViewClientProps) {
  const router = useRouter()
  const [input, setInput] = useState(query)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const selectedTask = selectedTaskId
    ? (tasks.find(t => t.id === selectedTaskId) ?? null)
    : null

  // Debounced URL update → triggers server re-fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = input.trim()
      if (trimmed === query) return
      router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search')
    }, 300)
    return () => clearTimeout(timer)
  }, [input]) // eslint-disable-line react-hooks/exhaustive-deps

  function clearSearch() {
    setInput('')
    router.push('/search')
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="חפש משימות, תגיות, פרויקטים..."
          autoFocus
          className={cn(
            'w-full pr-10 pl-9 py-3 text-sm rounded-lg border bg-background',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors'
          )}
        />
        {input && (
          <button
            onClick={clearSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Empty state — no query */}
      {!query && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">חפש בכל המשימות</p>
          <p className="text-xs mt-1 opacity-70">
            כותרת · תיאור · תת-משימות · תגיות · פרויקט
          </p>
        </div>
      )}

      {/* Results count */}
      {query && (
        <p className="text-xs text-muted-foreground">
          {tasks.length === 0
            ? `אין תוצאות עבור "${query}"`
            : `${tasks.length} תוצאות עבור "${query}"`}
        </p>
      )}

      {/* Results list */}
      {tasks.length > 0 && (
        <div className="border rounded-lg divide-y overflow-hidden">
          {tasks.map(task => (
            <button
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              className="w-full text-right px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Title */}
                  <p className="text-sm font-medium leading-snug">
                    <Highlight text={task.title} query={query} />
                  </p>

                  {/* Description snippet */}
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      <Highlight text={task.description} query={query} />
                    </p>
                  )}

                  {/* Subtask match */}
                  {task.checklistItems.some(s =>
                    s.title.toLowerCase().includes(query.toLowerCase())
                  ) && (
                    <p className="text-xs text-muted-foreground">
                      <span className="opacity-60">תת-משימה: </span>
                      <Highlight
                        text={
                          task.checklistItems.find(s =>
                            s.title.toLowerCase().includes(query.toLowerCase())
                          )!.title
                        }
                        query={query}
                      />
                    </p>
                  )}

                  {/* Meta: project · tags · date */}
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    {task.project && (
                      <span className="text-xs border rounded px-1.5 py-0.5 text-muted-foreground">
                        <Highlight text={task.project.name} query={query} />
                      </span>
                    )}
                    {task.tags.map(({ tag }) => (
                      <span
                        key={tag.id}
                        className="text-xs font-medium"
                        style={{ color: tag.color ?? undefined }}
                      >
                        <Highlight text={tag.name} query={query} />
                      </span>
                    ))}
                    {task.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        {format(
                          new Date(task.dueDate),
                          task.dueHasTime ? "dd/MM 'בשעה' HH:mm" : 'dd/MM/yyyy',
                          { locale: he }
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Priority badge */}
                <PriorityBadge priority={task.priority} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Task panel */}
      <TaskPanel
        task={selectedTask}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  )
}

/* ── Text highlight ─────────────────────────────────────────────────────────── */

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200 rounded-sm px-0.5 not-italic font-medium"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}
