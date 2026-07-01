# CLAUDE.md — מערכת ניהול משימות אישית

> קובץ זה נטען בכל סשן — הוא מכיל רק מה שתמידי ולא-נגזר מהקוד.
> תיעוד מלא (ארכיטקטורה, מודל נתונים, פיצ'רים) חי ב-`Vault/` והוא **מקור-האמת היחיד**.
> לפני עבודה על נושא ספציפי, קרא את ה-note הרלוונטי שם.

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
| DB | PostgreSQL (Vercel/Neon) via Prisma 5 |
| Deploy | Vercel + Vercel Cron (דייג'סט יומי) |
| Styling | Tailwind CSS + shadcn/ui (Base UI) |
| Language | TypeScript (strict) |
| RTL | Hebrew, `dir="rtl"` on `<html>` |

## מפת קוד (התמצאות מהירה)

- `src/app/(app)/` — דפים: `today` `week` `all` `search` `dashboard` `project/[id]`
- `src/components/` — רכיבי UI (`ui/` = shadcn); לוגיקת layout ב-`AppShell.tsx`
- `src/lib/actions/` — Server Actions: `tasks` `projects` `tags` `subtasks` `quickAdd` `dashboard`
- `src/types/index.ts` — `TaskStatus`, `Priority`, `TaskWithRelations` (תבנית `as const`)

> את העץ המלא והתפקיד של כל רכיב ראה ב-`Vault/ארכיטקטורה/`. אל תשכפל אותו לכאן — הוא מתיישן.

## נושאים בעומק — ב-Vault

| נושא | note |
|------|------|
| ארכיטקטורה כללית | `Vault/ארכיטקטורה/סקירת ארכיטקטורה.md` |
| מודל נתונים + מיגרציות | `Vault/ארכיטקטורה/מודל נתונים.md` |
| Server Actions | `Vault/ארכיטקטורה/Server Actions.md` |
| רכיבים ותפקידם | `Vault/ארכיטקטורה/רכיבים.md` |
| דפים וניווט + קיצורי מקלדת | `Vault/ארכיטקטורה/דפים וניווט.md` |
| Quick Add (פורמט + כל הטוקנים) | `Vault/תכונות/Quick Add.md` |
| משימות חוזרות | `Vault/תכונות/משימות חוזרות.md` |
| חיפוש וסינון | `Vault/תכונות/חיפוש וסינון.md` |

## דפוסים חשובים (gotchas — לא נגזרים מהקוד)

### enum כ-String + תבנית `as const`
שדות ה-enum (`status`, `priority`) הם `String` ב-DB — לא Prisma enum — עם תבנית `as const` ב-`src/types/index.ts`. הדפוס נשמר גם אחרי המעבר ל-PostgreSQL כדי לא לשבור טיפוסים קיימים.

### PostgreSQL על Vercel (serverless)
ה-schema משתמש ב-`POSTGRES_PRISMA_URL` (pooled, ל-app) ו-`POSTGRES_URL_NON_POOLING` (`directUrl`, למיגרציות) — שני משתנים ש-Vercel Postgres מזריק אוטומטית. פיתוח מקומי: `vercel env pull .env`. פרטים ב-`Vault/מטא/פריסה (Vercel).md`.

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

## סנכרון תיעוד

שינוי ב-`src/` או `prisma/` שמשפיע על ארכיטקטורה/מודל/פיצ'רים — עדכן את ה-note המתאים ב-`Vault/`.
משימה זו מתאימה לסאב-אג'נט `vault-doc-sync` (ראה `.claude/agents/`).
