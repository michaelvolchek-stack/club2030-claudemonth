import { TaskStatus, STATUS_LABELS } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<TaskStatus, string> = {
  DRAFT: 'text-slate-500 bg-slate-100 border-slate-200',
  ACTIVE: 'text-blue-600 bg-blue-50 border-blue-200',
  COMPLETED: 'text-green-600 bg-green-50 border-green-200',
  CANCELLED: 'text-red-400 bg-red-50 border-red-200',
}

export function StatusBadge({ status }: { status: string }) {
  const s = status as TaskStatus
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border',
        STATUS_COLORS[s] ?? 'text-slate-500 bg-slate-100'
      )}
    >
      {STATUS_LABELS[s] ?? status}
    </span>
  )
}
