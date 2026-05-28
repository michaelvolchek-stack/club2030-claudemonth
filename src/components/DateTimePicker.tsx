'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { CalendarIcon, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  value: Date | null
  hasTime: boolean
  onChange: (date: Date | null, hasTime: boolean) => void
  placeholder?: string
  disabled?: boolean
}

export function DateTimePicker({
  value,
  hasTime,
  onChange,
  placeholder = 'בחר תאריך...',
  disabled,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)

  // Local draft state while popover is open
  const [draftDate, setDraftDate] = useState<Date | undefined>(value ?? undefined)
  const [draftHasTime, setDraftHasTime] = useState(hasTime)
  const [hours, setHours] = useState(value ? String(value.getHours()).padStart(2, '0') : '09')
  const [minutes, setMinutes] = useState(value ? String(value.getMinutes()).padStart(2, '0') : '00')

  // Sync draft when popover opens
  useEffect(() => {
    if (open) {
      const v = value ? new Date(value) : undefined
      setDraftDate(v)
      setDraftHasTime(hasTime)
      setHours(v ? String(v.getHours()).padStart(2, '0') : '09')
      setMinutes(v ? String(v.getMinutes()).padStart(2, '0') : '00')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleConfirm() {
    if (!draftDate) {
      onChange(null, false)
    } else {
      const result = new Date(draftDate)
      if (draftHasTime) {
        result.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0)
      } else {
        result.setHours(0, 0, 0, 0)
      }
      onChange(result, draftHasTime)
    }
    setOpen(false)
  }

  function handleClear() {
    onChange(null, false)
    setOpen(false)
  }

  // Display label on the trigger button
  let label: string | null = null
  if (value) {
    const d = new Date(value)
    if (hasTime) {
      label = format(d, "dd/MM/yyyy 'בשעה' HH:mm", { locale: he })
    } else {
      label = format(d, 'dd/MM/yyyy', { locale: he })
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors',
          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !label && 'text-muted-foreground'
        )}
      >
        <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
        {label ?? placeholder}
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-0"
        align="start"
        side="bottom"
      >
        {/* Calendar */}
        <div dir="rtl">
          <Calendar
            mode="single"
            selected={draftDate}
            onSelect={setDraftDate}
            locale={he}
          />

          {/* Time toggle + inputs */}
          <div className="border-t px-3 py-2.5 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded accent-primary"
                checked={draftHasTime}
                onChange={e => setDraftHasTime(e.target.checked)}
              />
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">כולל שעה</span>
            </label>

            {draftHasTime && (
              <div className="flex items-center gap-1.5 pr-5">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hours}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '').slice(-2)
                    setHours(raw || '00')
                  }}
                  className="w-12 text-center text-sm border rounded px-1 py-0.5 bg-background"
                  placeholder="שע"
                />
                <span className="text-muted-foreground font-medium">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '').slice(-2)
                    setMinutes(raw || '00')
                  }}
                  className="w-12 text-center text-sm border rounded px-1 py-0.5 bg-background"
                  placeholder="דק"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-3 py-2 flex items-center justify-between gap-2">
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
              הסר תאריך
            </button>
            <Button size="sm" onClick={handleConfirm} disabled={!draftDate}>
              אישור
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
