import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { client_id, months } = await req.json();

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get integration settings
    const { data: settings } = await supabase
      .from("integration_settings")
      .select("key, value");

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => { settingsMap[s.key] = s.value; });

    const baseUrl = settingsMap.poconverto_base_url;
    const apiKey = settingsMap.poconverto_api_key;

    if (!baseUrl || !apiKey) {
      return new Response(JSON.stringify({ error: "Poconverto settings not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get client integration
    const { data: clientIntegration } = await supabase
      .from("client_integrations")
      .select("*")
      .eq("client_id", client_id)
      .single();

    if (!clientIntegration?.poconverto_client_key) {
      return new Response(JSON.stringify({ error: "Client Poconverto key not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate date range
    const now = new Date();
    let fromDate: string;
    let toDate: string;

    if (months === "current") {
      fromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      toDate = fromDate;
    } else {
      const monthsBack = months === "last36" ? 35 : 23;
      const from = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
      fromDate = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
      toDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    // Call Poconverto API
    const url = `${baseUrl}/api/analytics/monthly?client_key=${clientIntegration.poconverto_client_key}&from=${fromDate}&to=${toDate}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `Poconverto API error [${response.status}]: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analyticsData = await response.json();
    const monthlyData = analyticsData.data || analyticsData.months || analyticsData;

    if (!Array.isArray(monthlyData)) {
      return new Response(JSON.stringify({ error: "Unexpected API response format", raw: analyticsData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let upsertedCount = 0;

    for (const item of monthlyData) {
      const year = item.year || parseInt(item.date?.split("-")[0]);
      const month = item.month || parseInt(item.date?.split("-")[1]);

      if (!year || !month) continue;

      const row = {
        client_id,
        year,
        month,
        net_sales: item.net_sales ?? item.netSales ?? 0,
        gross_sales: item.gross_sales ?? item.grossSales ?? 0,
        discounts: item.discounts ?? 0,
        refunds: item.refunds ?? 0,
        orders: item.orders ?? 0,
        sessions: item.sessions ?? 0,
        ad_spend_meta: item.ad_spend_meta ?? item.adSpendMeta ?? item.meta_spend ?? 0,
        ad_spend_google: item.ad_spend_google ?? item.adSpendGoogle ?? item.google_spend ?? 0,
        ad_spend_tiktok: item.ad_spend_tiktok ?? item.adSpendTiktok ?? item.tiktok_spend ?? 0,
        ad_spend_total: item.ad_spend_total ?? item.adSpendTotal ?? item.total_spend ?? 0,
        // Shopify metrics
        new_customers: item.new_customers ?? item.newCustomers ?? 0,
        returning_customers: item.returning_customers ?? item.returningCustomers ?? 0,
        avg_order_value: item.avg_order_value ?? item.avgOrderValue ?? item.aov ?? 0,
        conversion_rate: item.conversion_rate ?? item.conversionRate ?? 0,
        // GA metrics
        page_views: item.page_views ?? item.pageViews ?? 0,
        bounce_rate: item.bounce_rate ?? item.bounceRate ?? 0,
        avg_session_duration: item.avg_session_duration ?? item.avgSessionDuration ?? 0,
        // Per-channel ads detail
        meta_impressions: item.meta_impressions ?? 0,
        meta_clicks: item.meta_clicks ?? 0,
        meta_cpc: item.meta_cpc ?? 0,
        meta_cpm: item.meta_cpm ?? 0,
        meta_roas: item.meta_roas ?? 0,
        google_impressions: item.google_impressions ?? 0,
        google_clicks: item.google_clicks ?? 0,
        google_cpc: item.google_cpc ?? 0,
        google_cpm: item.google_cpm ?? 0,
        google_roas: item.google_roas ?? 0,
        tiktok_impressions: item.tiktok_impressions ?? 0,
        tiktok_clicks: item.tiktok_clicks ?? 0,
        tiktok_cpc: item.tiktok_cpc ?? 0,
        tiktok_cpm: item.tiktok_cpm ?? 0,
        tiktok_roas: item.tiktok_roas ?? 0,
        total_ad_impressions: item.total_ad_impressions ?? 0,
        total_ad_clicks: item.total_ad_clicks ?? 0,
        blended_roas: item.blended_roas ?? 0,
        mer: item.mer ?? 0,
        last_synced_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("monthly_analytics_snapshots")
        .upsert(row, { onConflict: "client_id,year,month" });

      if (!error) upsertedCount++;
    }

    return new Response(JSON.stringify({ success: true, upserted: upsertedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
