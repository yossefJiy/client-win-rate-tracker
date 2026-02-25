import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONVERTO_BRIDGE_URL = "https://ovkuabbfubtiwnlksmxd.supabase.co/functions/v1/data-api";

async function fetchFromBridge(apiKey: string, type: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  const url = `${CONVERTO_BRIDGE_URL}?bridge=true&type=${type}`;
  console.log(`[poconverto-sync] Fetching ${type} from Converto bridge...`);
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
  });

  const text = await response.text();
  
  if (!response.ok) {
    console.error(`[poconverto-sync] Bridge error for ${type} [${response.status}]:`, text);
    return { success: false, error: `[${response.status}]: ${text}` };
  }

  try {
    const result = JSON.parse(text);
    console.log(`[poconverto-sync] Got ${result.count || result.data?.length || 0} ${type} records`);
    return { success: true, data: result.data || [] };
  } catch {
    return { success: false, error: "Invalid JSON response" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const convertoApiKey = Deno.env.get("CONVERTO_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!convertoApiKey) {
      return new Response(JSON.stringify({ error: "CONVERTO_API_KEY not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { client_id, months, action } = body;

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: sync_all - Try to pull all available data from Converto bridge
    if (action === "sync_all" || !action) {
      const results: Record<string, any> = {};
      const errors: string[] = [];
      
      // Try to fetch analytics_snapshots (main goal)
      const analyticsResult = await fetchFromBridge(convertoApiKey, "analytics_snapshots");
      if (analyticsResult.success && analyticsResult.data && analyticsResult.data.length > 0) {
        results.analytics_snapshots = analyticsResult.data.length;
        
        // Map Converto analytics_snapshots to our monthly_analytics_snapshots
        let upsertedCount = 0;
        for (const item of analyticsResult.data) {
          const metrics = item.metrics || {};
          const data = item.data || {};
          const snapshotDate = new Date(item.snapshot_date || item.updated_at || new Date());
          const year = snapshotDate.getFullYear();
          const month = snapshotDate.getMonth() + 1;

          const row: Record<string, any> = {
            client_id,
            year,
            month,
            last_synced_at: new Date().toISOString(),
          };

          // Map based on platform
          switch (item.platform) {
            case "shopify":
              row.gross_sales = data.summary?.grossSales || data.summary?.totalGross || metrics.totalRevenue || 0;
              row.net_sales = data.summary?.netSales || data.summary?.totalRevenue || 0;
              row.orders = data.summary?.totalOrders || metrics.totalOrders || 0;
              row.sessions = data.summary?.sessions || 0;
              row.avg_order_value = data.summary?.avgOrderValue || metrics.avgOrderValue || 0;
              row.conversion_rate = data.summary?.conversionRate || metrics.conversionRate || 0;
              row.new_customers = data.summary?.uniqueCustomers || 0;
              row.discounts = data.summary?.discounts || 0;
              row.refunds = data.summary?.returns || 0;
              break;
            case "google_ads":
              row.ad_spend_google = data.account?.totalCost || metrics.totalCost || 0;
              row.google_impressions = data.account?.totalImpressions || metrics.totalImpressions || 0;
              row.google_clicks = data.account?.totalClicks || metrics.totalClicks || 0;
              row.google_roas = data.account?.totalConversionValue && data.account?.totalCost
                ? data.account.totalConversionValue / data.account.totalCost : 0;
              row.google_cpc = row.google_clicks > 0 ? row.ad_spend_google / row.google_clicks : 0;
              row.google_cpm = row.google_impressions > 0 ? (row.ad_spend_google / row.google_impressions) * 1000 : 0;
              break;
            case "facebook_ads":
              row.ad_spend_meta = data.totals?.cost || metrics.totalCost || 0;
              row.meta_impressions = data.totals?.impressions || metrics.totalImpressions || 0;
              row.meta_clicks = data.totals?.clicks || metrics.totalClicks || 0;
              row.meta_roas = data.totals?.conversionValue && data.totals?.cost
                ? data.totals.conversionValue / data.totals.cost : 0;
              row.meta_cpc = row.meta_clicks > 0 ? row.ad_spend_meta / row.meta_clicks : 0;
              row.meta_cpm = row.meta_impressions > 0 ? (row.ad_spend_meta / row.meta_impressions) * 1000 : 0;
              break;
            case "google_analytics":
              row.page_views = metrics.pageviews || data.pageviews || 0;
              row.bounce_rate = metrics.bounceRate || data.bounceRate || 0;
              row.sessions = metrics.sessions || data.sessions || 0;
              row.avg_session_duration = data.avgSessionDuration || 0;
              break;
          }

          // Calculate totals
          row.ad_spend_total = (row.ad_spend_meta || 0) + (row.ad_spend_google || 0) + (row.ad_spend_tiktok || 0);
          row.total_ad_impressions = (row.meta_impressions || 0) + (row.google_impressions || 0) + (row.tiktok_impressions || 0);
          row.total_ad_clicks = (row.meta_clicks || 0) + (row.google_clicks || 0) + (row.tiktok_clicks || 0);
          if (row.net_sales && row.ad_spend_total > 0) {
            row.blended_roas = row.net_sales / row.ad_spend_total;
            row.mer = row.net_sales / row.ad_spend_total;
          }

          const { error } = await supabase
            .from("monthly_analytics_snapshots")
            .upsert(row, { onConflict: "client_id,year,month" });

          if (!error) upsertedCount++;
          else console.error(`[poconverto-sync] Upsert error:`, error.message);
        }
        
        results.upserted = upsertedCount;
      } else {
        errors.push("analytics_snapshots not available in bridge - add it to Converto's tableMap");
      }

      // Also try to pull campaigns data
      const campaignsResult = await fetchFromBridge(convertoApiKey, "campaigns");
      if (campaignsResult.success) {
        results.campaigns = campaignsResult.data?.length || 0;
      }

      // Try integrations
      const clientsResult = await fetchFromBridge(convertoApiKey, "clients");
      if (clientsResult.success) {
        results.clients = clientsResult.data?.length || 0;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        results,
        errors: errors.length > 0 ? errors : undefined,
        message: errors.length > 0 
          ? "חיבור תקין! כדי למשוך אנליטיקס, צריך להוסיף analytics_snapshots ל-bridge בקונברטו"
          : "סנכרון הושלם בהצלחה"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: fetch specific type
    const result = await fetchFromBridge(convertoApiKey, action || "campaigns");
    return new Response(JSON.stringify({ success: result.success, data: result.data, error: result.error }), {
      status: result.success ? 200 : 502,
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
