-- ============================================================
-- הרשאות לפי צוות פרויקט (RLS) + יישור המיגרציות של 2026-10-22.
--
-- מי רואה מה:
--   מנהל         — הכול, וכותב הכול.
--   אדריכל       — פרויקטים שהוא משויך אליהם: חדרים, מערכות, כל הליקויים, תוכניות (וגם מעלה תוכניות).
--   קבלן          — פרויקטים שהוא משויך אליהם: חדרים, מערכות, תוכניות, ורק הליקויים שלו.
--                  מעדכן רק ליקוי פתוח שלו, רק למצב "ממתין לאישור", ורק את שדות הדיווח.
--
-- המיגרציה מוחקת את כל הפוליסות הקיימות על projects/rooms/systems/defects/blueprints/project_members
-- ועל קבצי ה-Storage של defects/blueprints, ויוצרת אותן מחדש. אפשר להריץ אותה שוב בבטחה.
-- ============================================================

-- ---------- 1. פונקציות עזר ----------

-- משתמש בלי פרופיל לא נחשב מנהל (במקום get_my_role() = 'manager', שמחזיר NULL).
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT role = 'manager' FROM public.profiles WHERE id = auth.uid()), false);
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(pid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_manager()
    OR EXISTS (SELECT 1 FROM public.project_members WHERE project_id = pid AND user_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.is_manager() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_project_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID) TO authenticated;

-- ---------- 2. project_members: העמודה role כפולה ל-profiles.role (ושגויה לאדריכלים) ----------

ALTER TABLE public.project_members DROP COLUMN IF EXISTS role;
CREATE INDEX IF NOT EXISTS project_members_user_idx ON public.project_members (user_id);

-- ---------- 3. ליקויים: טריגר חותמות במקום handle_defect_status_stamps ----------
-- טריגרי ההגנה רצים כ-INVOKER ובודקים current_user = 'authenticated': כך הם חלים על
-- בקשות מהאפליקציה, ולא על SQL Editor או על פונקציות שרת (create_profile_for וכו').

DROP TRIGGER IF EXISTS tr_defect_status_stamps ON public.defects;
DROP FUNCTION IF EXISTS public.handle_defect_status_stamps();

-- חותמות סטטוס נקבעות רק בשרת:
--   -> pending : fixed_date = היום
--   -> closed  : approved_by = המשתמש המחובר; רק מנהל
--   -> open    : מאפס fixed_date ו-approved_by
--   בלי שינוי סטטוס: אי אפשר לשנות את החותמות
CREATE OR REPLACE FUNCTION public.stamp_defect_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    NEW.approved_by := OLD.approved_by;
    NEW.fixed_date := OLD.fixed_date;
    RETURN NEW;
  END IF;

  IF NEW.status = 'pending' THEN
    NEW.fixed_date := CURRENT_DATE;
    NEW.approved_by := NULL;
  ELSIF NEW.status = 'closed' THEN
    IF current_user = 'authenticated' AND NOT public.is_manager() THEN
      RAISE EXCEPTION 'רק מנהל פרויקט רשאי לאשר ולסגור ליקוי' USING ERRCODE = '42501';
    END IF;
    NEW.approved_by := auth.uid();
    NEW.fixed_date := COALESCE(NEW.fixed_date, CURRENT_DATE);
  ELSE
    NEW.fixed_date := NULL;
    NEW.approved_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.stamp_defect_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS defects_stamp_status ON public.defects;
CREATE TRIGGER defects_stamp_status BEFORE INSERT OR UPDATE ON public.defects
FOR EACH ROW EXECUTE FUNCTION public.stamp_defect_status();

-- קבלן מעדכן רק את שדות הדיווח, ורק במעבר open -> pending.
CREATE OR REPLACE FUNCTION public.guard_contractor_defect_update()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user <> 'authenticated' OR public.is_manager() THEN
    RETURN NEW;
  END IF;
  IF (NEW.id, NEW.project_id, NEW.room_id, NEW.room_name, NEW.system_type, NEW.title, NEW.description,
      NEW.severity, NEW.contractor_id, NEW.contractor_name, NEW.reported_date, NEW.before_image_path, NEW.created_at)
     IS DISTINCT FROM
     (OLD.id, OLD.project_id, OLD.room_id, OLD.room_name, OLD.system_type, OLD.title, OLD.description,
      OLD.severity, OLD.contractor_id, OLD.contractor_name, OLD.reported_date, OLD.before_image_path, OLD.created_at)
  THEN
    RAISE EXCEPTION 'קבלן רשאי לעדכן רק את דיווח התיקון' USING ERRCODE = '42501';
  END IF;
  IF NOT (OLD.status = 'open' AND NEW.status = 'pending') THEN
    RAISE EXCEPTION 'קבלן רשאי רק להגיש ליקוי פתוח לאישור' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_contractor_defect_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS defects_guard_contractor ON public.defects;
CREATE TRIGGER defects_guard_contractor BEFORE UPDATE ON public.defects
FOR EACH ROW EXECUTE FUNCTION public.guard_contractor_defect_update();

-- ---------- 4. profiles: profiles_update_own מאפשרת לכל משתמש לשנות לעצמו את role ----------

CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.is_manager()
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.id IS DISTINCT FROM OLD.id) THEN
    RAISE EXCEPTION 'רק מנהל רשאי לשנות תפקיד' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_profile_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_guard_update ON public.profiles;
CREATE TRIGGER profiles_guard_update BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

-- ---------- 5. מחיקת הפוליסות הקיימות ----------

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('projects', 'rooms', 'systems', 'defects', 'blueprints', 'project_members')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;

  -- ב-Storage מוחקים רק פוליסות שמזכירות את אחד משני ה-buckets שלנו
  FOR p IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (coalesce(qual, '') || coalesce(with_check, '')) ~ '''(defects|blueprints)'''
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- ---------- 6. פוליסות חדשות ----------

-- project_members
CREATE POLICY project_members_select ON public.project_members FOR SELECT TO authenticated
  USING (public.is_manager() OR user_id = auth.uid());
CREATE POLICY project_members_manage ON public.project_members FOR ALL TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());

