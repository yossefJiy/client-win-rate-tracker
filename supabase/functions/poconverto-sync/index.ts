import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONVERTO_BRIDGE_URL = "https://ovkuabbfubtiwnlksmxd.supabase.co/functions/v1/data-api";

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

    const { client_id, months, type } = await req.json();

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine what to fetch from Converto bridge
    const bridgeType = type || "campaigns";
    const url = `${CONVERTO_BRIDGE_URL}?bridge=true&type=${bridgeType}`;
    
    console.log(`[poconverto-sync] Fetching ${bridgeType} from Converto bridge...`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": convertoApiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[poconverto-sync] Bridge error [${response.status}]:`, errText);
      return new Response(JSON.stringify({ error: `Converto bridge error [${response.status}]: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    console.log(`[poconverto-sync] Got ${result.count || 0} ${bridgeType} records from Converto`);

    // If fetching analytics_snapshots (when added to bridge), map to our monthly_analytics_snapshots
    if (bridgeType === "analytics_snapshots" && Array.isArray(result.data)) {
      let upsertedCount = 0;

      for (const item of result.data) {
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
            row.gross_sales = data.summary?.grossSales || metrics.totalRevenue || 0;
            row.net_sales = data.summary?.netSales || data.summary?.totalRevenue || 0;
            row.orders = data.summary?.totalOrders || metrics.totalOrders || 0;
            row.sessions = data.summary?.sessions || 0;
            row.avg_order_value = metrics.avgOrderValue || 0;
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
            row.page_views = metrics.pageviews || 0;
            row.bounce_rate = metrics.bounceRate || 0;
            row.sessions = metrics.sessions || 0;
            break;
        }

        // Calculate totals
        row.ad_spend_total = (row.ad_spend_meta || 0) + (row.ad_spend_google || 0) + (row.ad_spend_tiktok || 0);
        row.total_ad_impressions = (row.meta_impressions || 0) + (row.google_impressions || 0) + (row.tiktok_impressions || 0);
        row.total_ad_clicks = (row.meta_clicks || 0) + (row.google_clicks || 0) + (row.tiktok_clicks || 0);

        const { error } = await supabase
          .from("monthly_analytics_snapshots")
          .upsert(row, { onConflict: "client_id,year,month" });

        if (!error) upsertedCount++;
        else console.error(`[poconverto-sync] Upsert error:`, error);
      }

      return new Response(JSON.stringify({ success: true, upserted: upsertedCount, source: "converto_bridge" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For other types (campaigns, clients, etc.), just return the data
    return new Response(JSON.stringify({ 
      success: true, 
      data: result.data, 
      count: result.count || 0,
      type: bridgeType,
      note: bridgeType !== "analytics_snapshots" 
        ? "To sync analytics, add 'analytics_snapshots' to the bridge tableMap in Converto" 
        : undefined
    }), {
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
