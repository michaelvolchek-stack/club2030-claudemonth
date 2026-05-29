'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { RecurringRule, RecurringFreq } from '@/types'
import { cn } from '@/lib/utils'
import { RotateCcw } from 'lucide-react'

interface RecurringEditorProps {
  isRecurring: boolean
  recurringRule: string | null
  onChange: (isRecurring: boolean, rule?: RecurringRule) => void
  disabled?: boolean
}

const FREQ_LABELS: Record<RecurringFreq, string> = {
  daily: 'ימים',
  weekly: 'שבועות',
  monthly: 'חודשים',
}

const WEEK_DAYS = [
  { index: 0, label: 'א' },
  { index: 1, label: 'ב' },
  { index: 2, label: 'ג' },
  { index: 3, label: 'ד' },
  { index: 4, label: 'ה' },
  { index: 5, label: 'ו' },
  { index: 6, label: 'ש' },
]

function parseRule(raw: string | null): RecurringRule | null {
  if (!raw) return null
  try { return JSON.parse(raw) as RecurringRule } catch { return null }
}

export function RecurringEditor({
  isRecurring,
  recurringRule,
  onChange,
  disabled,
}: RecurringEditorProps) {
  const parsed = parseRule(recurringRule)

  const [freq, setFreq] = useState<RecurringFreq>(parsed?.freq ?? 'weekly')
  const [interval, setInterval] = useState<number>(parsed?.interval ?? 1)
  const [days, setDays] = useState<number[]>(parsed?.days ?? [])
  const [dayOfMonth, setDayOfMonth] = useState<number>(parsed?.dayOfMonth ?? 1)

  // Build the rule from current local state
  function buildRule(
    f = freq,
    iv = interval,
    d = days,
    dom = dayOfMonth,
  ): RecurringRule {
    const rule: RecurringRule = { freq: f }
    if (iv > 1) rule.interval = iv
    if (f === 'weekly' && d.length > 0) rule.days = d
    if (f === 'monthly') rule.dayOfMonth = dom
    return rule
  }

  function handleToggle(checked: boolean) {
    onChange(checked, checked ? buildRule() : undefined)
  }

  function handleFreqChange(newFreq: RecurringFreq) {
    setFreq(newFreq)
    if (isRecurring) onChange(true, buildRule(newFreq))
  }

  function handleIntervalBlur(raw: string) {
    const n = Math.max(1, Math.min(99, parseInt(raw) || 1))
    setInterval(n)
    if (isRecurring) onChange(true, buildRule(freq, n))
  }

  function toggleDay(idx: number) {
    const next = days.includes(idx)
      ? days.filter(d => d !== idx)
      : [...days, idx].sort((a, b) => a - b)
    setDays(next)
    if (isRecurring) onChange(true, buildRule(freq, interval, next))
  }

  function handleDayOfMonthBlur(raw: string) {
    const n = Math.max(1, Math.min(31, parseInt(raw) || 1))
    setDayOfMonth(n)
    if (isRecurring) onChange(true, buildRule(freq, interval, days, n))
  }

  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id="recurring-toggle"
        checked={isRecurring}
        onCheckedChange={v => handleToggle(!!v)}
        disabled={disabled}
        className="mt-0.5"
      />

      <div className="flex-1 min-w-0">
        <label
          htmlFor="recurring-toggle"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 text-sm font-medium cursor-pointer select-none"
        >
          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
          משימה חוזרת
        </label>

        {isRecurring && (
          <div className="mt-2.5 space-y-2.5">
            {/* Interval + frequency */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground shrink-0">כל</span>
              <Input
                type="number"
                defaultValue={interval}
                min={1}
                max={99}
                onBlur={e => handleIntervalBlur(e.target.value)}
                disabled={disabled}
                className="w-14 h-7 text-xs text-center px-1"
              />
              <Select
                value={freq}
                onValueChange={v => handleFreqChange(v as RecurringFreq)}
              >
                <SelectTrigger className="h-7 text-xs w-28">
                  <span>{FREQ_LABELS[freq]}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">ימים</SelectItem>
                  <SelectItem value="weekly">שבועות</SelectItem>
                  <SelectItem value="monthly">חודשים</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Weekly — day-of-week picker */}
            {freq === 'weekly' && (
              <div className="flex gap-1">
                {WEEK_DAYS.map(d => (
                  <button
                    key={d.index}
                    type="button"
                    onClick={() => toggleDay(d.index)}
                    disabled={disabled}
                    className={cn(
                      'w-7 h-7 rounded-full text-xs font-medium border transition-colors shrink-0',
                      days.includes(d.index)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground'
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}

            {/* Monthly — day of month */}
            {freq === 'monthly' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">ביום</span>
                <Input
                  type="number"
                  defaultValue={dayOfMonth}
                  min={1}
                  max={31}
                  onBlur={e => handleDayOfMonthBlur(e.target.value)}
                  disabled={disabled}
                  className="w-14 h-7 text-xs text-center px-1"
                />
                <span className="text-xs text-muted-foreground">בחודש</span>
              </div>
            )}

            {/* Summary text */}
            <p className="text-xs text-muted-foreground">
              {summarize(freq, interval, days, dayOfMonth)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Human-readable summary ───────────────────────────────────────────────────

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

function summarize(
  freq: RecurringFreq,
  interval: number,
  days: number[],
  dayOfMonth: number,
): string {
  if (freq === 'daily') {
    return interval === 1 ? 'חוזרת כל יום' : `חוזרת כל ${interval} ימים`
  }
  if (freq === 'weekly') {
    const base = interval === 1 ? 'כל שבוע' : `כל ${interval} שבועות`
    if (days.length === 0) return `חוזרת ${base}`
    const dayLabels = days.map(d => 'יום ' + DAY_NAMES[d]).join(', ')
    return `חוזרת ${base} ב${dayLabels}`
  }
  if (freq === 'monthly') {
    const base = interval === 1 ? 'כל חודש' : `כל ${interval} חודשים`
    return `חוזרת ${base}, ביום ${dayOfMonth}`
  }
  return ''
}
