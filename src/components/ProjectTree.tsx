'use client'

import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ProjectWithChildren } from '@/types'
import { ChevronDown, ChevronLeft, FolderOpen, Folder } from 'lucide-react'

interface ProjectTreeProps {
  projects: ProjectWithChildren[]
  currentPath: string
  depth?: number
}

export function ProjectTree({ projects, currentPath, depth = 0 }: ProjectTreeProps) {
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
        />
      ))}
    </ul>
  )
}

function ProjectNode({
  project,
  currentPath,
  depth,
}: {
  project: ProjectWithChildren
  currentPath: string
  depth: number
}) {
  const [open, setOpen] = useState(true)
  const href = `/project/${project.id}`
  const isActive = currentPath === href
  const hasChildren = project.children.length > 0

  return (
    <li>
      <div className="flex items-center">
        {hasChildren ? (
          <button
            onClick={() => setOpen(o => !o)}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <Link
          href={href}
          className={cn(
            'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
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
          {project._count && (
            <span className="mr-auto text-xs opacity-60">{project._count.tasks}</span>
          )}
        </Link>
      </div>

      {hasChildren && open && (
        <ProjectTree projects={project.children} currentPath={currentPath} depth={depth + 1} />
      )}
    </li>
  )
}
