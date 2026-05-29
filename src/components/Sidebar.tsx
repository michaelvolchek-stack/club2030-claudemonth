'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { ProjectWithChildren } from '@/types'
import { ProjectTree } from './ProjectTree'
import { ProjectDialog } from './ProjectDialog'
import { TagManager } from './TagManager'
import { CalendarDays, CalendarRange, List, Search, Plus, Tags, X, BarChart2 } from 'lucide-react'
import { deleteProject } from '@/lib/actions/projects'
import { toast } from 'sonner'
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

interface SidebarProps {
  projects: ProjectWithChildren[]
  onClose?: () => void
}

type EditPayload = { id: string; name: string; color: string | null; parentId: string | null }

const NAV_ITEMS = [
  { href: '/today', label: 'היום', icon: CalendarDays },
  { href: '/week', label: 'השבוע', icon: CalendarRange },
  { href: '/all', label: 'הכל', icon: List },
  { href: '/search', label: 'חיפוש', icon: Search },
  { href: '/dashboard', label: 'סקירה', icon: BarChart2 },
]

export function Sidebar({ projects, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProject, setEditProject] = useState<EditPayload | undefined>(undefined)
  const [deletingProject, setDeletingProject] = useState<{ id: string; name: string } | null>(null)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function openCreate() {
    setEditProject(undefined)
    setDialogOpen(true)
  }

  function openEdit(project: EditPayload) {
    setEditProject(project)
    setDialogOpen(true)
  }

  function handleDelete() {
    if (!deletingProject) return
    startTransition(async () => {
      try {
        await deleteProject(deletingProject.id)
        toast.success('פרויקט נמחק')
      } catch {
        toast.error('שגיאה במחיקת הפרויקט')
      } finally {
        setDeletingProject(null)
      }
    })
  }

  return (
    <>
      <aside className="w-60 shrink-0 border-l bg-muted/30 flex flex-col h-full">
        {/* Logo / App name */}
        <div className="px-4 py-5 border-b flex items-center justify-between">
          <h1 className="text-base font-semibold tracking-tight">📋 המשימות שלי</h1>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded hover:bg-muted text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Main nav */}
        <nav className="px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mx-4 my-2 border-t" />

        {/* Projects section */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              פרויקטים
            </p>
            <button
              onClick={openCreate}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="פרויקט חדש"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <ProjectTree
            projects={projects}
            currentPath={pathname}
            onEdit={openEdit}
            onDelete={setDeletingProject}
          />
        </div>

        {/* Tags section */}
        <div className="px-4 py-3 border-t">
          <button
            onClick={() => setTagManagerOpen(true)}
            className="flex items-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Tags className="h-4 w-4 shrink-0" />
            ניהול תגיות
          </button>
        </div>
      </aside>

      {/* Create / Edit project dialog */}
      <ProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        allProjects={projects}
        editProject={editProject}
      />

      {/* Tag manager dialog */}
      <TagManager open={tagManagerOpen} onClose={() => setTagManagerOpen(false)} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingProject} onOpenChange={v => !v && setDeletingProject(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת פרויקט</AlertDialogTitle>
            <AlertDialogDescription>
              האם למחוק את הפרויקט &quot;{deletingProject?.name}&quot;?
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
