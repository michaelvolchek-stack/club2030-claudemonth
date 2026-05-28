import { searchTasks } from '@/lib/actions/tasks'
import { TaskViewClient } from '@/components/TaskViewClient'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { q?: string }
}

export default async function SearchPage({ searchParams }: Props) {
  const query = searchParams.q ?? ''
  const tasks = query ? await searchTasks(query) : []

  return (
    <TaskViewClient
      title={query ? `תוצאות עבור "${query}"` : 'חיפוש'}
      sections={[
        {
          label: query ? `נמצאו ${tasks.length} תוצאות` : 'הקלד כדי לחפש',
          tasks,
          emptyMessage: query ? 'לא נמצאו תוצאות' : '',
          labelVariant: 'muted',
        },
      ]}
    />
  )
}
