
-- Add detailed analytics fields to monthly_analytics_snapshots
ALTER TABLE public.monthly_analytics_snapshots
  ADD COLUMN IF NOT EXISTS new_customers integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS returning_customers integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_order_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS page_views integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bounce_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_session_duration numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_impressions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_clicks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_cpc numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_cpm numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_roas numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_impressions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_clicks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_cpc numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_cpm numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_roas numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_impressions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_clicks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_cpc numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_cpm numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_roas numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ad_impressions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ad_clicks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blended_roas numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mer numeric DEFAULT 0;

-- Add iCount fields to monthly_offline_revenue (already exists, just add sync metadata)
ALTER TABLE public.monthly_offline_revenue
  ADD COLUMN IF NOT EXISTS icount_doc_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS icount_doc_type text DEFAULT NULL;

-- Add iCount settings fields to client_integrations
ALTER TABLE public.client_integrations
  ADD COLUMN IF NOT EXISTS icount_company_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS icount_api_token text DEFAULT NULL;
