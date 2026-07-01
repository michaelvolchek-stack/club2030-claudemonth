---
title: Server Actions
aliases:
  - Actions
  - פעולות שרת
tags:
  - architecture
  - server-actions
  - project/club2030
---

# Server Actions

כל הגישה לנתונים. ממוקמות ב-`src/lib/actions/`. ניתן לייבא אותן ישירות ל-Client Components ולהריץ בתוך `startTransition`.

> [!info] singleton Prisma
> כל ה-actions משתמשות ב-`src/lib/prisma.ts` — מופע יחיד של `PrismaClient` (מונע ריבוי חיבורים ב-dev hot-reload).

## `tasks.ts` — משימות

| פעולה | תיאור |
|-------|-------|
| `createTask(data)` | יצירת משימה → `TaskWithRelations` |
| `updateTask(id, data)` | עדכון + רישום ל-[[מודל נתונים#TaskHistory]] |
| `completeTask(id)` | סימון כהושלם |
| `deleteTask(id)` | מחיקה |
| `getTaskById(id)` | שליפה בודדת מלאה |
| `getTasks(filters, sort)` | שליפה עם [[חיפוש וסינון]] |
| `getTodayTasks()` | מתוכנן / יעד / overdue להיום → [[דפים וניווט#today]] |
| `getWeekTasks()` | 7 ימים + overdue → [[דפים וניווט#week]] |
| `reorderTasks(ids, projectId?)` | מיון ידני (drag-and-drop) |
| `searchTasks(query)` | חיפוש live → [[חיפוש וסינון]] |

## `projects.ts` — פרויקטים

`createProject` · `updateProject` · `deleteProject` · `getProjectTree()` — מחזיר `ProjectWithChildren[]` (עץ היררכי עם `_count.tasks`).

## `tags.ts` — תגיות

`getTags` · `createTag` · `updateTag` · `deleteTag`.

## `subtasks.ts` — פריטי צ'קליסט

`addSubTask(taskId, title)` · `toggleSubTask(id)` · `reorderSubTasks(taskId, orderedIds)` · `deleteSubTask(id)`.

## `quickAdd.ts` — ניתוח שפה טבעית

`parseQuickAdd(text)` → `QuickAddResult`. פירוט מלא ב-[[Quick Add]].

## `dashboard.ts` — לוח מחוונים

`getDashboardData()` → `DashboardData` (סטטיסטיקות). ראה [[Dashboard]].

## `auth.ts` — אימות משתמש

| פעולה | תיאור |
|-------|-------|
| `login(prevState, formData)` | מאמת מול `APP_USERNAME` / `APP_PASSWORD` ב-.env; מציב cookie `tm_session` (httpOnly); מפנה ל-`/today` בהצלחה |
| `logout()` | מוחק את ה-cookie `tm_session`; מפנה ל-`/login` |

> [!info] ספריית העזר `src/lib/auth.ts`
> כוללת: `createSessionToken` / `verifySessionToken` (HMAC-SHA256, Web Crypto — תואם edge ו-node) ו-`credentialsValid`. הקבועים `SESSION_COOKIE='tm_session'` ו-`SESSION_MAX_AGE` מוגדרים שם. ראה [[התחברות]] לפירוט מלא.

> [!warning] revalidatePath
> פעולות כתיבה מרעננות במפורש את `/all`, `/today`, `/week` (ולא `'/', 'layout'`). ראה [[סקירת ארכיטקטורה#revalidatePath — דפוס חשוב]].

## ראה גם

- [[מודל נתונים]] · [[רכיבים]] · חזרה ל-[[בית]]
