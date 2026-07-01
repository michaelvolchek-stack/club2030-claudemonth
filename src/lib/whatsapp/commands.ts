import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { prisma } from '@/lib/prisma'
import { parseQuickAdd } from '@/lib/actions/quickAdd'
import { createTask, completeTask, updateTask } from '@/lib/actions/tasks'
import { getTags } from '@/lib/actions/tags'
import { getProjectTree } from '@/lib/actions/projects'
import { TaskStatus, Priority, PRIORITY_LABELS } from '@/types'
import { buildDailyDigest } from './digest'

// ─── Intent keywords ──────────────────────────────────────────────────────────

const COMPLETE_KEYWORDS = ['סגור', 'סגרתי', 'בוצע', 'בוצעה', 'סיימתי', 'השלם', 'השלמתי', 'עשיתי']
const CANCEL_KEYWORDS = ['בטל', 'ביטול', 'מבטל']
const LIST_KEYWORDS = ['משימות', 'רשימה', 'היום', 'מה יש לי', 'מה יש', 'מה נשאר']
const HELP_KEYWORDS = ['עזרה', 'help', '?', 'פקודות']

const HELP_TEXT = `📋 *עוזר המשימות*

• *רשימת היום* — כתבו: משימות / היום
• *משימה חדשה* — פשוט תכתבו אותה, למשל:
  "לפגוש יעל מחר בבוקר !1 #עבודה"
• *השלמת משימה* — סגור <שם>
  למשל: סגור לשלם חשבון
• *ביטול משימה* — בטל <שם>
• *עזרה* — הצגת הודעה זו`

/**
 * If the text starts with one of the keywords, returns the remaining text
 * (which may be empty when the keyword is the whole message). Otherwise null.
 */
function stripPrefix(text: string, keywords: string[]): string | null {
  const trimmed = text.trim()
  for (const kw of keywords) {
    if (trimmed === kw) return ''
    if (trimmed.startsWith(kw + ' ')) return trimmed.slice(kw.length).trim()
  }
  return null
}

