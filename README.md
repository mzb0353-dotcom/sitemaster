# SiteMaster PRO

אפליקציית ניהול פרויקטי בנייה: ליקויים (לפני/אחרי ואישור מנהל), חדרים ומערכות, תוכניות עבודה, קבלנים ודוח מסירה.
צד שרת: Supabase (התחברות, Postgres עם RLS, אחסון קבצים).

## הרצה מקומית

```bash
npm install
npm run dev       # שרת פיתוח
npm run build     # בנייה לתיקייה dist/
npm run preview   # הצגת ה-build
```

כתובת ומפתח Supabase מוגדרים ב-`src/lib/supabase.js`, ואפשר לדרוס אותם ב-`.env.local`
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`).

## מבנה

```
src/
  main.jsx, App.jsx        כניסה ושער התחברות
  lib/                     חיבור Supabase, שכבת נתונים, קבועים ועזרים
  components/              רכיבים משותפים (אייקונים, חלון, בוחר תמונה...)
  screens/                 מסך כניסה וסביבת העבודה
  tabs/                    לשוניות: ליקויים, חדרים, תוכניות, קבלנים, דוח
legacy/index.html          הגרסה המקורית בקובץ יחיד (גיבוי)
```
