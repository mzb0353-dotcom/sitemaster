-- ============================================================
-- שיוך משתמשים (קבלנים / אדריכלים) לפרויקטים.
-- המנהל מנהל את השיוכים; כל משתמש רואה את השיוכים של עצמו.
-- is_project_member() מוכנה לשימוש בפוליסות של שאר הטבלאות. את הפוליסות האלה
-- נעדכן במיגרציה נפרדת אחרי שנראה את הפוליסות הקיימות, כדי לא לשבור גישה קיימת.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS project_members_user_idx ON public.project_members (user_id);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_members_select ON public.project_members;
CREATE POLICY project_members_select ON public.project_members FOR SELECT TO authenticated
  USING (public.get_my_role() = 'manager' OR user_id = auth.uid());

DROP POLICY IF EXISTS project_members_insert ON public.project_members;
CREATE POLICY project_members_insert ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'manager');

DROP POLICY IF EXISTS project_members_delete ON public.project_members;
CREATE POLICY project_members_delete ON public.project_members FOR DELETE TO authenticated
  USING (public.get_my_role() = 'manager');

GRANT SELECT, INSERT, DELETE ON public.project_members TO authenticated;

CREATE OR REPLACE FUNCTION public.is_project_member(pid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.get_my_role() = 'manager'
    OR EXISTS (SELECT 1 FROM public.project_members WHERE project_id = pid AND user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.is_project_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID) TO authenticated;

-- שיוך ראשוני: כל קבלן שכבר יש לו ליקוי בפרויקט משויך לאותו פרויקט.
INSERT INTO public.project_members (project_id, user_id)
SELECT DISTINCT project_id, contractor_id FROM public.defects
WHERE project_id IS NOT NULL AND contractor_id IS NOT NULL
ON CONFLICT DO NOTHING;
