
-- icount_documents: one row per iCount document (invoice/receipt/invrec)
CREATE TABLE public.icount_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  integration_id uuid NOT NULL REFERENCES public.client_integrations(id),
  doctype text NOT NULL,
  docnum text NOT NULL,
  dateissued date,
  status text,
  subtotal_before_vat numeric NOT NULL DEFAULT 0,
  total_including_vat numeric NOT NULL DEFAULT 0,
  vat_amount numeric,
  paydate date,
  currency_original text,
  raw_json jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(integration_id, doctype, docnum)
);

ALTER TABLE public.icount_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to icount_documents" ON public.icount_documents FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_icount_docs_client ON public.icount_documents(client_id);
CREATE INDEX idx_icount_docs_dateissued ON public.icount_documents(dateissued);

-- icount_payments: payment breakdown per document
CREATE TABLE public.icount_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  integration_id uuid NOT NULL REFERENCES public.client_integrations(id),
  doctype text NOT NULL,
  docnum text NOT NULL,
  payment_date date,
  amount_including_vat numeric NOT NULL DEFAULT 0,
  method text,
  raw_json jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.icount_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to icount_payments" ON public.icount_payments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_icount_payments_client ON public.icount_payments(client_id);

-- daily_offline_revenue: manual/derived offline revenue per day
CREATE TABLE public.daily_offline_revenue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  date date NOT NULL,
  source text NOT NULL DEFAULT 'other',
  amount_before_vat numeric NOT NULL DEFAULT 0,
  amount_including_vat numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_offline_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to daily_offline_revenue" ON public.daily_offline_revenue FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_daily_offline_client_date ON public.daily_offline_revenue(client_id, date);

-- daily_cash_received: computed from iCount payments
CREATE TABLE public.daily_cash_received (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  date date NOT NULL,
  amount_including_vat numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'icount',
  integration_id uuid REFERENCES public.client_integrations(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_cash_received ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to daily_cash_received" ON public.daily_cash_received FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_daily_cash_client_date ON public.daily_cash_received(client_id, date);

-- icount_sync_runs: log each sync run
CREATE TABLE public.icount_sync_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  integration_id uuid NOT NULL REFERENCES public.client_integrations(id),
  run_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  months_processed integer DEFAULT 0,
  docs_upserted integer DEFAULT 0,
  errors jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.icount_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to icount_sync_runs" ON public.icount_sync_runs FOR ALL USING (true) WITH CHECK (true);
