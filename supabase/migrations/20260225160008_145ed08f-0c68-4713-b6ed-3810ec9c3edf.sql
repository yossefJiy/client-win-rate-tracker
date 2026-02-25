
-- Clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

-- Percent agreements table
CREATE TABLE public.percent_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  percent_rate NUMERIC NOT NULL,
  revenue_source TEXT NOT NULL,
  start_year INTEGER NOT NULL,
  start_month INTEGER NOT NULL CHECK (start_month BETWEEN 1 AND 12),
  end_year INTEGER,
  end_month INTEGER CHECK (end_month IS NULL OR end_month BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.percent_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to percent_agreements" ON public.percent_agreements FOR ALL USING (true) WITH CHECK (true);

-- Payouts table
CREATE TABLE public.payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agreement_id UUID REFERENCES public.percent_agreements(id) ON DELETE SET NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, agreement_id, year, month)
);
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to payouts" ON public.payouts FOR ALL USING (true) WITH CHECK (true);

-- Service catalog table
CREATE TABLE public.service_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  default_monthly_fee NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to service_catalog" ON public.service_catalog FOR ALL USING (true) WITH CHECK (true);

-- Client monthly services table
CREATE TABLE public.client_monthly_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  service_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  service_name TEXT,
  platform TEXT CHECK (platform IS NULL OR platform IN ('meta', 'google', 'tiktok', 'other')),
  monthly_fee NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'delivered', 'paused')),
  delivery_notes TEXT,
  agreement_id UUID REFERENCES public.percent_agreements(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, year, month, service_id, platform)
);
ALTER TABLE public.client_monthly_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to client_monthly_services" ON public.client_monthly_services FOR ALL USING (true) WITH CHECK (true);

-- Projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_year INTEGER NOT NULL,
  start_month INTEGER NOT NULL CHECK (start_month BETWEEN 1 AND 12),
  end_year INTEGER,
  end_month INTEGER CHECK (end_month IS NULL OR end_month BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'on_hold', 'completed', 'canceled')),
  agreement_id UUID REFERENCES public.percent_agreements(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

-- Project stages table
CREATE TABLE public.project_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  planned_year INTEGER,
  planned_month INTEGER CHECK (planned_month IS NULL OR planned_month BETWEEN 1 AND 12),
  expected_outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to project_stages" ON public.project_stages FOR ALL USING (true) WITH CHECK (true);

-- Project monthly checkpoints table
CREATE TABLE public.project_monthly_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'on_track' CHECK (status IN ('on_track', 'at_risk', 'off_track')),
  what_was_done TEXT,
  blockers TEXT,
  next_month_focus TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, year, month)
);
ALTER TABLE public.project_monthly_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to project_monthly_checkpoints" ON public.project_monthly_checkpoints FOR ALL USING (true) WITH CHECK (true);

-- Seed default service catalog
INSERT INTO public.service_catalog (name, default_monthly_fee) VALUES
  ('Meta Ads Management', 2900),
  ('Google Ads Management', 2900),
  ('TikTok Ads Management', NULL);
