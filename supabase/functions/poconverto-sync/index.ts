import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONVERTO_BRIDGE_URL = "https://ovkuabbfubtiwnlksmxd.supabase.co/functions/v1/api-bridge";

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
    const { client_id, action } = body;

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the Converto client key mapping
    const { data: integration } = await supabase
      .from("client_integrations")
      .select("poconverto_client_key")
      .eq("client_id", client_id)
      .maybeSingle();

    const convertoClientId = integration?.poconverto_client_key;

    if (action === "sync_all" || !action) {
      const results: Record<string, any> = {};
      const errors: string[] = [];
      
      const analyticsResult = await fetchFromBridge(convertoApiKey, "analytics_snapshots");
      if (analyticsResult.success && analyticsResult.data && analyticsResult.data.length > 0) {
        // Filter by Converto client_id if mapped
        let relevantData = analyticsResult.data;
        if (convertoClientId) {
          relevantData = analyticsResult.data.filter((item: any) => item.client_id === convertoClientId);
          console.log(`[poconverto-sync] Filtered to ${relevantData.length} records for Converto client ${convertoClientId}`);
        } else {
          // No mapping - show available Converto client IDs for debugging
          const uniqueClients = [...new Set(analyticsResult.data.map((item: any) => item.client_id))];
          console.log(`[poconverto-sync] No poconverto_client_key set. Available Converto clients:`, uniqueClients);
          errors.push(`poconverto_client_key not set. Available Converto client IDs: ${uniqueClients.join(", ")}`);
          results.analytics_snapshots_total = analyticsResult.data.length;
          results.available_converto_clients = uniqueClients;
        }

        if (relevantData.length > 0) {
          // Group by year/month and SUM daily snapshots per platform
          const monthlyMap: Record<string, Record<string, any>> = {};

          for (const item of relevantData) {
            const snapshotDate = new Date(item.snapshot_date || item.updated_at || new Date());
            const year = snapshotDate.getFullYear();
            const month = snapshotDate.getMonth() + 1;
            const key = `${year}-${month}`;
            
            if (!monthlyMap[key]) {
              monthlyMap[key] = {
                client_id,
                year,
                month,
                last_synced_at: new Date().toISOString(),
              };
            }

            const row = monthlyMap[key];
            const metrics = item.metrics || {};
            const data = item.data || {};

            switch (item.platform) {
              case "shopify":
              case "woocommerce": {
                const dayRevenue = data.total_revenue || metrics.total_revenue || 0;
                const dayOrders = data.orders_count || metrics.orders_count || 0;
                const dayCustomers = data.customers_count || metrics.customers_count || 0;
                const daySessions = data.sessions || metrics.sessions || 0;
                const dayDiscounts = data.discounts || 0;
                const dayRefunds = data.refunds || 0;
                row.gross_sales = (row.gross_sales || 0) + dayRevenue;
                row.net_sales = (row.net_sales || 0) + dayRevenue;
                row.orders = (row.orders || 0) + dayOrders;
                row.new_customers = (row.new_customers || 0) + dayCustomers;
                row.sessions = (row.sessions || 0) + daySessions;
                row.discounts = (row.discounts || 0) + dayDiscounts;
                row.refunds = (row.refunds || 0) + dayRefunds;
                // AVG fields: weighted by orders
                row._shopify_days = (row._shopify_days || 0) + 1;
                row._aov_sum = (row._aov_sum || 0) + (data.average_order_value || metrics.average_order_value || 0);
                row._cvr_sum = (row._cvr_sum || 0) + parseFloat(data.conversion_rate || metrics.conversion_rate || "0");
                break;
              }
              case "google_ads": {
                const spent = data.campaigns?.reduce((s: number, c: any) => s + (c.spent || 0), 0) || metrics.total_spent || 0;
                const impressions = data.campaigns?.reduce((s: number, c: any) => s + (c.impressions || 0), 0) || metrics.total_impressions || 0;
                const clicks = data.campaigns?.reduce((s: number, c: any) => s + (c.clicks || 0), 0) || metrics.total_clicks || 0;
                row.ad_spend_google = (row.ad_spend_google || 0) + spent;
                row.google_impressions = (row.google_impressions || 0) + impressions;
                row.google_clicks = (row.google_clicks || 0) + clicks;
                row._google_conv = (row._google_conv || 0) + (data.campaigns?.reduce((s: number, c: any) => s + (c.conversions || 0), 0) || 0);
                break;
              }
              case "facebook_ads": {
                const spent = data.campaigns?.reduce((s: number, c: any) => s + (c.spent || 0), 0) || metrics.total_spent || 0;
                const impressions = data.campaigns?.reduce((s: number, c: any) => s + (c.impressions || 0), 0) || metrics.total_impressions || 0;
                const clicks = data.campaigns?.reduce((s: number, c: any) => s + (c.clicks || 0), 0) || metrics.total_clicks || 0;
                row.ad_spend_meta = (row.ad_spend_meta || 0) + spent;
                row.meta_impressions = (row.meta_impressions || 0) + impressions;
                row.meta_clicks = (row.meta_clicks || 0) + clicks;
                row._meta_conv = (row._meta_conv || 0) + (data.campaigns?.reduce((s: number, c: any) => s + (c.conversions || 0), 0) || 0);
                break;
              }
              case "tiktok_ads": {
                const spent = data.campaigns?.reduce((s: number, c: any) => s + (c.spent || 0), 0) || metrics.total_spent || 0;
                const impressions = data.campaigns?.reduce((s: number, c: any) => s + (c.impressions || 0), 0) || metrics.total_impressions || 0;
                const clicks = data.campaigns?.reduce((s: number, c: any) => s + (c.clicks || 0), 0) || metrics.total_clicks || 0;
                row.ad_spend_tiktok = (row.ad_spend_tiktok || 0) + spent;
                row.tiktok_impressions = (row.tiktok_impressions || 0) + impressions;
                row.tiktok_clicks = (row.tiktok_clicks || 0) + clicks;
                break;
              }
              case "google_analytics": {
                const dayPV = metrics.pageviews || data.pageviews || 0;
                const daySess = metrics.sessions || data.sessions || 0;
                row.page_views = (row.page_views || 0) + dayPV;
                row.sessions = (row.sessions || 0) + daySess;
                row._ga_days = (row._ga_days || 0) + 1;
                row._bounce_sum = (row._bounce_sum || 0) + parseFloat(metrics.bounce_rate || metrics.bounceRate || data.bounce_rate || data.bounceRate || "0");
                row._dur_sum = (row._dur_sum || 0) + (metrics.avg_session_duration || data.avgSessionDuration || data.avg_session_duration || 0);
                break;
              }
            }
          }

          // Calculate totals and batch upsert
          const rows = Object.values(monthlyMap).map(row => {
            // Compute averages from daily sums
            if (row._shopify_days > 0) {
              row.avg_order_value = row.orders > 0 ? row.gross_sales / row.orders : row._aov_sum / row._shopify_days;
              row.conversion_rate = row._cvr_sum / row._shopify_days;
            }
            if (row._ga_days > 0) {
              row.bounce_rate = row._bounce_sum / row._ga_days;
              row.avg_session_duration = row._dur_sum / row._ga_days;
            }
            // Compute CPC/CPM/ROAS from totals
            row.google_cpc = row.google_clicks > 0 ? row.ad_spend_google / row.google_clicks : 0;
            row.google_cpm = row.google_impressions > 0 ? (row.ad_spend_google / row.google_impressions) * 1000 : 0;
            row.google_roas = row.ad_spend_google > 0 ? (row._google_conv || 0) / row.ad_spend_google : 0;
            row.meta_cpc = row.meta_clicks > 0 ? row.ad_spend_meta / row.meta_clicks : 0;
            row.meta_cpm = row.meta_impressions > 0 ? (row.ad_spend_meta / row.meta_impressions) * 1000 : 0;
            row.meta_roas = row.ad_spend_meta > 0 ? (row._meta_conv || 0) / row.ad_spend_meta : 0;
            row.tiktok_cpc = row.tiktok_clicks > 0 ? row.ad_spend_tiktok / row.tiktok_clicks : 0;
            row.tiktok_cpm = row.tiktok_impressions > 0 ? (row.ad_spend_tiktok / row.tiktok_impressions) * 1000 : 0;
            // Totals
            row.ad_spend_total = (row.ad_spend_meta || 0) + (row.ad_spend_google || 0) + (row.ad_spend_tiktok || 0);
            row.total_ad_impressions = (row.meta_impressions || 0) + (row.google_impressions || 0) + (row.tiktok_impressions || 0);
            row.total_ad_clicks = (row.meta_clicks || 0) + (row.google_clicks || 0) + (row.tiktok_clicks || 0);
            if (row.net_sales && row.ad_spend_total > 0) {
              row.blended_roas = row.net_sales / row.ad_spend_total;
              row.mer = row.net_sales / row.ad_spend_total;
            }
            // Remove temp fields
            delete row._shopify_days; delete row._aov_sum; delete row._cvr_sum;
            delete row._ga_days; delete row._bounce_sum; delete row._dur_sum;
            delete row._google_conv; delete row._meta_conv;
            return row;
          });

          const { error } = await supabase
            .from("monthly_analytics_snapshots")
            .upsert(rows, { onConflict: "client_id,year,month" });

          if (error) {
            console.error(`[poconverto-sync] Batch upsert error:`, error.message);
            errors.push(`Upsert error: ${error.message}`);
          } else {
            results.upserted = rows.length;
          }
          results.analytics_snapshots = relevantData.length;
          results.months_synced = rows.length;
        }
      } else {
        errors.push("analytics_snapshots not available in bridge");
      }

      return new Response(JSON.stringify({ 
        success: true, 
        results,
        errors: errors.length > 0 ? errors : undefined,
        message: errors.length > 0 
          ? errors.join("; ")
          : `סנכרון הושלם: ${results.months_synced || 0} חודשים עודכנו`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Debug action: show raw data for this client
    if (action === "debug_raw") {
      const analyticsResult = await fetchFromBridge(convertoApiKey, "analytics_snapshots");
      if (analyticsResult.success && analyticsResult.data) {
        const clientData = convertoClientId 
          ? analyticsResult.data.filter((item: any) => item.client_id === convertoClientId)
          : analyticsResult.data;
        // Return first 3 records of each platform for inspection
        const byPlatform: Record<string, any[]> = {};
        for (const item of clientData) {
          const p = item.platform || "unknown";
          if (!byPlatform[p]) byPlatform[p] = [];
          if (byPlatform[p].length < 2) byPlatform[p].push(item);
        }
        return new Response(JSON.stringify({ platforms: Object.keys(byPlatform), samples: byPlatform, total: clientData.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