-- projects
CREATE POLICY projects_select ON public.projects FOR SELECT TO authenticated
  USING (public.is_project_member(id));
CREATE POLICY projects_manage ON public.projects FOR ALL TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());

-- rooms
CREATE POLICY rooms_select ON public.rooms FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));
CREATE POLICY rooms_manage ON public.rooms FOR ALL TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());

-- systems (דרך החדר; פוליסת rooms חלה גם בתוך התת-שאילתה)
CREATE POLICY systems_select ON public.systems FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = systems.room_id));
CREATE POLICY systems_manage ON public.systems FOR ALL TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());

-- defects
CREATE POLICY defects_select ON public.defects FOR SELECT TO authenticated
  USING (
    public.is_manager()
    OR (public.is_project_member(project_id)
        AND (public.get_my_role() = 'architect' OR contractor_id = auth.uid()))
  );
CREATE POLICY defects_manage ON public.defects FOR ALL TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY defects_contractor_report ON public.defects FOR UPDATE TO authenticated
  USING (contractor_id = auth.uid() AND status = 'open' AND public.is_project_member(project_id))
  WITH CHECK (contractor_id = auth.uid() AND status = 'pending');

-- blueprints
CREATE POLICY blueprints_select ON public.blueprints FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));
CREATE POLICY blueprints_manage ON public.blueprints FOR ALL TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY blueprints_architect_insert ON public.blueprints FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'architect' AND public.is_project_member(project_id));

-- ---------- 7. Storage ----------
-- defects/<defect_id>/<kind>-<ts>.jpg ; blueprints/<project_id>/<uuid>.<ext>
-- קריאה: הקובץ מקושר לרשומה שהמשתמש רשאי לראות (פוליסות הטבלאות חלות בתוך התת-שאילתה).
-- העלאה: מנהל; קבלן רק לליקוי פתוח שלו; אדריכל רק לתיקיית פרויקט שהוא משויך אליו.
-- מחיקה: מנהל, או מי שהעלה את הקובץ (ניקוי אחרי העלאה שנכשלה).

CREATE POLICY sm_defects_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'defects' AND (public.is_manager() OR EXISTS (
    SELECT 1 FROM public.defects d WHERE d.before_image_path = objects.name OR d.after_image_path = objects.name)));
CREATE POLICY sm_defects_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'defects' AND (public.is_manager() OR EXISTS (
    SELECT 1 FROM public.defects d
    WHERE d.id::text = (storage.foldername(objects.name))[1] AND d.contractor_id = auth.uid() AND d.status = 'open')));
CREATE POLICY sm_defects_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'defects' AND (public.is_manager() OR owner_id = auth.uid()::text));

CREATE POLICY sm_blueprints_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'blueprints' AND (public.is_manager() OR EXISTS (
    SELECT 1 FROM public.blueprints b WHERE b.file_path = objects.name)));
CREATE POLICY sm_blueprints_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blueprints' AND (public.is_manager() OR (public.get_my_role() = 'architect' AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(objects.name))[1] AND public.is_project_member(p.id)))));
CREATE POLICY sm_blueprints_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blueprints' AND (public.is_manager() OR owner_id = auth.uid()::text));

-- ---------- 8. מה נשאר על storage.objects ----------
-- פוליסה כללית שלא מזכירה bucket (למשל "authenticated can read all") עדיין תפתח הכול.
-- התוצאה של השאילתה הזו מוצגת בסוף ההרצה; כל מה שלא מתחיל ב-sm_ כדאי לבדוק.
SELECT policyname, cmd, qual, with_check FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' ORDER BY policyname;
