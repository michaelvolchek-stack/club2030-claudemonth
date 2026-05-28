import { getTasks } from '@/lib/actions/tasks'
import { prisma } from '@/lib/prisma'
import { TaskViewClient } from '@/components/TaskViewClient'
import { ProjectHeader } from '@/components/ProjectHeader'
import { TaskStatus } from '@/types'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

export default async function ProjectPage({ params }: Props) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      children: { orderBy: { name: 'asc' } },
      parent: true,
      _count: { select: { tasks: true } },
    },
  })

  if (!project) notFound()

  // Fetch tasks for this project + all direct sub-projects
  const allProjectIds = [project.id, ...project.children.map(c => c.id)]

  const allStatuses = [TaskStatus.ACTIVE, TaskStatus.DRAFT, TaskStatus.COMPLETED]

  const taskGroups = await Promise.all(
    allProjectIds.map(pid =>
      getTasks({ projectId: pid, status: allStatuses }, { field: 'dueDate', dir: 'asc' })
    )
  )

  // Build sections: main project first, then each sub-project
  const sections = [
    {
      label: project.name,
      tasks: taskGroups[0],
      emptyMessage: 'אין משימות פעילות בפרויקט זה',
      labelVariant: 'default' as const,
    },
    ...project.children.map((child, i) => ({
      label: child.name,
      tasks: taskGroups[i + 1],
      emptyMessage: '',
      labelVariant: 'muted' as const,
    })).filter((_, i) => taskGroups[i + 1]?.length > 0),
  ]

  return (
    <div>
      <ProjectHeader
        id={project.id}
        name={project.name}
        color={project.color}
        parentName={project.parent?.name ?? null}
        taskCount={project._count.tasks}
        childrenCount={project.children.length}
      />
      <TaskViewClient
        title=""
        sections={sections}
        hideTitleBar
      />
    </div>
  )
}
