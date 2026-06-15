---
title: Phase 2 - WhatsApp
aliases:
  - WhatsApp
  - תזכורות
tags:
  - meta
  - roadmap
  - phase-2
  - project/club2030
---

# Phase 2 — תזכורות WhatsApp

> [!todo] סטטוס: הסכמה מוכנה, הפיצ'ר טרם מומש
> שתי הטבלאות קיימות ב-`prisma/schema.prisma` אך אין מימוש לוגיקה/UI עדיין.

## טבלאות מוכנות

> [!abstract] WhatsAppReminder
> `id, taskId, scheduledAt, sentAt?, status (PENDING|SENT|FAILED), instanceId`
> תזכורת יוצאת המקושרת ל-[[מודל נתונים#Task — לב המערכת|Task]] (`onDelete: Cascade`).

> [!abstract] WhatsAppIncoming
> `id, fromNumber, body, receivedAt, processedAt?, taskId?`
> הודעה נכנסת — אופציונלית מקושרת למשימה.

## כיוון עתידי

- תזמון תזכורות לפי `dueDate`/`plannedDate` של המשימה
- יצירת/עדכון משימות מהודעות נכנסות
- `ReminderStatus` כבר מוגדר ב-`src/types/index.ts`

## ראה גם

- [[מודל נתונים]] · חזרה ל-[[בית]]
