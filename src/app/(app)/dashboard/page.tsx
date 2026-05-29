import { getDashboardData } from '@/lib/actions/dashboard'
import { PRIORITY_LABELS, Priority } from '@/types'
import { cn } from '@/lib/utils'
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Flame,
} from 'lucide-react'

export default async function DashboardPage() {
  const data = await getDashboardData()

  const todayKey = new Date().toISOString().slice(0, 10)
  const maxBar = Math.max(...data.completedByDay.map(d => d.count), 1)
  const maxPri = Math.max(...data.byPriority.map(p => p.count), 1)
  const maxPrj = Math.max(...data.byProject.map(p => p.count), 1)

  const PRIORITY_ORDER = [Priority.URGENT, Priority.HIGH, Priority.MEDIUM, Priority.LOW]
  const PRIORITY_BAR_COLOR: Record<Priority, string> = {
    URGENT: 'bg-red-500',
    HIGH:   'bg-orange-400',
    MEDIUM: 'bg-blue-400',
    LOW:    'bg-slate-300',
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
      <h2 className="text-xl font-semibold">סקירה כללית</h2>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Activity className="h-4 w-4 text-blue-500" />}
          label="משימות פעילות"
          value={data.totalActive}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
          label="הושלמו השבוע"
          value={data.completedThisWeek}
          accent="green"
        />
        <StatCard
          icon={<AlertCircle className="h-4 w-4 text-red-500" />}
          label="באיחור"
          value={data.totalOverdue}
          accent={data.totalOverdue > 0 ? 'red' : undefined}
        />
        <StatCard
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          label={`streak ימים`}
          value={data.streak}
          accent={data.streak >= 3 ? 'orange' : undefined}
          suffix="🔥"
        />
      </div>

      {/* ── Bar chart: last 7 days ──────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-5">השלמות — 7 ימים אחרונים</h3>
        <div className="flex items-end gap-1.5" style={{ height: 96 }}>
          {data.completedByDay.map(({ date, count, dayLabel }) => {
            const isToday = date === todayKey
            const barH = count
              ? Math.max(Math.round((count / maxBar) * 80), 8)
              : 0
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                {count > 0 && (
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {count}
                  </span>
                )}
                {/* spacer to push bar down */}
                <div className="flex-1" />
                <div
                  className={cn(
                    'w-full rounded-t transition-all',
                    barH === 0 ? 'bg-muted/40 h-px' : (isToday ? 'bg-primary' : 'bg-primary/35')
                  )}
                  style={{ height: barH > 0 ? barH : 1 }}
                />
                <span
                  className={cn(
                    'text-xs mt-1',
                    isToday
                      ? 'font-bold text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  {dayLabel}
                </span>
              </div>
            )
          })}
        </div>
        {data.completedThisWeek === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            עדיין לא הושלמו משימות השבוע — בוא נתחיל!
          </p>
        )}
      </div>

      {/* ── Priority + Project breakdown ────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Priority */}
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">לפי עדיפות</h3>
          {data.byPriority.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              אין משימות פעילות
            </p>
          ) : (
            <div className="space-y-3">
              {PRIORITY_ORDER.map(p => {
                const found = data.byPriority.find(x => x.priority === p)
                if (!found) return null
                const pct = Math.round((found.count / maxPri) * 100)
                return (
                  <div key={p}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium">{PRIORITY_LABELS[p]}</span>
                      <span className="text-muted-foreground tabular-nums">{found.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', PRIORITY_BAR_COLOR[p])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Project */}
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">לפי פרויקט</h3>
          {data.byProject.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              אין פרויקטים עם משימות פעילות
            </p>
          ) : (
            <div className="space-y-3">
              {data.byProject.map(({ projectId, projectName, color, count }) => {
                const pct = Math.round((count / maxPrj) * 100)
                return (
                  <div key={projectId}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-1.5 font-medium">
                        {color && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                        )}
                        {projectName}
                      </span>
                      <span className="text-muted-foreground tabular-nums">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Totals footer ───────────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground text-center pb-4">
        סה&quot;כ הושלמו {data.totalCompleted} משימות
      </p>
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

type Accent = 'red' | 'green' | 'orange'

function StatCard({
  icon,
  label,
  value,
  accent,
  suffix,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent?: Accent
  suffix?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 flex flex-col gap-1.5',
        accent === 'red'    && 'border-red-200 bg-red-50 dark:bg-red-950/20',
        accent === 'green'  && value > 0 && 'border-green-200 bg-green-50 dark:bg-green-950/20',
        accent === 'orange' && 'border-orange-200 bg-orange-50 dark:bg-orange-950/20',
      )}
    >
      <div>{icon}</div>
      <div className="text-2xl font-bold tabular-nums">
        {value}
        {suffix && value > 0 && <span className="text-base ml-1">{suffix}</span>}
      </div>
      <div className="text-xs text-muted-foreground leading-snug">{label}</div>
    </div>
  )
}