async function findActiveTasksByText(query: string) {
  const q = query.trim()
  if (!q) return []
  return prisma.task.findMany({
    where: {
      parentTaskId: null,
      status: { in: [TaskStatus.ACTIVE, TaskStatus.DRAFT] },
      title: { contains: q },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
}

// ─── Executors ────────────────────────────────────────────────────────────────
// Shared, side-effecting building blocks. Reused by both the keyword router
// (handleIncomingMessage) and the Claude-driven path (ai.ts). Each returns the
// Hebrew reply string to send back to the user.

/** Today's open tasks, formatted as the daily digest. */
export function listTodayText(): Promise<string> {
  return buildDailyDigest()
}

/** Mark a single matching active task as completed. */
export async function completeByQuery(query: string): Promise<string> {
  const q = query.trim()
  if (!q) return 'איזו משימה לסגור? כתבו: סגור <שם המשימה>'
  const matches = await findActiveTasksByText(q)
  if (matches.length === 0) return `לא מצאתי משימה פעילה שמכילה "${q}".`
  if (matches.length > 1) {
    return 'נמצאו כמה משימות — פרטו יותר:\n' + matches.map(t => `• ${t.title}`).join('\n')
  }
  await completeTask(matches[0].id)
  return `✅ סומן כהושלם: ${matches[0].title}`
}

/** Cancel a single matching active task. */
export async function cancelByQuery(query: string): Promise<string> {
  const q = query.trim()
  if (!q) return 'איזו משימה לבטל? כתבו: בטל <שם המשימה>'
  const matches = await findActiveTasksByText(q)
  if (matches.length === 0) return `לא מצאתי משימה פעילה שמכילה "${q}".`
  if (matches.length > 1) {
    return 'נמצאו כמה משימות — פרטו יותר:\n' + matches.map(t => `• ${t.title}`).join('\n')
  }
  await updateTask(matches[0].id, { status: TaskStatus.CANCELLED })
  return `🚫 בוטלה: ${matches[0].title}`
}

export interface StructuredTask {
  title: string
  dueDate?: Date | null
  dueHasTime?: boolean
  plannedDate?: Date | null
  priority?: Priority
  projectName?: string
  tagNames?: string[]
}

interface ProjectNode {
  id: string
  name: string
  children?: ProjectNode[]
}

function flattenProjects(nodes: ProjectNode[], out: { id: string; name: string }[] = []) {
  for (const n of nodes) {
    out.push({ id: n.id, name: n.name })
    if (n.children?.length) flattenProjects(n.children, out)
  }
  return out
}

/**
 * Create a task from an already-structured input (title, due date, priority,
 * project + tag *names*). Resolves project/tag names to ids. Returns the
 * confirmation reply.
 */
export async function createTaskStructured(input: StructuredTask): Promise<string> {
  const title = input.title.trim()
  if (!title) return 'לא הבנתי איזו משימה ליצור.'

  const priority = input.priority ?? Priority.MEDIUM

  // Resolve project name → id
  let projectId: string | undefined
  if (input.projectName) {
    const flat = flattenProjects((await getProjectTree()) as unknown as ProjectNode[])
    projectId = flat.find(p => p.name.toLowerCase() === input.projectName!.toLowerCase())?.id
  }

  // Resolve tag names → ids
  let tagIds: string[] = []
  if (input.tagNames?.length) {
    const allTags = await getTags()
    tagIds = input.tagNames
      .map(name => allTags.find(t => t.name.toLowerCase() === name.toLowerCase())?.id)
      .filter(Boolean) as string[]
  }

  await createTask({
    title,
    priority,
    dueDate: input.dueDate ?? null,
    dueHasTime: input.dueHasTime ?? false,
    plannedDate: input.plannedDate ?? null,
    projectId,
    tagIds,
  })

  const bits: string[] = [`✅ נוספה משימה: ${title}`]
  if (input.dueDate) {
    bits.push(
      input.dueHasTime
        ? `🗓️ ${format(input.dueDate, "dd/MM 'בשעה' HH:mm", { locale: he })}`
        : `🗓️ ${format(input.dueDate, 'dd/MM/yyyy', { locale: he })}`
    )
  }
  if (priority !== Priority.MEDIUM) bits.push(`עדיפות: ${PRIORITY_LABELS[priority]}`)
  if (input.projectName) bits.push(`#${input.projectName}`)
  return bits.join('\n')
}

/** Create a task from free text via the Hebrew Quick Add parser. */
async function createTaskFromText(text: string): Promise<string> {
  const parsed = await parseQuickAdd(text)
  return createTaskStructured({
    title: parsed.title,
    priority: parsed.priority,
    dueDate: parsed.dueDate ?? null,
    dueHasTime: parsed.dueHasTime,
    plannedDate: parsed.plannedDate ?? null,
    projectName: parsed.projectName,
    tagNames: parsed.tagNames,
  })
}

// ─── Keyword router (fallback when Claude is not configured) ──────────────────

/**
 * Parses a free-text Hebrew WhatsApp message using keyword heuristics and
 * performs the matching action. Used as a fallback when ANTHROPIC_API_KEY is
 * absent (see respond.ts). Returns the reply text to send back to the user.
 */
export async function handleIncomingMessage(text: string): Promise<string> {
  const body = text.trim()
  if (!body) return 'לא קיבלתי טקסט. שלחו "עזרה" לרשימת הפקודות.'

  // Help
  if (HELP_KEYWORDS.includes(body.toLowerCase())) return HELP_TEXT

  // List today's tasks
  if (LIST_KEYWORDS.includes(body)) return listTodayText()

  // Complete a task
  const completeQuery = stripPrefix(body, COMPLETE_KEYWORDS)
  if (completeQuery !== null) return completeByQuery(completeQuery)

  // Cancel a task
  const cancelQuery = stripPrefix(body, CANCEL_KEYWORDS)
  if (cancelQuery !== null) return cancelByQuery(cancelQuery)

  // Default → create a new task via the Hebrew Quick Add parser
  return createTaskFromText(body)
}
