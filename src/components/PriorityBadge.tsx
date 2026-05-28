import { Priority, PRIORITY_COLORS, PRIORITY_LABELS } from '@/types'
import { cn } from '@/lib/utils'

export function PriorityBadge({ priority }: { priority: string }) {
  const p = priority as Priority
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border',
        PRIORITY_COLORS[p] ?? 'text-slate-500 bg-slate-50 border-slate-200'
      )}
    >
      {PRIORITY_LABELS[p] ?? priority}
    </span>
  )
}
