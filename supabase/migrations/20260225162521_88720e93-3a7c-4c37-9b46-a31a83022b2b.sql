
-- Add currency and billing columns to service_catalog
ALTER TABLE public.service_catalog 
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ILS',
  ADD COLUMN IF NOT EXISTS billing text NOT NULL DEFAULT 'monthly';

-- Create client_service_templates table
CREATE TABLE public.client_service_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_catalog_id uuid NOT NULL REFERENCES public.service_catalog(id) ON DELETE CASCADE,
  platform text,
  default_fee numeric NOT NULL DEFAULT 0,
  default_status text NOT NULL DEFAULT 'planned',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_service_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to client_service_templates" ON public.client_service_templates FOR ALL USING (true) WITH CHECK (true);

-- Create commission_plans table
CREATE TABLE public.commission_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  minimum_fee numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ILS',
  base text NOT NULL DEFAULT 'net_sales',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to commission_plans" ON public.commission_plans FOR ALL USING (true) WITH CHECK (true);

-- Create commission_tiers table
CREATE TABLE public.commission_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.commission_plans(id) ON DELETE CASCADE,
  threshold_sales numeric NOT NULL DEFAULT 0,
  rate_percent numeric NOT NULL,
  order_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to commission_tiers" ON public.commission_tiers FOR ALL USING (true) WITH CHECK (true);

-- Create integration_settings table
CREATE TABLE public.integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to integration_settings" ON public.integration_settings FOR ALL USING (true) WITH CHECK (true);

-- Create client_integrations table
CREATE TABLE public.client_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  poconverto_client_key text,
  shop_domain text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to client_integrations" ON public.client_integrations FOR ALL USING (true) WITH CHECK (true);

-- Create monthly_analytics_snapshots table
CREATE TABLE public.monthly_analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  net_sales numeric DEFAULT 0,
  gross_sales numeric DEFAULT 0,
  discounts numeric DEFAULT 0,
  refunds numeric DEFAULT 0,
  orders integer DEFAULT 0,
  sessions integer DEFAULT 0,
  ad_spend_meta numeric DEFAULT 0,
  ad_spend_google numeric DEFAULT 0,
  ad_spend_tiktok numeric DEFAULT 0,
  ad_spend_total numeric DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, year, month)
);

ALTER TABLE public.monthly_analytics_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to monthly_analytics_snapshots" ON public.monthly_analytics_snapshots FOR ALL USING (true) WITH CHECK (true);
