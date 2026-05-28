'use client'

import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ProjectWithChildren } from '@/types'
import { ChevronDown, ChevronLeft, FolderOpen, Folder, Pencil, Trash2 } from 'lucide-react'

type EditPayload = { id: string; name: string; color: string | null; parentId: string | null }
type DeletePayload = { id: string; name: string }

interface ProjectTreeProps {
  projects: ProjectWithChildren[]
  currentPath: string
  depth?: number
  onEdit?: (project: EditPayload) => void
  onDelete?: (project: DeletePayload) => void
}

export function ProjectTree({ projects, currentPath, depth = 0, onEdit, onDelete }: ProjectTreeProps) {
  if (!projects.length) {
    return depth === 0 ? (
      <p className="px-3 text-xs text-muted-foreground">אין פרויקטים עדיין</p>
    ) : null
  }

  return (
    <ul className={cn('space-y-0.5', depth > 0 && 'pr-3')}>
      {projects.map(project => (
        <ProjectNode
          key={project.id}
          project={project}
          currentPath={currentPath}
          depth={depth}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}

function ProjectNode({
  project,
  currentPath,
  depth,
  onEdit,
  onDelete,
}: {
  project: ProjectWithChildren
  currentPath: string
  depth: number
  onEdit?: (project: EditPayload) => void
  onDelete?: (project: DeletePayload) => void
}) {
  const [open, setOpen] = useState(true)
  const [hovered, setHovered] = useState(false)
  const href = `/project/${project.id}`
  const isActive = currentPath === href
  const hasChildren = project.children.length > 0

  return (
    <li>
      <div
        className="flex items-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={() => setOpen(o => !o)}
            className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Project link */}
        <Link
          href={href}
          className={cn(
            'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors min-w-0',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {open && hasChildren ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0" />
          )}
          {project.color && (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: project.color }}
            />
          )}
          <span className="truncate">{project.name}</span>
          {project._count && !hovered && (
            <span className="mr-auto text-xs opacity-50">{project._count.tasks}</span>
          )}
        </Link>

        {/* Hover actions */}
        <div className={cn('flex items-center gap-0.5 mr-1 shrink-0 transition-opacity', hovered ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
          {onEdit && (
            <button
              onClick={e => {
                e.preventDefault()
                onEdit({ id: project.id, name: project.name, color: project.color, parentId: project.parentId })
              }}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="ערוך פרויקט"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={e => {
                e.preventDefault()
                onDelete({ id: project.id, name: project.name })
              }}
              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="מחק פרויקט"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {hasChildren && open && (
        <ProjectTree
          projects={project.children}
          currentPath={currentPath}
          depth={depth + 1}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </li>
  )
}
