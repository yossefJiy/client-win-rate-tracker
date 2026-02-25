
-- 1) Add plan_type to clients
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'regular_pricing';

-- 2) Update service_catalog: add dual pricing columns
ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS regular_unit_price numeric NULL,
ADD COLUMN IF NOT EXISTS plan_unit_price numeric NULL;

-- Migrate existing default_monthly_fee to regular_unit_price
UPDATE public.service_catalog SET regular_unit_price = default_monthly_fee WHERE default_monthly_fee IS NOT NULL AND regular_unit_price IS NULL;

-- 3) Update client_monthly_services: add quantity, unit_price, pricing_basis, linked_project_id
ALTER TABLE public.client_monthly_services
ADD COLUMN IF NOT EXISTS quantity numeric NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit_price numeric NULL,
ADD COLUMN IF NOT EXISTS pricing_basis text NOT NULL DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS linked_project_id uuid NULL REFERENCES public.projects(id);

-- Migrate existing monthly_fee to unit_price
UPDATE public.client_monthly_services SET unit_price = monthly_fee WHERE unit_price IS NULL AND monthly_fee IS NOT NULL AND monthly_fee > 0;

-- 4) Create project_required_services table
CREATE TABLE IF NOT EXISTS public.project_required_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.service_catalog(id),
  default_quantity numeric NOT NULL DEFAULT 1,
  quantity_unit_note text NULL,
  when_applied text NOT NULL DEFAULT 'on_project_create',
  stage_id uuid NULL REFERENCES public.project_stages(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.project_required_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to project_required_services"
  ON public.project_required_services
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5) Create invoices table (future schema)
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  year integer NOT NULL,
  month integer NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone NULL,
  paid_at timestamp with time zone NULL
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to invoices"
  ON public.invoices
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6) Create invoice_line_items table (future schema)
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  source_type text NOT NULL DEFAULT 'manual',
  source_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to invoice_line_items"
  ON public.invoice_line_items
  FOR ALL
  USING (true)
  WITH CHECK (true);
