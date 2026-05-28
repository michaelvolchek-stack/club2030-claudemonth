'use server'

import { Priority, QuickAddResult } from '@/types'

// ─── Hebrew date keywords ─────────────────────────────────────────────────────

const MORNING_HOUR = 9
const NOON_HOUR = 13
const EVENING_HOUR = 19
const NIGHT_HOUR = 22

function resolveTimeKeyword(word: string): { hour: number; minute: number } | null {
  const map: Record<string, { hour: number; minute: number }> = {
    בבוקר: { hour: MORNING_HOUR, minute: 0 },
    בצהריים: { hour: NOON_HOUR, minute: 0 },
    בערב: { hour: EVENING_HOUR, minute: 0 },
    בלילה: { hour: NIGHT_HOUR, minute: 0 },
  }
  return map[word] ?? null
}

const HEBREW_DAYS: Record<string, number> = {
  ראשון: 0,
  שני: 1,
  שלישי: 2,
  רביעי: 3,
  חמישי: 4,
  שישי: 5,
  שבת: 6,
}

const HEBREW_MONTHS: Record<string, number> = {
  ינואר: 0, פברואר: 1, מרץ: 2, אפריל: 3, מאי: 4, יוני: 5,
  יולי: 6, אוגוסט: 7, ספטמבר: 8, אוקטובר: 9, נובמבר: 10, דצמבר: 11,
}

