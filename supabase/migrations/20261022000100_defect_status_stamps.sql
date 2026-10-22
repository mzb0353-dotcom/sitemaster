-- ============================================================
-- הגרסה שהורצה בפועל ב-Supabase (2026-10-22). הוחלפה ע"י 20261023000000_team_rls.sql,
-- שמסירה את הטריגר הזה ומתקינה stamp_defect_status במקומו.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_defect_status_stamps()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- קבלן מגיש תיקון: מילוי אוטומטי של תאריך תיקון
  IF NEW.status = 'pending' AND (OLD.status IS NULL OR OLD.status != 'pending') THEN
    NEW.fixed_date := CURRENT_DATE;
  END IF;

  -- מנהל מאשר וסוגר ליקוי: חתימה מאובטחת של המאשר
  IF NEW.status = 'closed' AND (OLD.status IS NULL OR OLD.status != 'closed') THEN
    IF auth.uid() IS NOT NULL AND public.get_my_role() != 'manager' THEN
      RAISE EXCEPTION 'רק מנהל פרויקט רשאי לאשר ולסגור ליקוי';
    END IF;
    NEW.approved_by := auth.uid();
  END IF;

  -- דחיית תיקון: איפוס השדות
  IF NEW.status = 'open' AND OLD.status = 'pending' THEN
    NEW.fixed_date := NULL;
    NEW.approved_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_defect_status_stamps ON public.defects;
CREATE TRIGGER tr_defect_status_stamps
BEFORE INSERT OR UPDATE ON public.defects
FOR EACH ROW EXECUTE FUNCTION public.handle_defect_status_stamps();
