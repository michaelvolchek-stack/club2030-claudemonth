'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { createProject, updateProject } from '@/lib/actions/projects'
import { ProjectWithChildren } from '@/types'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6b7280',
]

interface ProjectDialogProps {
  open: boolean
  onClose: () => void
  allProjects: ProjectWithChildren[]   // flat list for parent selector
  editProject?: {
    id: string
    name: string
    color: string | null
    parentId: string | null
  }
}

export function ProjectDialog({ open, onClose, allProjects, editProject }: ProjectDialogProps) {
  const isEdit = !!editProject
  const [name, setName] = useState(editProject?.name ?? '')
  const [color, setColor] = useState<string>(editProject?.color ?? PRESET_COLORS[5])
  const [parentId, setParentId] = useState<string>(editProject?.parentId ?? '')
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    setName(editProject?.name ?? '')
    setColor(editProject?.color ?? PRESET_COLORS[5])
    setParentId(editProject?.parentId ?? '')
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateProject(editProject.id, {
            name: name.trim(),
            color,
            parentId: parentId || null,
          })
          toast.success('פרויקט עודכן')
        } else {
          await createProject({
            name: name.trim(),
            color,
            parentId: parentId || undefined,
          })
          toast.success(`פרויקט נוצר: ${name.trim()}`)
        }
        handleClose()
      } catch {
        toast.error('שגיאה בשמירת הפרויקט')
      }
    })
  }

  // Flatten projects for parent selector, excluding the current project
  const parentOptions = flattenProjects(allProjects).filter(
    p => p.id !== editProject?.id
  )

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'עריכת פרויקט' : 'פרויקט חדש'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="project-name">שם הפרויקט</Label>
            <Input
              id="project-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="למשל: עבודה, אישי, לימודים..."
              autoFocus
              required
            />
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>צבע</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? 'hsl(var(--foreground))' : 'transparent',
                    transform: color === c ? 'scale(1.15)' : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Parent project */}
          {parentOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label>פרויקט-אב (אופציונלי)</Label>
              <Select
                value={parentId}
                onValueChange={v => setParentId(v ?? '')}
              >
                <SelectTrigger>
                  <span className="text-sm">
                    {parentId
                      ? parentOptions.find(p => p.id === parentId)?.name ?? 'בחר...'
                      : 'ללא פרויקט-אב'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">ללא פרויקט-אב</SelectItem>
                  {parentOptions.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {'—'.repeat(p.depth)} {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="gap-2 flex-row-reverse">
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              {isEdit ? 'שמור' : 'צור פרויקט'}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              ביטול
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Flatten tree with depth info for indentation
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
