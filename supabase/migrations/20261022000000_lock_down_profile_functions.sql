-- ============================================================
-- סגירת פרצת הרשאות: create_profile_for היא SECURITY DEFINER ופתוחה ל-PUBLIC,
-- ולכן כל משתמש מחובר יכול לקרוא לה דרך /rest/v1/rpc/create_profile_for
-- עם uid שלו והאימייל של המנהל, ולהפוך את עצמו למנהל.
-- היא נקראת רק מתוך handle_new_user ו-ensure_my_profile (שרצות כבעלים),
-- כך שאין צורך שתהיה חשופה החוצה.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.create_profile_for(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ensure_my_profile נשארת פתוחה למחוברים בלבד (היא בודקת auth.uid() ולוקחת את האימייל מ-auth.users).
REVOKE EXECUTE ON FUNCTION public.ensure_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

-- SECURITY DEFINER בלי search_path קבוע חשופה להחלפת אובייקטים; מקבעים כמו בשאר הפונקציות.
ALTER FUNCTION public.get_my_role() SET search_path = public;
