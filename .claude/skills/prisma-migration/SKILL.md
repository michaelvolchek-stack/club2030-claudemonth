---
name: prisma-migration
description: Use when changing the Prisma schema (prisma/schema.prisma) — adding/removing a model, field, relation, or index — in this task-manager project. Covers the full ritual: migrate, generate, update as-const types, sync Vault docs, and verify the build. Do NOT use for plain data reads/writes that don't touch the schema.
---

# Prisma Migration Flow (SQLite + Prisma 5)

שינוי סכמה בפרויקט הזה הוא ריטואל בן 6 צעדים. דילוג על צעד משאיר את הקוד, הטיפוסים או התיעוד לא מסונכרנים.

## עקרונות פרויקט (לא לשכוח)
- **אין `enum` ב-SQLite/Prisma 5.** שדות "enum" הם `String` עם `@default("...")`, והערכים מוגדרים כתבנית `as const` ב-`src/types/index.ts` — לא ב-schema.
- מעל כל מודל שיש בו שדה־enum יש הערת `//` שמתעדת את הערכים החוקיים (ראה `Task` → `status`, `priority`). שמור על ההערה מעודכנת.
- מזהים: `String @id @default(cuid())`.

## הצעדים

### 1. ערוך את הסכמה
`prisma/schema.prisma` — הוסף/שנה את המודל/שדה/יחס. לשדה־enum חדש: `String @default("...")` + הערת `//` עם הערכים. הוסף `?` לשדות אופציונליים כדי לא לשבור שורות קיימות.

### 2. צור מיגרציה
```bash
npx prisma migrate dev --name <שם_תיאורי_באנגלית>
```
זה גם מריץ `generate` אוטומטית. אם ה-CLI לא ב-PATH, נסה `npx --yes prisma ...`.

### 3. ודא רגנרציה של ה-client
```bash
npx prisma generate   # אם צעד 2 לא הריץ אוטומטית
```

### 4. עדכן טיפוסים ב-src/types/index.ts
- ערך enum חדש → הוסף לתבנית ה-`as const` ולטיפוס הנגזר.
- שדה חדש שאמור לעבור לרכיבים → ודא שהוא נכלל ב-`TaskWithRelations` / בטיפוס הרלוונטי.

### 5. סנכרן תיעוד
עדכן `Vault/ארכיטקטורה/מודל נתונים.md`: הוסף את שם המיגרציה החדשה לרשימת המיגרציות, ועדכן את תרשים ה-ER ואת טבלאות השדות. אפשר להאציל את זה לסאב-אג'נט `vault-doc-sync`.

### 6. אמת
```bash
npm run build   # sanity — תופס drift בטיפוסים ובשאילתות Prisma
```

## Checklist לפני סיום
- [ ] schema עודכן + הערת `//` לערכי enum
- [ ] `migrate dev` רץ, מיגרציה חדשה קיימת תחת `prisma/migrations/`
- [ ] Prisma client עבר regenerate
- [ ] `src/types/index.ts` תואם (as const + טיפוסים נגזרים)
- [ ] `Vault/ארכיטקטורה/מודל נתונים.md` מסונכרן
- [ ] `npm run build` עובר
