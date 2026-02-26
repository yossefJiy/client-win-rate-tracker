import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ICOUNT_BASE = "https://api.icount.co.il/api/v3.php";
const DEFAULT_DOCTYPES = ["invoice", "receipt", "invrec"];

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0); // month is 1-based here
}

async function icountPost(endpoint: string, body: Record<string, unknown>, apiToken: string) {
  const res = await fetch(`${ICOUNT_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiToken}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function icountGet(endpoint: string, apiToken: string) {
  const res = await fetch(`${ICOUNT_BASE}${endpoint}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${apiToken}` },
  });
  return res.json();
}

// Search docs for a given doctype and date range
async function searchDocs(doctype: string, startDate: string, endDate: string, apiToken: string) {
  try {
    const result = await icountPost("/doc/search", {
      doctype,
      start_date: startDate,
      end_date: endDate,
      detail_level: 1,
    }, apiToken);

    if (!result.status) {
      // Try alternate field names
      const result2 = await icountPost("/doc/search", {
        doctype,
        fromdate: startDate,
        todate: endDate,
      }, apiToken);
      if (!result2.status) {
        console.warn(`[icount-sync] doc/search failed for ${doctype}: ${result2.reason || JSON.stringify(result2)}`);
        return { docs: [], error: result2.reason || "unknown" };
      }
      return { docs: result2.docs || result2.results_list || [], error: null };
    }
    return { docs: result.docs || result.results_list || [], error: null };
  } catch (e) {
    console.error(`[icount-sync] Error searching ${doctype}:`, e.message);
    return { docs: [], error: e.message };
  }
}

// Get doc details (for payment info)
async function getDocInfo(doctype: string, docnum: string, apiToken: string) {
  try {
    const result = await icountPost("/doc/info", { doctype, docnum }, apiToken);
    if (!result.status) return null;
    return result;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { client_id, action, months_back, doctypes: customDoctypes } = await req.json();
    const apiToken = Deno.env.get("ICOUNT_API_TOKEN");

    if (!apiToken) {
      return new Response(JSON.stringify({ error: "ICOUNT_API_TOKEN secret not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test mode
    if (action === "test") {
      const testResult = await icountGet("/app/info", apiToken);
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

    // Get integration record
    const { data: integration } = await supabase
      .from("client_integrations")
      .select("id")
      .eq("client_id", client_id)
      .maybeSingle();

    if (!integration) {
      return new Response(JSON.stringify({ error: "No integration found for client" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const integrationId = integration.id;
    const doctypesToSync = customDoctypes || DEFAULT_DOCTYPES;

    // Determine date range based on action
    const today = new Date();
    let startDate: Date;
    let runType: string;

    if (action === "backfill") {
      startDate = addMonths(today, -(months_back || 24));
      runType = "backfill";
    } else if (action === "sync_daily") {
      // Ongoing: last 14 days (or 30 days in first week of month)
      const dayOfMonth = today.getDate();
      const daysBack = dayOfMonth <= 7 ? 30 : 14;
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - daysBack);
      runType = "daily";
    } else {
      // Default: sync current month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      runType = "manual";
    }

    // Create sync run log
    const { data: syncRun } = await supabase
      .from("icount_sync_runs")
      .insert({
        client_id,
        integration_id: integrationId,
        run_type: runType,
        status: "running",
      })
      .select("id")
      .single();

    const syncRunId = syncRun?.id;
    let totalDocsUpserted = 0;
    let monthsProcessed = 0;
    const errors: string[] = [];

    // Process month by month
    let currentStart = new Date(startDate);

    while (currentStart <= today) {
      const year = currentStart.getFullYear();
      const month = currentStart.getMonth(); // 0-based
      const monthEnd = lastDayOfMonth(year, month + 1);
      const endDate = monthEnd > today ? today : monthEnd;

      const startStr = formatDate(currentStart);
      const endStr = formatDate(endDate);

      console.log(`[icount-sync] Processing ${startStr} to ${endStr}`);

      for (const doctype of doctypesToSync) {
        const { docs, error } = await searchDocs(doctype, startStr, endStr, apiToken);

        if (error) {
          errors.push(`${doctype} ${startStr}-${endStr}: ${error}`);
          continue;
        }

        console.log(`[icount-sync] ${doctype}: found ${docs.length} docs`);

        for (const doc of docs) {
          const docnum = String(doc.docnum || doc.id || doc.docid);
          const subtotalBeforeVat = parseFloat(doc.totalsum || doc.total_wo_vat || doc.total_before_vat || doc.total || 0);
          const totalIncVat = parseFloat(doc.totalwithvat || doc.total || 0);
          const vatAmount = totalIncVat - subtotalBeforeVat;

          // Upsert document
          const { error: upsertErr } = await supabase
            .from("icount_documents")
            .upsert({
              client_id,
              integration_id: integrationId,
              doctype,
              docnum,
              dateissued: doc.dateissued || doc.date || null,
              status: doc.status || null,
              subtotal_before_vat: subtotalBeforeVat,
              total_including_vat: totalIncVat,
              vat_amount: vatAmount > 0 ? vatAmount : null,
              paydate: doc.paydate || null,
              currency_original: doc.currency || null,
              raw_json: doc,
              synced_at: new Date().toISOString(),
            }, {
              onConflict: "integration_id,doctype,docnum",
            });

          if (upsertErr) {
            console.error(`[icount-sync] Upsert error for ${doctype}/${docnum}:`, upsertErr.message);
            errors.push(`upsert ${doctype}/${docnum}: ${upsertErr.message}`);
          } else {
            totalDocsUpserted++;
          }

          // Check for payment info
          if (doc.payments && Array.isArray(doc.payments)) {
            for (const pmt of doc.payments) {
              await supabase.from("icount_payments").insert({
                client_id,
                integration_id: integrationId,
                doctype,
                docnum,
                payment_date: pmt.date || pmt.paydate || null,
                amount_including_vat: parseFloat(pmt.amount || pmt.sum || 0),
                method: pmt.method || pmt.type || null,
                raw_json: pmt,
                synced_at: new Date().toISOString(),
              });
            }
          }
        }
      }

      monthsProcessed++;
      // Move to next month
      currentStart = new Date(year, month + 1, 1);
    }

    // After all docs synced, aggregate into monthly_offline_revenue
    // Group icount_documents by month for this client
    const { data: allDocs } = await supabase
      .from("icount_documents")
      .select("dateissued, subtotal_before_vat, total_including_vat, doctype")
      .eq("client_id", client_id)
      .eq("integration_id", integrationId)
      .not("dateissued", "is", null);

    if (allDocs && allDocs.length > 0) {
      // Group by year-month
      const monthlyTotals: Record<string, { beforeVat: number; inclVat: number; count: number }> = {};

      for (const doc of allDocs) {
        const d = new Date(doc.dateissued);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        if (!monthlyTotals[key]) {
          monthlyTotals[key] = { beforeVat: 0, inclVat: 0, count: 0 };
        }
        monthlyTotals[key].beforeVat += Number(doc.subtotal_before_vat) || 0;
        monthlyTotals[key].inclVat += Number(doc.total_including_vat) || 0;
        monthlyTotals[key].count++;
      }

      // Upsert into monthly_offline_revenue
      for (const [key, totals] of Object.entries(monthlyTotals)) {
        const [yearStr, monthStr] = key.split("-");
        const yr = parseInt(yearStr);
        const mo = parseInt(monthStr);

        const { data: existing } = await supabase
          .from("monthly_offline_revenue")
          .select("id")
          .eq("client_id", client_id)
          .eq("year", yr)
          .eq("month", mo)
          .eq("source", "icount_invoices")
          .maybeSingle();

        const row = {
          client_id,
          year: yr,
          month: mo,
          amount_gross: totals.inclVat,
          amount_net: totals.beforeVat,
          source: "icount_invoices",
          notes: `${totals.count} מסמכים מאייקאונט`,
          last_synced_at: new Date().toISOString(),
        };

        if (existing) {
          await supabase.from("monthly_offline_revenue").update(row).eq("id", existing.id);
        } else {
          await supabase.from("monthly_offline_revenue").insert(row);
        }
      }
    }

    // Update sync run
    if (syncRunId) {
      await supabase.from("icount_sync_runs").update({
        status: errors.length > 0 ? "completed_with_errors" : "completed",
        finished_at: new Date().toISOString(),
        months_processed: monthsProcessed,
        docs_upserted: totalDocsUpserted,
        errors: errors.length > 0 ? errors : null,
      }).eq("id", syncRunId);
    }

    return new Response(JSON.stringify({
      success: true,
      run_type: runType,
      months_processed: monthsProcessed,
      docs_upserted: totalDocsUpserted,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[icount-sync] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
