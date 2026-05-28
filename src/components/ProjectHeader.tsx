'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FolderOpen, Pencil, Trash2, ChevronLeft } from 'lucide-react'
import { deleteProject } from '@/lib/actions/projects'
import { ProjectDialog } from './ProjectDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface ProjectHeaderProps {
  id: string
  name: string
  color: string | null
  parentName: string | null
  taskCount: number
  childrenCount: number
}

export function ProjectHeader({
  id,
  name,
  color,
  parentName,
  taskCount,
  childrenCount,
}: ProjectHeaderProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteProject(id)
        toast.success('פרויקט נמחק')
        router.push('/all')
      } catch {
        toast.error('שגיאה במחיקת הפרויקט')
      }
    })
  }

  return (
    <>
      <div className="border-b px-6 py-5">
        {/* Breadcrumb */}
        {parentName && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
            {parentName}
            <ChevronLeft className="h-3 w-3" />
            {name}
          </p>
        )}

        <div className="flex items-center gap-3">
          {/* Color circle / folder icon */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: color ? `${color}22` : undefined }}
          >
            <FolderOpen
              className="h-5 w-5"
              style={{ color: color ?? 'hsl(var(--muted-foreground))' }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold truncate">{name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {taskCount} משימות
              {childrenCount > 0 && ` · ${childrenCount} תת-פרויקטים`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditOpen(true)}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="ערוך פרויקט"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="מחק פרויקט"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <ProjectDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        allProjects={[]}
        editProject={{ id, name, color, parentId: null }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת פרויקט</AlertDialogTitle>
            <AlertDialogDescription>
              האם למחוק את הפרויקט &quot;{name}&quot;?
              <br />
              המשימות שבו לא יימחקו, אך יאבדו את הקשר לפרויקט.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'מוחק...' : 'מחק'}
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
