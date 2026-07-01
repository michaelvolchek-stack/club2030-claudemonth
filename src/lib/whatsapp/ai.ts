// Natural-language understanding for inbound WhatsApp messages, powered by the
// Claude (Anthropic) Messages API with tool use. When ANTHROPIC_API_KEY is set,
// respond.ts routes messages here instead of the keyword parser (commands.ts),
// so the user can talk to the bot in free Hebrew.
//
// Config lives in .env (never committed):
//   ANTHROPIC_API_KEY  – required to enable the AI path
//   ANTHROPIC_MODEL    – optional, defaults to claude-3-5-haiku-latest

import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Priority } from '@/types'
import {
  listTodayText,
  completeByQuery,
  cancelByQuery,
  createTaskStructured,
} from './commands'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-3-5-haiku-latest'

/** True when the Claude API key is present. */
export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'list_today',
    description: 'הצגת כל המשימות הפתוחות של היום (באיחור, מתוכננות להיום, ויעד היום).',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'create_task',
    description: 'יצירת משימה חדשה עבור המשתמש.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'כותרת המשימה בלבד — בלי תאריך, עדיפות, תגית או מילות פתיחה כמו "תזכיר לי".',
        },
        due_date: {
          type: 'string',
          description:
            'תאריך יעד בפורמט ISO 8601: "YYYY-MM-DD" לתאריך בלבד, או "YYYY-MM-DDTHH:mm" עם שעה. השמט אם אין תאריך.',
        },
        has_time: { type: 'boolean', description: 'true אם ל-due_date יש שעה מדויקת.' },
        priority: {
          type: 'string',
          enum: ['URGENT', 'HIGH', 'MEDIUM', 'LOW'],
          description: 'עדיפות המשימה. ברירת מחדל MEDIUM.',
        },
        project: { type: 'string', description: 'שם פרויקט קיים, אם המשתמש ציין.' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'שמות תגיות שהמשתמש ציין (בלי הסימן #).',
        },
      },
      required: ['title'],
      additionalProperties: false,
    },
  },
  {
    name: 'complete_task',
    description: 'סימון משימה קיימת כהושלמה, לפי טקסט חיפוש בכותרת.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'מילים מתוך כותרת המשימה לזיהוי.' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'cancel_task',
    description: 'ביטול משימה קיימת, לפי טקסט חיפוש בכותרת.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'מילים מתוך כותרת המשימה לזיהוי.' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
]

function systemPrompt(today: string): string {
  return `אתה עוזר משימות אישי בעברית שמתקשר עם המשתמש דרך וואטסאפ. המשתמש כותב בשפה חופשית ואתה מבין מה הוא רוצה ומפעיל את הכלים שברשותך.

היום: ${today}.
חשב תאריכים יחסיים ("מחר", "יום ראשון הבא", "בעוד שבוע", "היום בערב") ביחס לתאריך זה, והחזר due_date בפורמט ISO 8601.

כללים:
- ליצירת משימה — create_task. אל תכלול בכותרת מילות פתיחה ("תוסיף", "תזכיר לי", "צריך") או את התאריך/העדיפות/התגית.
- לסגירת/השלמת משימה — complete_task עם מילות חיפוש קצרות מהכותרת.
- לביטול משימה — cancel_task.
- לבקשה לראות את משימות היום — list_today.
- אם צוינה שעה מפורשת, קבע has_time=true.
- אם הבקשה לא ברורה או שאינה קשורה למשימות, השב בטקסט קצר ומנומס בעברית ובקש הבהרה. אל תמציא משימות ואל תפעיל כלי כשאינך בטוח.`
}

// ─── Tool execution ───────────────────────────────────────────────────────────

interface ToolInput {
  query?: unknown
  title?: unknown
  due_date?: unknown
  has_time?: unknown
  priority?: unknown
  project?: unknown
  tags?: unknown
}

const PRIORITIES: Priority[] = [Priority.URGENT, Priority.HIGH, Priority.MEDIUM, Priority.LOW]

function toDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

async function runTool(name: string, input: ToolInput): Promise<string> {
  switch (name) {
    case 'list_today':
      return listTodayText()
    case 'complete_task':
      return completeByQuery(String(input.query ?? ''))
    case 'cancel_task':
      return cancelByQuery(String(input.query ?? ''))
    case 'create_task':
      return createTaskStructured({
        title: String(input.title ?? ''),
        dueDate: toDate(input.due_date),
        dueHasTime: Boolean(input.has_time),
        priority: PRIORITIES.includes(input.priority as Priority)
          ? (input.priority as Priority)
          : undefined,
        projectName: typeof input.project === 'string' ? input.project : undefined,
        tagNames: Array.isArray(input.tags) ? input.tags.map(String) : [],
      })
    default:
      return ''
  }
}

// ─── Anthropic API response shapes (subset) ───────────────────────────────────

interface ContentBlock {
  type: string
  text?: string
  name?: string
  input?: ToolInput
}

interface MessagesResponse {
  content?: ContentBlock[]
}

/**
 * Sends the user's message to Claude with the task tools, executes whatever
 * tool the model invokes, and returns the Hebrew reply. Falls back to Claude's
 * plain-text answer when no tool is used. Throws on API failure so respond.ts
 * can fall back to the keyword parser.
 */
export async function interpretAndAct(text: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing')

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL
  const today = format(new Date(), "yyyy-MM-dd (EEEE)", { locale: he })

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt(today),
      tools: TOOLS,
      messages: [{ role: 'user', content: text }],
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Anthropic API failed: ${res.status} ${body}`)
  }

  const data = (await res.json()) as MessagesResponse
  const blocks = data.content ?? []

  const results: string[] = []
  let textReply = ''
  for (const b of blocks) {
    if (b.type === 'tool_use' && b.name) {
      results.push(await runTool(b.name, b.input ?? {}))
    } else if (b.type === 'text' && b.text?.trim()) {
      textReply = b.text.trim()
    }
  }

  const combined = results.filter(Boolean).join('\n\n')
  if (combined) return combined
  return textReply || 'לא הבנתי את הבקשה. שלחו "עזרה" לרשימת הפקודות.'
}
