-- ============================================================
-- מילוי אוטומטי של fixed_date ו-approved_by לפי מעבר סטטוס של ליקוי.
-- האפליקציה לא שולחת את השדות האלה, והשרת קובע אותם כדי שאי אפשר יהיה לזייף אותם:
--   * -> pending : fixed_date = היום (הקבלן הגיש תיקון)
--   * -> closed  : approved_by = המשתמש המחובר; רק מנהל רשאי לסגור
--   * -> open    : מנקה fixed_date ו-approved_by (תיקון נדחה / נפתח מחדש)
-- עדכונים בלי משתמש מחובר (SQL Editor, service role) לא נחסמים.
-- ============================================================

CREATE OR REPLACE FUNCTION public.stamp_defect_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    -- שינוי שלא נוגע בסטטוס לא רשאי לשנות את חותמות האישור
    NEW.approved_by := OLD.approved_by;
    NEW.fixed_date := OLD.fixed_date;
    RETURN NEW;
  END IF;

  IF NEW.status = 'pending' THEN
    NEW.fixed_date := CURRENT_DATE;
    NEW.approved_by := NULL;
  ELSIF NEW.status = 'closed' THEN
    IF auth.uid() IS NOT NULL AND public.get_my_role() IS DISTINCT FROM 'manager' THEN
      RAISE EXCEPTION 'only a manager can close a defect' USING ERRCODE = '42501';
    END IF;
    NEW.approved_by := auth.uid();
    NEW.fixed_date := COALESCE(NEW.fixed_date, OLD.fixed_date, CURRENT_DATE);
  ELSIF NEW.status = 'open' THEN
    NEW.fixed_date := NULL;
    NEW.approved_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.stamp_defect_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS defects_stamp_status ON public.defects;
CREATE TRIGGER defects_stamp_status BEFORE UPDATE ON public.defects
FOR EACH ROW EXECUTE FUNCTION public.stamp_defect_status();
