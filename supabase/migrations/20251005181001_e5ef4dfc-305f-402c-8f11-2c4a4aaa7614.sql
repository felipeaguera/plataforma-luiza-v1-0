-- ============================================
-- AGUERA DERMATOLOGIA - DATABASE SCHEMA
-- ============================================

-- 1. CREATE ROLE ENUM
CREATE TYPE public.app_role AS ENUM ('admin', 'patient');

-- 2. USER ROLES TABLE
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. ADMIN PROFILES TABLE
CREATE TABLE public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- 4. PATIENTS TABLE
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  invite_sent_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- 5. EXAMS TABLE
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- 6. RECOMMENDATIONS TABLE
CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('text', 'image', 'video')),
  media_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- 7. CLINIC NEWS TABLE
CREATE TABLE public.clinic_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('text', 'image', 'video')),
  media_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.clinic_news ENABLE ROW LEVEL SECURITY;

-- 8. ACCESS LOGS TABLE
CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to check user role (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for patients table
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create admin profile on first admin role assignment
CREATE OR REPLACE FUNCTION public.handle_new_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    INSERT INTO public.admin_profiles (id, full_name)
    VALUES (
      NEW.user_id,
      COALESCE(
        (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = NEW.user_id),
        'Admin'
      )
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_admin_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_admin();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- USER_ROLES: Only admins can manage roles
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ADMIN_PROFILES: Admins can view all, users can view their own
CREATE POLICY "Admins can view all admin profiles"
  ON public.admin_profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own admin profile"
  ON public.admin_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- PATIENTS: Admins manage all, patients see only their own data
CREATE POLICY "Admins can manage all patients"
  ON public.patients FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Patients can view their own data"
  ON public.patients FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Patients can update their own data"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- EXAMS: Admins manage all, patients view only their own
CREATE POLICY "Admins can manage all exams"
  ON public.exams FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Patients can view their own exams"
  ON public.exams FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = auth.uid()
    )
  );

-- RECOMMENDATIONS: Admins manage all, patients view only their own
CREATE POLICY "Admins can manage all recommendations"
  ON public.recommendations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Patients can view their own recommendations"
  ON public.recommendations FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = auth.uid()
    )
  );

-- CLINIC_NEWS: Admins manage all, all authenticated users can view
CREATE POLICY "Admins can manage clinic news"
  ON public.clinic_news FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can view clinic news"
  ON public.clinic_news FOR SELECT
  TO authenticated
  USING (published_at IS NOT NULL);

-- ACCESS_LOGS: Admins view all, users view only their own
CREATE POLICY "Admins can view all access logs"
  ON public.access_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert access logs"
  ON public.access_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own access logs"
  ON public.access_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Bucket for exam PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exams',
  'exams',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
);

-- Bucket for recommendation media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recommendations',
  'recommendations',
  false,
  20971520, -- 20MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
);

-- Bucket for clinic news media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'news',
  'news',
  false,
  20971520, -- 20MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
);

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- EXAMS BUCKET: Only admins can upload, patients can download their own
CREATE POLICY "Admins can upload exams"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'exams' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update exams"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'exams' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete exams"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'exams' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Patients can view their own exams"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exams' AND
    (
      public.has_role(auth.uid(), 'admin') OR
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.patients WHERE user_id = auth.uid()
      )
    )
  );

-- RECOMMENDATIONS BUCKET: Admins manage, patients view their own
CREATE POLICY "Admins can manage recommendation media"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'recommendations' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Patients can view their own recommendation media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recommendations' AND
    (
      public.has_role(auth.uid(), 'admin') OR
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.patients WHERE user_id = auth.uid()
      )
    )
  );

-- NEWS BUCKET: Admins manage, all authenticated users can view
CREATE POLICY "Admins can manage news media"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'news' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "All authenticated users can view news media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'news');