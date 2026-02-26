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

    const { client_id, year, month } = await req.json();

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get client iCount settings
    const { data: clientIntegration } = await supabase
      .from("client_integrations")
      .select("*")
      .eq("client_id", client_id)
      .single();

    if (!clientIntegration?.icount_company_id || !clientIntegration?.icount_api_token || !clientIntegration?.icount_user) {
      return new Response(JSON.stringify({ error: "iCount settings not configured for this client (need company_id, user, and api_token)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyId = clientIntegration.icount_company_id;
    const icountUser = clientIntegration.icount_user;
    const apiToken = clientIntegration.icount_api_token;

    // Calculate date range
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || (now.getMonth() + 1);
    
    const fromDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    const toDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${lastDay}`;

    console.log(`[icount-sync] Fetching docs for ${companyId} user=${icountUser} from ${fromDate} to ${toDate}`);

    // Call iCount API to get invoices/receipts
    const icountUrl = `https://api.icount.co.il/api/v3.php/doc/list`;
    const response = await fetch(icountUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cid: companyId,
        user: icountUser,
        pass: apiToken,
        doctype: "invrec",
        fromdate: fromDate,
        todate: toDate,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `iCount API error [${response.status}]: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    
    if (!result.status || result.status !== true) {
      return new Response(JSON.stringify({ error: "iCount API returned error", details: result.reason || result }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docs = result.docs || [];
    
    // Sum up totals from documents
    let totalGross = 0;
    let totalNet = 0;
    let docCount = 0;

    for (const doc of docs) {
      const gross = parseFloat(doc.total) || 0;
      const net = parseFloat(doc.total_wo_vat || doc.total_before_vat) || gross;
      totalGross += gross;
      totalNet += net;
      docCount++;
    }

    // Upsert to monthly_offline_revenue
    const { data: existing } = await supabase
      .from("monthly_offline_revenue")
      .select("id")
      .eq("client_id", client_id)
      .eq("year", targetYear)
      .eq("month", targetMonth)
      .eq("source", "icount_invoices")
      .maybeSingle();

    const row = {
      client_id,
      year: targetYear,
      month: targetMonth,
      amount_gross: totalGross,
      amount_net: totalNet,
      source: "icount_invoices",
      notes: `${docCount} מסמכים מאייקאונט`,
      last_synced_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase
        .from("monthly_offline_revenue")
        .update(row)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("monthly_offline_revenue")
        .insert(row);
    }

    return new Response(JSON.stringify({ success: true, docs_count: docCount, total_gross: totalGross, total_net: totalNet }), {
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
