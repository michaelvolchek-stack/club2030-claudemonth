import { getTasks } from '@/lib/actions/tasks'
import { prisma } from '@/lib/prisma'
import { TaskViewClient } from '@/components/TaskViewClient'
import { TaskStatus } from '@/types'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

export default async function ProjectPage({ params }: Props) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { children: true },
  })

  if (!project) notFound()

  // Get tasks for this project and all sub-projects
  const allProjectIds = [project.id, ...project.children.map(c => c.id)]

  const tasks = await Promise.all(
    allProjectIds.map(pid =>
      getTasks({ projectId: pid, status: [TaskStatus.DRAFT, TaskStatus.ACTIVE] })
    )
  )

  const sections = [
    {
      label: project.name,
      tasks: tasks[0],
      emptyMessage: 'אין משימות בפרויקט זה',
      labelVariant: 'default' as const,
    },
    ...project.children.map((child, i) => ({
      label: child.name,
      tasks: tasks[i + 1],
      emptyMessage: '',
      labelVariant: 'muted' as const,
    })),
  ].filter(s => s.tasks.length > 0 || s.labelVariant === 'default')

  return (
    <TaskViewClient
      title={project.name}
      sections={sections}
    />
  )
}
