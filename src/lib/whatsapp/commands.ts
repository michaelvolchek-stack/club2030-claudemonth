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

// ─── Entry point ────────────────────────────────────────────────────────────

/**
 * Parses a free-text Hebrew WhatsApp message and performs the matching action.
 * Returns the reply text to send back to the user.
 */
export async function handleIncomingMessage(text: string): Promise<string> {
  const body = text.trim()
  if (!body) return 'לא קיבלתי טקסט. שלחו "עזרה" לרשימת הפקודות.'

  // Help
  if (HELP_KEYWORDS.includes(body.toLowerCase())) return HELP_TEXT

  // List today's tasks
  if (LIST_KEYWORDS.includes(body)) return buildDailyDigest()

  // Complete a task
  const completeQuery = stripPrefix(body, COMPLETE_KEYWORDS)
  if (completeQuery !== null) {
    if (!completeQuery) return 'איזו משימה לסגור? כתבו: סגור <שם המשימה>'
    const matches = await findActiveTasksByText(completeQuery)
    if (matches.length === 0) return `לא מצאתי משימה פעילה שמכילה "${completeQuery}".`
    if (matches.length > 1) {
      return 'נמצאו כמה משימות — פרטו יותר:\n' + matches.map(t => `• ${t.title}`).join('\n')
    }
    await completeTask(matches[0].id)
    return `✅ סומן כהושלם: ${matches[0].title}`
  }

  // Cancel a task
  const cancelQuery = stripPrefix(body, CANCEL_KEYWORDS)
  if (cancelQuery !== null) {
    if (!cancelQuery) return 'איזו משימה לבטל? כתבו: בטל <שם המשימה>'
    const matches = await findActiveTasksByText(cancelQuery)
    if (matches.length === 0) return `לא מצאתי משימה פעילה שמכילה "${cancelQuery}".`
    if (matches.length > 1) {
      return 'נמצאו כמה משימות — פרטו יותר:\n' + matches.map(t => `• ${t.title}`).join('\n')
    }
    await updateTask(matches[0].id, { status: TaskStatus.CANCELLED })
    return `🚫 בוטלה: ${matches[0].title}`
  }

  // Default → create a new task via the Hebrew Quick Add parser
  return createTaskFromText(body)
}

// ─── Task creation (reuses the Quick Add parser) ──────────────────────────────

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

async function createTaskFromText(text: string): Promise<string> {
  const parsed = await parseQuickAdd(text)

  // Resolve project name → id
  let projectId: string | undefined
  if (parsed.projectName) {
    const flat = flattenProjects((await getProjectTree()) as unknown as ProjectNode[])
    projectId = flat.find(p => p.name.toLowerCase() === parsed.projectName!.toLowerCase())?.id
  }

  // Resolve tag names → ids
  let tagIds: string[] = []
  if (parsed.tagNames.length) {
    const allTags = await getTags()
    tagIds = parsed.tagNames
      .map(name => allTags.find(t => t.name.toLowerCase() === name.toLowerCase())?.id)
      .filter(Boolean) as string[]
  }

  await createTask({
    title: parsed.title,
    priority: parsed.priority,
    dueDate: parsed.dueDate ?? null,
    dueHasTime: parsed.dueHasTime,
    plannedDate: parsed.plannedDate ?? null,
    projectId,
    tagIds,
  })

  const bits: string[] = [`✅ נוספה משימה: ${parsed.title}`]
  if (parsed.dueDate) {
    bits.push(
      parsed.dueHasTime
        ? `🗓️ ${format(parsed.dueDate, "dd/MM 'בשעה' HH:mm", { locale: he })}`
        : `🗓️ ${format(parsed.dueDate, 'dd/MM/yyyy', { locale: he })}`
    )
  }
  if (parsed.priority !== Priority.MEDIUM) bits.push(`עדיפות: ${PRIORITY_LABELS[parsed.priority]}`)
  if (parsed.projectName) bits.push(`#${parsed.projectName}`)
  return bits.join('\n')
}
