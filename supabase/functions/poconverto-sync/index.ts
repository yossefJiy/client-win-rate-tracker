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
          // For each platform+month, keep only the LATEST snapshot (by snapshot_date)
          const latestByPlatformMonth: Record<string, any> = {};
          for (const item of relevantData) {
            const snapshotDate = new Date(item.snapshot_date || item.updated_at || new Date());
            const year = snapshotDate.getFullYear();
            const month = snapshotDate.getMonth() + 1;
            const platform = item.platform || "unknown";
            const key = `${year}-${month}-${platform}`;
            if (!latestByPlatformMonth[key] || snapshotDate > new Date(latestByPlatformMonth[key].snapshot_date || latestByPlatformMonth[key].updated_at)) {
              latestByPlatformMonth[key] = item;
            }
          }
          const dedupedData = Object.values(latestByPlatformMonth);
          console.log(`[poconverto-sync] Deduped to ${dedupedData.length} latest snapshots (from ${relevantData.length} total)`);

          // Group by year/month and merge platforms
          const monthlyMap: Record<string, Record<string, any>> = {};

          for (const item of dedupedData) {
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
              case "woocommerce":
                row.gross_sales = data.total_revenue || metrics.total_revenue || data.summary?.grossSales || 0;
                row.net_sales = data.total_revenue || metrics.total_revenue || data.summary?.netSales || 0;
                row.orders = data.orders_count || metrics.orders_count || data.summary?.totalOrders || 0;
                row.avg_order_value = data.average_order_value || metrics.average_order_value || data.summary?.avgOrderValue || 0;
                row.conversion_rate = parseFloat(data.conversion_rate || metrics.conversion_rate || data.summary?.conversionRate || "0");
                row.new_customers = data.customers_count || metrics.customers_count || data.summary?.uniqueCustomers || 0;
                row.sessions = data.sessions || metrics.sessions || row.sessions || 0;
                row.discounts = data.discounts || data.summary?.discounts || 0;
                row.refunds = data.refunds || data.summary?.returns || 0;
                break;
              case "google_ads": {
                const spent = data.campaigns?.reduce((s: number, c: any) => s + (c.spent || 0), 0) || metrics.total_spent || 0;
                const impressions = data.campaigns?.reduce((s: number, c: any) => s + (c.impressions || 0), 0) || metrics.total_impressions || 0;
                const clicks = data.campaigns?.reduce((s: number, c: any) => s + (c.clicks || 0), 0) || metrics.total_clicks || 0;
                row.ad_spend_google = spent;
                row.google_impressions = impressions;
                row.google_clicks = clicks;
                row.google_cpc = clicks > 0 ? spent / clicks : 0;
                row.google_cpm = impressions > 0 ? (spent / impressions) * 1000 : 0;
                const convValue = data.campaigns?.reduce((s: number, c: any) => s + (c.conversions || 0), 0) || 0;
                row.google_roas = spent > 0 ? convValue / spent : 0;
                break;
              }
              case "facebook_ads": {
                const spent = data.campaigns?.reduce((s: number, c: any) => s + (c.spent || 0), 0) || metrics.total_spent || 0;
                const impressions = data.campaigns?.reduce((s: number, c: any) => s + (c.impressions || 0), 0) || metrics.total_impressions || 0;
                const clicks = data.campaigns?.reduce((s: number, c: any) => s + (c.clicks || 0), 0) || metrics.total_clicks || 0;
                row.ad_spend_meta = spent;
                row.meta_impressions = impressions;
                row.meta_clicks = clicks;
                row.meta_cpc = clicks > 0 ? spent / clicks : 0;
                row.meta_cpm = impressions > 0 ? (spent / impressions) * 1000 : 0;
                const convValue = data.campaigns?.reduce((s: number, c: any) => s + (c.conversions || 0), 0) || 0;
                row.meta_roas = spent > 0 ? convValue / spent : 0;
                break;
              }
              case "tiktok_ads": {
                const spent = data.campaigns?.reduce((s: number, c: any) => s + (c.spent || 0), 0) || metrics.total_spent || 0;
                const impressions = data.campaigns?.reduce((s: number, c: any) => s + (c.impressions || 0), 0) || metrics.total_impressions || 0;
                const clicks = data.campaigns?.reduce((s: number, c: any) => s + (c.clicks || 0), 0) || metrics.total_clicks || 0;
                row.ad_spend_tiktok = spent;
                row.tiktok_impressions = impressions;
                row.tiktok_clicks = clicks;
                row.tiktok_cpc = clicks > 0 ? spent / clicks : 0;
                row.tiktok_cpm = impressions > 0 ? (spent / impressions) * 1000 : 0;
                break;
              }
              case "google_analytics":
                row.page_views = metrics.pageviews || data.pageviews || 0;
                row.bounce_rate = parseFloat(metrics.bounce_rate || metrics.bounceRate || data.bounce_rate || data.bounceRate || "0");
                row.sessions = metrics.sessions || data.sessions || row.sessions || 0;
                row.avg_session_duration = metrics.avg_session_duration || data.avgSessionDuration || data.avg_session_duration || 0;
                break;
            }
          }

          // Calculate totals and batch upsert
          const rows = Object.values(monthlyMap).map(row => {
            row.ad_spend_total = (row.ad_spend_meta || 0) + (row.ad_spend_google || 0) + (row.ad_spend_tiktok || 0);
            row.total_ad_impressions = (row.meta_impressions || 0) + (row.google_impressions || 0) + (row.tiktok_impressions || 0);
            row.total_ad_clicks = (row.meta_clicks || 0) + (row.google_clicks || 0) + (row.tiktok_clicks || 0);
            if (row.net_sales && row.ad_spend_total > 0) {
              row.blended_roas = row.net_sales / row.ad_spend_total;
              row.mer = row.net_sales / row.ad_spend_total;
            }
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
