'use client'

import { useState, useTransition } from 'react'
import { parseQuickAdd } from '@/lib/actions/quickAdd'
import { createTask } from '@/lib/actions/tasks'
import { getTags } from '@/lib/actions/tags'
import { getProjectTree } from '@/lib/actions/projects'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { PRIORITY_LABELS, QuickAddResult } from '@/types'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

export function QuickAddBar() {
  const [value, setValue] = useState('')
  const [preview, setPreview] = useState<QuickAddResult | null>(null)
  const [isPending, startTransition] = useTransition()

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

        // Resolve project ID if needed
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
          projectId,
          tagIds,
        })

        setValue('')
        setPreview(null)
        toast.success(`משימה נוספה: ${parsed.title}`)
      } catch (err) {
        toast.error('שגיאה ביצירת המשימה')
        console.error(err)
      }
    })
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={value}
          onChange={e => handleChange(e.target.value)}
          placeholder='הוסף משימה... למשל: "לפגוש יעל מחר בבוקר !1 #עבודה @פגישות"'
          className="flex-1 text-sm"
          disabled={isPending}
          dir="rtl"
        />
        <Button type="submit" size="sm" disabled={!value.trim() || isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span className="mr-1">הוסף</span>
        </Button>
      </form>

      {/* Live preview */}
      {preview && value.trim().length > 2 && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground px-1">
          <span className="font-medium text-foreground">{preview.title}</span>
          {preview.dueDate && (
            <span>
              📅{' '}
              {preview.dueHasTime
                ? format(preview.dueDate, "dd/MM בשעה HH:mm", { locale: he })
                : format(preview.dueDate, 'dd/MM', { locale: he })}
            </span>
          )}
          <span>⚡ {PRIORITY_LABELS[preview.priority]}</span>
          {preview.projectName && <span>📁 {preview.projectName}</span>}
          {preview.tagNames.map(t => (
            <span key={t}>🏷 {t}</span>
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
