# CLAUDE.md — מערכת ניהול משימות אישית

## פקודות בסיסיות

```bash
npm run dev          # שרת פיתוח על פורט 3000
npm run build        # בנייה לפרודקשן
npm run lint         # ESLint
npx prisma studio    # ממשק ויזואלי ל-DB
npx prisma migrate dev --name <name>  # מיגרציה חדשה
npx prisma generate  # רגנרציה של Prisma client
```

## Tech Stack

| שכבה | טכנולוגיה |
|------|-----------|
| Framework | Next.js 14 App Router |
| DB | SQLite via Prisma 5 |
| Styling | Tailwind CSS + shadcn/ui (Base UI) |
| Language | TypeScript (strict) |
| RTL | Hebrew, `dir="rtl"` on `<html>` |

## מבנה תיקיות

```
src/
├── app/
│   ├── layout.tsx              ← root layout (RTL, fonts, Toaster)
│   └── (app)/
│       ├── layout.tsx          ← fetches project tree, wraps in AppShell
│       ├── today/page.tsx      ← מתוכנן / יעד / overdue
│       ├── week/page.tsx       ← 7 ימים + overdue
│       ├── all/page.tsx        ← FilterBar + SortMenu (URL params)
│       ├── search/page.tsx     ← חיפוש live + highlight
│       └── project/[id]/page.tsx
├── components/
│   ├── AppShell.tsx            ← layout wrapper, keyboard shortcuts, mobile sidebar
│   ├── Sidebar.tsx             ← ניווט + ProjectTree + TagManager
│   ├── ProjectTree.tsx         ← עץ פרויקטים עם edit/delete hover
│   ├── ProjectDialog.tsx       ← create/edit project dialog
│   ├── ProjectHeader.tsx       ← כותרת עמוד פרויקט עם edit/delete
│   ├── TagManager.tsx          ← ניהול תגיות (dialog)
│   ├── TagSelector.tsx         ← multi-select תגיות בפאנל
│   ├── TaskViewClient.tsx      ← shared task list view (today/week)
│   ├── AllViewClient.tsx       ← /all עם FilterBar + SortMenu
│   ├── SearchViewClient.tsx    ← /search עם debounce + highlight
│   ├── TaskList.tsx            ← רשימת משימות
│   ├── TaskItem.tsx            ← שורת משימה
│   ├── TaskPanel.tsx           ← side-sheet עריכה מלאה
│   ├── QuickAddBar.tsx         ← Quick Add עם NLP preview
│   ├── DateTimePicker.tsx      ← calendar popover + time toggle
│   └── ui/                     ← shadcn components
├── lib/
│   ├── prisma.ts               ← singleton PrismaClient
│   └── actions/
│       ├── tasks.ts            ← CRUD + getTodayTasks/getWeekTasks/searchTasks
│       ├── projects.ts         ← CRUD + getProjectTree
│       ├── tags.ts             ← CRUD
│       ├── subtasks.ts         ← add/toggle/delete
│       └── quickAdd.ts         ← Hebrew NLP parser
└── types/
    └── index.ts                ← TaskStatus, Priority, TaskWithRelations, ...
```

## Quick Add — פורמט

```
"כותרת [תאריך] [!עדיפות] [#פרויקט] [@תגית] [~תכנון]"
```

| Token | משמעות | דוגמה |
|-------|--------|-------|
| `!1` | דחוף | `!1` |
| `!2` | גבוה | `!2` |
| `!3` | בינוני (ברירת מחדל) | `!3` |
| `!4` | נמוך | `!4` |
| `#name` | פרויקט | `#עבודה` |
| `@name` | תגית | `@פגישות` |
| `~date` | תאריך תכנון | `~היום` |
| `מחר` / `היום` / `מחרתיים` | תאריך יעד | `מחר` |
| `בעוד שבוע` / `בעוד 3 ימים` | יחסי | `בעוד שבוע` |
| `ביום שני` | יום בשבוע | `ביום שני` |
| `ב-15/6` | תאריך מוחלט | `ב-15/6` |
| `בבוקר` / `בצהריים` / `בערב` / `בלילה` | שעה | `בבוקר` → 09:00 |
| `HH:MM` | שעה מפורשת | `14:30` |

**דוגמאות:**
```
"לפגוש יעל מחר בבוקר !1 #עבודה @פגישות"
"לשלם חשבון !2 ב-5 ביוני"
"לכתוב דוח בעוד שבוע #עבודה ~מחר"
```

## Keyboard Shortcuts

| מקש | פעולה |
|-----|-------|
| `N` | פוקוס על Quick Add |
| `Escape` | סגירת פאנל / חיפוש / Quick Add |

## מודל DB

```prisma
Task        — id, title, status, priority, dueDate, dueHasTime, plannedDate,
              isRecurring, recurringRule (JSON), projectId, parentTaskId
Project     — id, name, color, parentId (self-relation היררכיה)
Tag         — id, name, color
TaskTag     — taskId, tagId (junction)
SubTask     — id, taskId, title, completed, order
TaskHistory — id, taskId, field, oldValue, newValue, changedAt
```

> **SQLite + Prisma 5:** אין enum support → שדות `String` עם TypeScript `as const` pattern.

## דפוסים חשובים

### Server Actions בclient components
```ts
// ✅ מותר — server actions ניתן לייבא ל-client components
import { createTask } from '@/lib/actions/tasks'
startTransition(async () => { await createTask(data) })
```

### revalidatePath
```ts
// ✅ נכון — לכל הדפים הרלוונטיים
revalidatePath('/all'); revalidatePath('/today'); revalidatePath('/week')
// ❌ לא — גורם ל-redirect מה-root
revalidatePath('/', 'layout')
```

### selectedTaskId pattern
```ts
// ✅ שמירת ID בלבד — TaskPanel מקבל נתונים טריים מה-server
const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
const selectedTask = allTasks.find(t => t.id === selectedTaskId) ?? null
```

### ESM packages
```js
// next.config.mjs — חבילות ESM-only צריכות transpile
transpilePackages: ['react-day-picker']
```
