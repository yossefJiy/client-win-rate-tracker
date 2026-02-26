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

    const { client_id, year, month, action } = await req.json();

    const apiToken = Deno.env.get("ICOUNT_API_TOKEN");
    if (!apiToken) {
      return new Response(JSON.stringify({ error: "ICOUNT_API_TOKEN secret not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test mode - check if token works
    if (action === "test") {
      const testRes = await fetch("https://api.icount.co.il/api/v3.php/app/info", {
        method: "GET",
        headers: { "Authorization": `Bearer ${apiToken}` },
      });
      const testResult = await testRes.json();
      console.log("[icount-sync] app/info response:", JSON.stringify(testResult));
      return new Response(JSON.stringify({ test: testResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || (now.getMonth() + 1);
    
    const fromDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    const toDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${lastDay}`;

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiToken}`,
    };

    console.log(`[icount-sync] Fetching invrec docs from ${fromDate} to ${toDate}`);

    // Fetch invoices/receipts (invrec)
    const invrecResponse = await fetch("https://api.icount.co.il/api/v3.php/doc/list", {
      method: "POST",
      headers,
      body: JSON.stringify({
        doctype: "invrec",
        fromdate: fromDate,
        todate: toDate,
      }),
    });

    const invrecResult = await invrecResponse.json();
    console.log(`[icount-sync] invrec response: status=${invrecResult.status}, reason=${invrecResult.reason || 'none'}`);

    if (!invrecResult.status) {
      return new Response(JSON.stringify({ error: "iCount API error (invrec)", details: invrecResult.reason || invrecResult }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch credit notes (refunds/cancellations)
    console.log(`[icount-sync] Fetching credit docs from ${fromDate} to ${toDate}`);
    const creditResponse = await fetch("https://api.icount.co.il/api/v3.php/doc/list", {
      method: "POST",
      headers,
      body: JSON.stringify({
        doctype: "credit",
        fromdate: fromDate,
        todate: toDate,
      }),
    });

    const creditResult = await creditResponse.json();
    console.log(`[icount-sync] credit response: status=${creditResult.status}, reason=${creditResult.reason || 'none'}`);

    // Sum invoices
    const invDocs = invrecResult.docs || [];
    let totalGross = 0;
    let totalNet = 0;
    let invCount = 0;

    for (const doc of invDocs) {
      totalGross += parseFloat(doc.total) || 0;
      totalNet += parseFloat(doc.total_wo_vat || doc.total_before_vat) || (parseFloat(doc.total) || 0);
      invCount++;
    }

    // Sum credit notes (refunds)
    let totalRefundsGross = 0;
    let totalRefundsNet = 0;
    let creditCount = 0;

    if (creditResult.status) {
      const creditDocs = creditResult.docs || [];
      for (const doc of creditDocs) {
        totalRefundsGross += parseFloat(doc.total) || 0;
        totalRefundsNet += parseFloat(doc.total_wo_vat || doc.total_before_vat) || (parseFloat(doc.total) || 0);
        creditCount++;
      }
    }

    // Upsert invoices row
    const { data: existingInv } = await supabase
      .from("monthly_offline_revenue")
      .select("id")
      .eq("client_id", client_id)
      .eq("year", targetYear)
      .eq("month", targetMonth)
      .eq("source", "icount_invoices")
      .maybeSingle();

    const invRow = {
      client_id,
      year: targetYear,
      month: targetMonth,
      amount_gross: totalGross,
      amount_net: totalNet,
      source: "icount_invoices",
      notes: `${invCount} מסמכי הכנסה`,
      last_synced_at: new Date().toISOString(),
    };

    if (existingInv) {
      await supabase.from("monthly_offline_revenue").update(invRow).eq("id", existingInv.id);
    } else {
      await supabase.from("monthly_offline_revenue").insert(invRow);
    }

    // Upsert credit/refunds row
    const { data: existingCredit } = await supabase
      .from("monthly_offline_revenue")
      .select("id")
      .eq("client_id", client_id)
      .eq("year", targetYear)
      .eq("month", targetMonth)
      .eq("source", "icount_credits")
      .maybeSingle();

    const creditRow = {
      client_id,
      year: targetYear,
      month: targetMonth,
      amount_gross: totalRefundsGross,
      amount_net: totalRefundsNet,
      source: "icount_credits",
      notes: `${creditCount} מסמכי זיכוי/החזר`,
      last_synced_at: new Date().toISOString(),
    };

    if (existingCredit) {
      await supabase.from("monthly_offline_revenue").update(creditRow).eq("id", existingCredit.id);
    } else if (creditCount > 0) {
      await supabase.from("monthly_offline_revenue").insert(creditRow);
    }

    return new Response(JSON.stringify({
      success: true,
      invoices: { count: invCount, gross: totalGross, net: totalNet },
      credits: { count: creditCount, gross: totalRefundsGross, net: totalRefundsNet },
      net_total: totalGross - totalRefundsGross,
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