function nextDayOfWeek(dayIndex: number): Date {
  const today = new Date()
  const todayDay = today.getDay()
  let diff = dayIndex - todayDay
  if (diff <= 0) diff += 7
  const d = new Date(today)
  d.setDate(today.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Parses Hebrew date expressions from a string.
 * Returns { date, hasTime, remainingText }
 */
function parseDateFromText(text: string): {
  date: Date | undefined
  hasTime: boolean
  remainingText: string
} {
  let remaining = text
  let date: Date | undefined
  let hasTime = false

  const now = new Date()

  // "בעוד X ימים/שבועות/חודשים" OR "בעוד שבוע/חודש/יום"
  const inMatch = remaining.match(/בעוד\s+(?:(\d+)\s+)?(ימים?|שבועות?|חודשים?|שבוע|חודש|יום)/)
  if (inMatch) {
    const n = inMatch[1] ? parseInt(inMatch[1]) : 1
    const unit = inMatch[2]
    date = new Date(now)
    if (unit.startsWith('י')) date.setDate(date.getDate() + n)
    else if (unit.startsWith('ש')) date.setDate(date.getDate() + n * 7)
    else if (unit.startsWith('ח')) date.setMonth(date.getMonth() + n)
    date.setHours(0, 0, 0, 0)
    remaining = remaining.replace(inMatch[0], '').trim()
  }

  // "ב-DD/MM" or "ב-DD.MM"
  if (!date) {
    const dmMatch = remaining.match(/ב-?(\d{1,2})[./](\d{1,2})/)
    if (dmMatch) {
      date = new Date(now.getFullYear(), parseInt(dmMatch[2]) - 1, parseInt(dmMatch[1]))
      if (date < now) date.setFullYear(date.getFullYear() + 1)
      date.setHours(0, 0, 0, 0)
      remaining = remaining.replace(dmMatch[0], '').trim()
    }
  }

  // "ב-DD בחודש"
  if (!date) {
    const dayMonthMatch = remaining.match(
      new RegExp(`ב-?(\\d{1,2})\\s+ב(${Object.keys(HEBREW_MONTHS).join('|')})`)
    )
    if (dayMonthMatch) {
      const day = parseInt(dayMonthMatch[1])
      const month = HEBREW_MONTHS[dayMonthMatch[2]]
      date = new Date(now.getFullYear(), month, day)
      if (date < now) date.setFullYear(date.getFullYear() + 1)
      date.setHours(0, 0, 0, 0)
      remaining = remaining.replace(dayMonthMatch[0], '').trim()
    }
  }

  // "ב-DD" (day of current/next month)
  if (!date) {
    const dayMatch = remaining.match(/ב-?(\d{1,2})(?!\s*[./])/)
    if (dayMatch) {
      const day = parseInt(dayMatch[1])
      date = new Date(now.getFullYear(), now.getMonth(), day)
      if (date <= now) date.setMonth(date.getMonth() + 1)
      date.setHours(0, 0, 0, 0)
      remaining = remaining.replace(dayMatch[0], '').trim()
    }
  }

  // "ביום ראשון/שני..." or "ביום ה..."
  if (!date) {
    const dayNameMatch = remaining.match(
      new RegExp(`ביום\\s+(ה?)?(${Object.keys(HEBREW_DAYS).join('|')})`)
    )
    if (dayNameMatch) {
      date = nextDayOfWeek(HEBREW_DAYS[dayNameMatch[2]])
      remaining = remaining.replace(dayNameMatch[0], '').trim()
    }
  }

  // Simple keywords
  if (!date) {
    if (/היום/.test(remaining)) {
      date = new Date(now)
      date.setHours(0, 0, 0, 0)
      remaining = remaining.replace(/היום/, '').trim()
    } else if (/מחרתיים/.test(remaining)) {
      date = new Date(now)
      date.setDate(date.getDate() + 2)
      date.setHours(0, 0, 0, 0)
      remaining = remaining.replace(/מחרתיים/, '').trim()
    } else if (/מחר/.test(remaining)) {
      date = new Date(now)
      date.setDate(date.getDate() + 1)
      date.setHours(0, 0, 0, 0)
      remaining = remaining.replace(/מחר/, '').trim()
    } else if (/השבוע/.test(remaining)) {
      date = new Date(now)
      date.setDate(date.getDate() + (7 - date.getDay()))
      date.setHours(0, 0, 0, 0)
      remaining = remaining.replace(/השבוע/, '').trim()
    }
  }

  // Time keywords (after date is found or independently)
  const timeKeywords = ['בבוקר', 'בצהריים', 'בערב', 'בלילה']
  for (const kw of timeKeywords) {
    if (remaining.includes(kw)) {
      const time = resolveTimeKeyword(kw)
      if (time) {
        if (!date) {
          date = new Date(now)
          date.setHours(0, 0, 0, 0)
        }
        date.setHours(time.hour, time.minute, 0, 0)
        hasTime = true
        remaining = remaining.replace(kw, '').trim()
      }
    }
  }

  // HH:MM format
  const timeMatch = remaining.match(/(\d{1,2}):(\d{2})/)
  if (timeMatch) {
    if (!date) {
      date = new Date(now)
      date.setHours(0, 0, 0, 0)
    }
    date.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0)
    hasTime = true
    remaining = remaining.replace(timeMatch[0], '').trim()
  }

  return { date, hasTime, remainingText: remaining }
}

/**
 * Parses a Quick Add string into a TaskInput.
 *
 * Format: "title [date] [!1-4] [#project] [@tag1] [@tag2]"
 *
 * Examples:
 *   "לפגוש יעל מחר בבוקר !1 #עבודה @פגישות"
 *   "לשלם חשבון !2 ב-5 ביוני"
 */
export async function parseQuickAdd(text: string): Promise<QuickAddResult> {
  let remaining = text.trim()

  // Extract priority: !1 !2 !3 !4
  let priority: Priority = Priority.MEDIUM
  const priorityMatch = remaining.match(/!([1-4])/)
  if (priorityMatch) {
    const map: Record<string, Priority> = {
      '1': Priority.URGENT,
      '2': Priority.HIGH,
      '3': Priority.MEDIUM,
      '4': Priority.LOW,
    }
    priority = map[priorityMatch[1]]
    remaining = remaining.replace(priorityMatch[0], '').trim()
  }

  // Extract project: #name (single project)
  let projectName: string | undefined
  const projectMatch = remaining.match(/#([֐-׿a-zA-Z0-9_-]+)/)
  if (projectMatch) {
    projectName = projectMatch[1]
    remaining = remaining.replace(projectMatch[0], '').trim()
  }

  // Extract tags: @name (multiple)
  const tagNames: string[] = []
  const tagRegex = /@([֐-׿a-zA-Z0-9_-]+)/g
  let tagMatch
  while ((tagMatch = tagRegex.exec(remaining)) !== null) {
    tagNames.push(tagMatch[1])
  }
  remaining = remaining.replace(/@[֐-׿a-zA-Z0-9_-]+/g, '').trim()

  // Extract date
  const { date, hasTime, remainingText } = parseDateFromText(remaining)
  remaining = remainingText

  // Clean up remaining whitespace
  const title = remaining.replace(/\s+/g, ' ').trim()

  return {
    title: title || text.trim(),
    dueDate: date,
    dueHasTime: hasTime,
    priority,
    projectName,
    tagNames,
  }
}
