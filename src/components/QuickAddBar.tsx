'use client'

import { useState, useTransition, useRef } from 'react'
import { parseQuickAdd } from '@/lib/actions/quickAdd'
import { createTask } from '@/lib/actions/tasks'
import { getTags } from '@/lib/actions/tags'
import { getProjectTree } from '@/lib/actions/projects'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Loader2, CalendarDays, CalendarCheck, Folder, Tag } from 'lucide-react'
import { PRIORITY_LABELS, PRIORITY_COLORS, QuickAddResult, Priority } from '@/types'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function QuickAddBar() {
  const [value, setValue] = useState('')
  const [preview, setPreview] = useState<QuickAddResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleChange(text: string) {
    setValue(text)
    if (text.trim().length > 2) {
      const result = await parseQuickAdd(text)
      setPreview(result)
    } else {
      setPreview(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return

    startTransition(async () => {
      try {
        const parsed = await parseQuickAdd(value)

        // Resolve project ID
        let projectId: string | undefined
        if (parsed.projectName) {
          const tree = await getProjectTree()
          const flat = flattenProjects(tree)
          const found = flat.find(
            p => p.name.toLowerCase() === parsed.projectName!.toLowerCase()
          )
          if (found) projectId = found.id
        }

        // Resolve tag IDs
        let tagIds: string[] = []
        if (parsed.tagNames.length) {
          const allTags = await getTags()
          tagIds = parsed.tagNames
            .map(name => allTags.find(t => t.name.toLowerCase() === name.toLowerCase())?.id)
            .filter(Boolean) as string[]
        }

        await createTask({
          title: parsed.title,
          priority: parsed.priority,
          dueDate: parsed.dueDate ?? null,
          dueHasTime: parsed.dueHasTime,
          plannedDate: parsed.plannedDate ?? null,
          projectId,
          tagIds,
        })

        setValue('')
        setPreview(null)
        toast.success(`✓ ${parsed.title}`)
      } catch (err) {
        toast.error('שגיאה ביצירת המשימה')
        console.error(err)
      }
    })
  }

  const showPreview = !!preview && value.trim().length > 2

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          ref={inputRef}
          data-quickadd
          value={value}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && (setValue(''), setPreview(null))}
          placeholder='הוסף משימה... למשל: "לפגוש יעל מחר !1 #עבודה @פגישות ~היום"'
          className="flex-1 text-sm"
          disabled={isPending}
          dir="rtl"
        />
        <Button type="submit" size="sm" disabled={!value.trim() || isPending}>
          {isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Plus className="h-4 w-4" />}
          <span className="mr-1">הוסף</span>
        </Button>
      </form>

      {/* Live preview chips */}
      {showPreview && preview && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 px-1 text-xs">
          {/* Title */}
          <span className="font-medium text-foreground">{preview.title}</span>

          {/* Priority (only if non-default) */}
          {preview.priority !== Priority.MEDIUM && (
            <span className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded border font-medium',
              PRIORITY_COLORS[preview.priority]
            )}>
              {PRIORITY_LABELS[preview.priority]}
            </span>
          )}

          {/* Due date */}
          {preview.dueDate && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              <CalendarDays className="h-3 w-3" />
              {preview.dueHasTime
                ? format(preview.dueDate, "dd/MM 'בשעה' HH:mm", { locale: he })
                : format(preview.dueDate, 'dd/MM/yyyy', { locale: he })}
            </span>
          )}

          {/* Planned date */}
          {preview.plannedDate && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
              <CalendarCheck className="h-3 w-3" />
              תכנון: {format(preview.plannedDate, 'dd/MM/yyyy', { locale: he })}
            </span>
          )}

          {/* Project */}
          {preview.projectName && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
              <Folder className="h-3 w-3" />
              {preview.projectName}
            </span>
          )}

          {/* Tags */}
          {preview.tagNames.map(t => (
            <span key={t} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
              <Tag className="h-3 w-3" />
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function flattenProjects(
  tree: { id: string; name: string; children: unknown[] }[]
): { id: string; name: string }[] {
  const result: { id: string; name: string }[] = []
  function walk(nodes: typeof tree) {
    for (const n of nodes) {
      result.push({ id: n.id, name: n.name })
      if (n.children.length) walk(n.children as typeof tree)
    }
  }
  walk(tree)
  return result
}
