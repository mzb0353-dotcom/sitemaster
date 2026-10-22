-- ============================================================
-- SiteMaster: סכמת מסד הנתונים כפי שהיא רצה ב-Supabase (צילום מצב 2026-10-22)
-- תיקון יחיד מול המקור שהועבר: auth.users\%ROWTYPE -> auth.users%ROWTYPE.
-- שינויים מכאן והלאה נכנסים כקבצים ב-supabase/migrations/.
-- חסר בצילום הזה: פוליסות RLS של הטבלאות ושל ה-Storage (ראו supabase/README.md).
-- ============================================================

-- TYPES
CREATE TYPE user_role AS ENUM ('manager', 'contractor', 'architect');
CREATE TYPE defect_severity AS ENUM ('low', 'medium', 'high');
CREATE TYPE defect_status AS ENUM ('open', 'pending', 'closed');

-- TABLES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'contractor',
  company TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  client_name TEXT,
  client_phone TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'בביצוע',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  system_type TEXT NOT NULL,
  name TEXT NOT NULL,
  installer_name TEXT,
  details TEXT,
  status TEXT DEFAULT 'ממתין להתקנה',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  room_name TEXT NOT NULL,
  system_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT 'אין פירוט נוסף',
  severity defect_severity NOT NULL DEFAULT 'medium',
  status defect_status NOT NULL DEFAULT 'open',
  contractor_id UUID REFERENCES public.profiles(id),
  contractor_name TEXT NOT NULL,
  reported_date DATE DEFAULT CURRENT_DATE,
  fixed_date DATE,
  before_image_path TEXT,
  after_image_path TEXT,
  fix_note TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  discipline TEXT NOT NULL,
  version TEXT DEFAULT 'גרסה 1',
  file_path TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.create_profile_for(uid UUID, mail TEXT, meta JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r user_role;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = uid) THEN
    IF mail = 'mzb0353@gmail.com' THEN
      UPDATE public.profiles SET role = 'manager' WHERE id = uid;
    END IF;
    RETURN;
  END IF;

  IF mail = 'mzb0353@gmail.com' OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'manager') THEN
    r := 'manager';
  ELSE
    r := 'contractor';
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (uid, COALESCE(NULLIF(meta->>'full_name', ''), split_part(mail, '@', 1), 'משתמש'), r)
  ON CONFLICT (id) DO UPDATE
    SET role = CASE WHEN mail = 'mzb0353@gmail.com' THEN 'manager' ELSE profiles.role END;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.create_profile_for(NEW.id, NEW.email, NEW.raw_user_meta_data);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u auth.users%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  SELECT * INTO u FROM auth.users WHERE id = auth.uid();
  IF FOUND THEN
    PERFORM public.create_profile_for(u.id, u.email, u.raw_user_meta_data);
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

-- STORAGE BUCKETS: 'defects' (private), 'blueprints' (private)
