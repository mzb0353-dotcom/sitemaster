-- ============================================================
-- הגרסה שהורצה בפועל ב-Supabase (2026-10-22).
-- 20261023000000_team_rls.sql מסירה את העמודה role (כפולה ל-profiles.role),
-- מאחדת את הפוליסות ומוסיפה את is_project_member().
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'contractor',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_members_select ON public.project_members;
CREATE POLICY project_members_select ON public.project_members
FOR SELECT TO authenticated
USING (
  public.get_my_role() = 'manager'
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS project_members_manager ON public.project_members;
CREATE POLICY project_members_manager ON public.project_members
FOR ALL TO authenticated
USING (public.get_my_role() = 'manager')
WITH CHECK (public.get_my_role() = 'manager');

-- שיוך אוטומטי של כל הקבלנים שכבר יש להם ליקויים קיימים
INSERT INTO public.project_members (project_id, user_id, role)
SELECT DISTINCT project_id, contractor_id, 'contractor'::user_role
FROM public.defects
WHERE contractor_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;
