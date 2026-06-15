---
title: Tech Stack ופקודות
aliases:
  - Tech Stack
  - פקודות
  - Commands
tags:
  - meta
  - tooling
  - project/club2030
---

# Tech Stack, פקודות וקיצורים

## Stack

| שכבה | טכנולוגיה |
|------|-----------|
| Framework | Next.js 14 App Router |
| DB | SQLite via Prisma 5 |
| Styling | Tailwind CSS + shadcn/ui (Base UI) |
| Language | TypeScript (strict) |
| RTL | עברית, `dir="rtl"` על `<html>` |

## פקודות בסיס

```bash
npm run dev          # שרת פיתוח על פורט 3000
npm run build        # בנייה לפרודקשן
npm run lint         # ESLint
npx prisma studio    # ממשק ויזואלי ל-DB
npx prisma migrate dev --name <name>  # מיגרציה חדשה
npx prisma generate  # רגנרציה של Prisma client
```

> [!warning] PATH מקומי
> ה-CLI של `claude`, `npm`, `gh` לא בהכרח זמינים ב-PATH של המשתמש — בפעולות אוטומציה עדיף `git` ו-`bash` בלבד.

## קיצורי מקלדת

| מקש | פעולה |
|-----|-------|
| `N` | פוקוס על [[Quick Add]] |
| `Escape` | סגירת פאנל / חיפוש / Quick Add |

מנוהלים ב-[[רכיבים#ליבה (Layout)|AppShell]].

## ESM packages

```js
// next.config.mjs — חבילות ESM-only צריכות transpile
transpilePackages: ['react-day-picker']
```

## ראה גם

- [[סקירת ארכיטקטורה]] · חזרה ל-[[בית]]
