---
title: פריסה (Vercel)
aliases:
  - Deployment
  - Vercel
  - Production
  - Vercel Cron
tags:
  - meta
  - deployment
  - vercel
  - project/club2030
---

# פריסה — Vercel + Vercel Postgres

האפליקציה רצה בפרודקשן על **Vercel**, עם **Vercel Postgres (Neon)** כמסד נתונים והדייג'סט היומי מתוזמן דרך **Vercel Cron**.

> [!warning] למה לא SQLite
> ה-filesystem של Vercel serverless הוא read-only ו-`/tmp` אפמרלי — קובץ `dev.db` לא שורד. לכן המעבר ל-PostgreSQL מנוהל. ראה [[מודל נתונים]].

## מסד נתונים

- Provider: `postgresql` ב-`prisma/schema.prisma`.
- `url = env("POSTGRES_PRISMA_URL")` — חיבור pooled ל-runtime (serverless).
- `directUrl = env("POSTGRES_URL_NON_POOLING")` — חיבור ישיר למיגרציות.
- שני המשתנים מוזרקים אוטומטית ע"י אינטגרציית Vercel Postgres.
- המיגרציות ב-`prisma/migrations/` נוצרו מחדש עבור Postgres (init יחיד).

## תזמון — Vercel Cron

`vercel.json`:

```json
{
  "crons": [{ "path": "/api/whatsapp/digest", "schedule": "0 5 * * *" }]
}
```

- `0 5 * * *` = **05:00 UTC** = **08:00 שעון קיץ (IDT)** / 07:00 שעון חורף (IST). Vercel Cron רץ ב-UTC ואינו מטפל ב-DST.
- Vercel מוסיף אוטומטית `Authorization: Bearer ${CRON_SECRET}` כאשר `CRON_SECRET` מוגדר ב-env. ה-route `/api/whatsapp/digest` מאמת header זה. ראה [[וואטסאפ (Green API)]].
- ב-Hobby plan: עד 2 crons, granularity יומי, וייתכן עיכוב של דקות — מקובל לדייג'סט.

## Build

`package.json`:

```
"build": "prisma generate && prisma migrate deploy && next build"
"postinstall": "prisma generate"
```

- `prisma generate` — הכרחי כי `node_modules` נבנה מחדש בכל deploy.
- `prisma migrate deploy` — מחיל מיגרציות על ה-DB (משתמש ב-`POSTGRES_URL_NON_POOLING`).
- כל הדפים עם נתוני DB הם `force-dynamic` (כולל `/dashboard`) — אין גישה ל-DB בזמן build.

## משתני סביבה ב-Vercel

| משתנה | מקור |
|-------|------|
| `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` | אוטומטי מאינטגרציית Vercel Postgres |
| `APP_USERNAME`, `APP_PASSWORD`, `SESSION_SECRET` | ידני (אימות) |
| `GREEN_API_INSTANCE`, `GREEN_API_TOKEN`, `MY_WHATSAPP_CHAT_ID` | ידני (WhatsApp) |
| `GREEN_API_BASE_URL` | אופציונלי (ברירת מחדל `https://api.green-api.com`) |
| `CRON_SECRET` | ידני — מפעיל את הגנת ה-cron |
| `WHATSAPP_WEBHOOK_TOKEN` | ידני — **חובה** להפעלת ה-webhook (בלעדיו 503) |
| `ANTHROPIC_API_KEY` | ידני — שיחה חופשית עם Claude (חסר → fallback מילות מפתח) |
| `ANTHROPIC_MODEL` | אופציונלי (ברירת מחדל `claude-haiku-4-5-20251001`) |

> [!warning] אבטחה
> אין להכניס סודות ל-`vercel.json` (מקומיט). ה-`CRON_SECRET` נמסר ל-cron דרך header אוטומטי, לא דרך ה-URL.

## Runbook — פריסה ראשונה

1. `vercel link` (או ייבוא הריפו בדשבורד Vercel).
2. Storage → צור **Postgres** וחבר לפרויקט → המשתנים `POSTGRES_*` נוספים אוטומטית.
3. הגדר את שאר משתני הסביבה (טבלה למעלה) ב-Project Settings → Environment Variables (Production).
4. פיתוח מקומי: `vercel env pull .env` כדי למשוך את חיבור ה-Postgres.
5. Deploy. ה-build מריץ `prisma migrate deploy` ויוצר את הטבלאות.
6. **Webhook נכנס:** ב-[console.green-api.com](https://console.green-api.com) הגדר `webhookUrl` = `https://<app>.vercel.app/api/whatsapp/webhook?token=<WHATSAPP_WEBHOOK_TOKEN>` והפעל Incoming webhooks. (בפרודקשן אין צורך ב-ngrok.)
7. בדיקה: קרא ידנית ל-`/api/whatsapp/digest` עם ה-`CRON_SECRET`, ושלח הודעת WhatsApp לבדיקת ה-webhook.

## הגירת נתונים קיימים (אופציונלי)

הנתונים ב-SQLite המקומי (`prisma/dev.db`) אינם עוברים אוטומטית ל-Postgres. אם צריך — יש לייצא/לייבא ידנית (למשל סקריפט קריאה מ-SQLite וכתיבה דרך Prisma ל-Postgres). אחרת מתחילים נקי.

## ראה גם

- [[וואטסאפ (Green API)]] · [[מודל נתונים]] · [[התחברות]]
- חזרה ל-[[בית]]
