---
title: Dashboard
aliases:
  - לוח מחוונים
  - סטטיסטיקות
tags:
  - feature
  - dashboard
  - project/club2030
---

# Dashboard — לוח מחוונים

דף `/dashboard` ([[דפים וניווט#dashboard]]) עם סטטיסטיקות וגרפי עמודות מבוססי CSS (ללא ספריית charts). הנתונים: [[Server Actions#dashboard.ts — לוח מחוונים|getDashboardData()]] → `DashboardData`.

> [!abstract] מה מוצג
> סקירה כמותית של מצב המשימות — פילוח לפי סטטוס/עדיפות/פרויקט, וגרפים ויזואליים.

> [!tip] גרפים ב-CSS בלבד
> הגרפים מיוצרים עם עמודות CSS פשוטות, ללא תלות חיצונית — שומר על bundle קל.

## ראה גם

- [[Server Actions]] · [[מודל נתונים]] · חזרה ל-[[בית]]
