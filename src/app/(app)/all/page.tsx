import { getTasks } from '@/lib/actions/tasks'
import { getProjectTree } from '@/lib/actions/projects'
import { AllViewClient } from '@/components/AllViewClient'
import { TaskStatus, Priority, TaskFilters, TaskSort, SortField, SortDir } from '@/types'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function parseFilters(p: SearchParams): TaskFilters {
  const status = str(p.status)
  const priority = str(p.priority)

  const validStatuses = Object.values(TaskStatus)
  const validPriorities = Object.values(Priority)

  return {
    status: status
      ? (status.split(',').filter(s => validStatuses.includes(s as TaskStatus)) as TaskStatus[])
      : [TaskStatus.ACTIVE, TaskStatus.DRAFT],
    priority: priority
      ? (priority.split(',').filter(x => validPriorities.includes(x as Priority)) as Priority[])
      : undefined,
    projectId: str(p.projectId) || undefined,
  }
}

function parseSort(p: SearchParams): TaskSort {
  const validFields: SortField[] = ['dueDate', 'priority', 'createdAt', 'title']
  const field = str(p.sort) as SortField | undefined
  const dir = str(p.dir) as SortDir | undefined
  return {
    field: field && validFields.includes(field) ? field : 'dueDate',
    dir: dir === 'desc' ? 'desc' : 'asc',
  }
}

export default async function AllPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const filters = parseFilters(searchParams)
  const sort = parseSort(searchParams)

  const [tasks, projects] = await Promise.all([
    getTasks(filters, sort),
    getProjectTree(),
  ])

  return (
    <AllViewClient
      tasks={tasks}
      projects={projects}
      activeFilters={filters}
      activeSort={sort}
    />
  )
}
