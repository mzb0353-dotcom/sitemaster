# M.T MASTER PRO

אפליקציית ניהול פרויקטי בנייה: ליקויים (לפני/אחרי ואישור מנהל), חדרים ומערכות, צוות פרויקט, תוכניות עבודה ודוח מסירה.
צד שרת: Supabase (התחברות, Postgres עם RLS, אחסון קבצים). האפליקציה היא PWA: אפשר להתקין אותה למסך הבית באייפון, באייפד ובאנדרואיד.

## הרצה מקומית

```bash
npm install
npm run dev       # שרת פיתוח
npm run build     # בנייה לתיקייה dist/
npm run preview   # הצגת ה-build
```

כתובת ומפתח Supabase מוגדרים ב-`src/lib/supabase.js`, ואפשר לדרוס אותם ב-`.env.local`
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`).

## פרסום ב-Vercel

1. ב-[vercel.com](https://vercel.com): **Add New → Project**, לחבר את GitHub ולבחור את הריפו `sitemaster`.
   Vercel מזהה Vite לבד (Build: `npm run build`, Output: `dist`); אין צורך לשנות הגדרות.
2. כל דחיפה ל-`main` מתפרסמת לכתובת הקבועה, וכל ענף אחר מקבל כתובת תצוגה מקדימה משלו.
3. ב-Supabase: **Authentication → URL Configuration** — להוסיף את כתובת Vercel ל-**Redirect URLs**
   (ולעדכן את **Site URL** לכתובת הקבועה).
4. ב-Supabase: **Authentication → Email Templates → Magic Link** — להוסיף לגוף המייל את הקוד:
   `<p>קוד הכניסה שלך: <strong>{{ .Token }}</strong></p>`.
   באפליקציה שמותקנת על מסך הבית באייפון, קישור מהמייל נפתח ב-Safari ולא באפליקציה, ולכן נכנסים עם הקוד.

## התקנה על המכשיר

- **אייפון / אייפד:** לפתוח את הכתובת ב-Safari → כפתור השיתוף → **הוסף למסך הבית**.
- **אנדרואיד:** לפתוח ב-Chrome → תפריט ⋮ → **התקן אפליקציה**.

## מבנה

```
src/
  main.jsx, App.jsx        כניסה, שער התחברות, רישום ה-service worker
  lib/                     חיבור Supabase, שכבת נתונים, קבועים ועזרים
  components/              רכיבים משותפים (לוגו, אייקונים, חלון, בוחר תמונה...)
  screens/                 מסך כניסה וסביבת העבודה
  tabs/                    לשוניות: ליקויים, חדרים, תוכניות, צוות, דוח
public/
  manifest.webmanifest     הגדרות ההתקנה (שם, צבעים, אייקונים)
  sw.js                    service worker: פתיחה גם בלי קליטה
  icons/                   אייקוני מסך הבית, נוצרים מ-brand/mt-master-logo.jpg
brand/                     הלוגו הרשמי
scripts/make_icons.py      יצירת האייקונים מהלוגו (python3 scripts/make_icons.py brand/mt-master-logo.jpg public/icons)
supabase/                  סכמה ומיגרציות (ראו supabase/README.md)
legacy/index.html          הגרסה המקורית בקובץ יחיד (גיבוי)
```
