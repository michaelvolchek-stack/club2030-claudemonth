import { searchTasks } from '@/lib/actions/tasks'
import { SearchViewClient } from '@/components/SearchViewClient'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { q?: string }
}

export default async function SearchPage({ searchParams }: Props) {
  const query = searchParams.q?.trim() ?? ''
  const tasks = query ? await searchTasks(query) : []

  return <SearchViewClient tasks={tasks} query={query} />
}
