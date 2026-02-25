
-- Add status to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Create partners table
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to partners" ON public.partners FOR ALL USING (true) WITH CHECK (true);

-- Create monthly_offline_revenue table (future iCount)
CREATE TABLE IF NOT EXISTS public.monthly_offline_revenue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  source text NOT NULL DEFAULT 'icount_other',
  amount_gross numeric NOT NULL DEFAULT 0,
  amount_net numeric,
  notes text,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, year, month, source)
);
ALTER TABLE public.monthly_offline_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to monthly_offline_revenue" ON public.monthly_offline_revenue FOR ALL USING (true) WITH CHECK (true);

-- Add missing columns to client_integrations
ALTER TABLE public.client_integrations ADD COLUMN IF NOT EXISTS meta_ad_account_id text;
ALTER TABLE public.client_integrations ADD COLUMN IF NOT EXISTS google_ads_customer_id text;
ALTER TABLE public.client_integrations ADD COLUMN IF NOT EXISTS tiktok_ad_account_id text;

-- Add agreement_link to client_monthly_services
ALTER TABLE public.client_monthly_services ADD COLUMN IF NOT EXISTS agreement_link text;

-- Add unique constraints (use DO block to handle if they already exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_analytics_snapshots_client_year_month_key') THEN
    ALTER TABLE public.monthly_analytics_snapshots ADD CONSTRAINT monthly_analytics_snapshots_client_year_month_key UNIQUE(client_id, year, month);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_monthly_checkpoints_project_year_month_key') THEN
    ALTER TABLE public.project_monthly_checkpoints ADD CONSTRAINT project_monthly_checkpoints_project_year_month_key UNIQUE(project_id, year, month);
  END IF;
END $$;
