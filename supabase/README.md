# מסד הנתונים (Supabase)

| קובץ | מה יש בו |
|---|---|
| `schema.sql` | צילום מצב של הסכמה כפי שהיא רצה היום: טיפוסים, טבלאות, פונקציות וטריגרים |
| `migrations/` | כל שינוי מכאן והלאה, קובץ לכל שינוי, לפי סדר התאריך בשם הקובץ |

## איך מריצים מיגרציה

ב-Supabase: **SQL Editor → New query**, מדביקים את תוכן הקובץ ולוחצים **Run**.
כל מיגרציה כתובה כך שהרצה חוזרת שלה לא מזיקה.

| מיגרציה | סטטוס |
|---|---|
| `20261022000000_lock_down_profile_functions.sql` | **ממתינה להרצה** — סוגרת פרצה שבה כל משתמש מחובר יכול להפוך את עצמו למנהל |

## מה עוד חסר כאן

`schema.sql` לא כולל את פוליסות ה-RLS (של הטבלאות ושל ה-Storage), ובלעדיהן אי אפשר
לשחזר את המערכת מהקוד. כדי להוסיף אותן, להריץ ב-SQL Editor את השאילתה הבאה ולהעביר את התוצאה:

```sql
SELECT format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', n.nspname, c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
UNION ALL
SELECT format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;', policyname, schemaname, tablename, permissive, cmd,
  array_to_string(roles, ', '), coalesce(' USING (' || qual || ')', ''), coalesce(' WITH CHECK (' || with_check || ')', ''))
FROM pg_policies WHERE schemaname IN ('public', 'storage')
UNION ALL
SELECT format('-- trigger %s on %s: %s %s', trigger_name, event_object_table, action_timing, action_statement)
FROM information_schema.triggers WHERE trigger_schema = 'public';
```
