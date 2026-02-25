import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SERVICE_CATALOG_ITEMS = [
  { name: "Meta Ads Management", default_monthly_fee: 2900, currency: "ILS", billing: "monthly" },
  { name: "Google Ads Management", default_monthly_fee: 2900, currency: "ILS", billing: "monthly" },
  { name: "Strategy Meeting", default_monthly_fee: 700, currency: "ILS", billing: "per_session" },
  { name: "One-off Site Management", default_monthly_fee: 290, currency: "ILS", billing: "hourly" },
  { name: "TikTok Ads Management", default_monthly_fee: 2900, currency: "ILS", billing: "monthly" },
  { name: "TikTok Social Management", default_monthly_fee: 2000, currency: "ILS", billing: "monthly" },
  { name: "Operational Systems Spec/Design", default_monthly_fee: 400, currency: "ILS", billing: "hourly" },
  { name: "CRO Site Management (10h/mo)", default_monthly_fee: 290, currency: "ILS", billing: "hourly" },
  { name: "Bi-weekly Strategy Meeting", default_monthly_fee: 700, currency: "ILS", billing: "per_session" },
  { name: "Email Marketing (bi-monthly)", default_monthly_fee: 1770, currency: "ILS", billing: "monthly" },
];

const DEFAULT_TEMPLATES = [
  { serviceName: "Meta Ads Management", platform: "meta", fee: 2900 },
  { serviceName: "Google Ads Management", platform: "google", fee: 2900 },
];

const COMMISSION_TIERS = [
  { threshold_sales: 60000, rate_percent: 14, order_index: 1 },
  { threshold_sales: 80000, rate_percent: 13, order_index: 2 },
  { threshold_sales: 100000, rate_percent: 12, order_index: 3 },
  { threshold_sales: 120000, rate_percent: 11, order_index: 4 },
  { threshold_sales: 150000, rate_percent: 10, order_index: 5 },
];

export function useSeedTamar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // 1. Upsert client
      const { data: existingClients } = await supabase.from("clients").select("id").eq("name", "תמר דרורי");
      let clientId: string;
      if (existingClients && existingClients.length > 0) {
        clientId = existingClients[0].id;
      } else {
        const { data, error } = await supabase.from("clients").insert({ name: "תמר דרורי" }).select().single();
        if (error) throw error;
        clientId = data.id;
      }

      // 2. Upsert service catalog items
      const catalogMap: Record<string, string> = {};
      for (const item of SERVICE_CATALOG_ITEMS) {
        const { data: existing } = await supabase.from("service_catalog").select("id").eq("name", item.name);
        if (existing && existing.length > 0) {
          await supabase.from("service_catalog").update(item).eq("id", existing[0].id);
          catalogMap[item.name] = existing[0].id;
        } else {
          const { data, error } = await supabase.from("service_catalog").insert(item as any).select().single();
          if (error) throw error;
          catalogMap[item.name] = data.id;
        }
      }

      // 3. Create service templates
      for (const tmpl of DEFAULT_TEMPLATES) {
        const catalogId = catalogMap[tmpl.serviceName];
        const { data: existingTmpl } = await supabase
          .from("client_service_templates" as any)
          .select("id")
          .eq("client_id", clientId)
          .eq("service_catalog_id", catalogId);
        if (!existingTmpl || existingTmpl.length === 0) {
          await supabase.from("client_service_templates" as any).insert({
            client_id: clientId,
            service_catalog_id: catalogId,
            platform: tmpl.platform,
            default_fee: tmpl.fee,
            default_status: "planned",
            is_active: true,
          });
        }
      }

      // 4. Commission plan
      const { data: existingPlans } = await supabase
        .from("commission_plans" as any)
        .select("id")
        .eq("client_id", clientId)
        .eq("name", "TD Tiered Commission");
      
      let planId: string;
      if (existingPlans && (existingPlans as any[]).length > 0) {
        planId = (existingPlans as any[])[0].id;
        await supabase.from("commission_plans" as any).update({
          minimum_fee: 4350,
          currency: "ILS",
          base: "net_sales",
          is_active: true,
        }).eq("id", planId);
        // Delete existing tiers and re-create
        await supabase.from("commission_tiers" as any).delete().eq("plan_id", planId);
      } else {
        const { data, error } = await supabase.from("commission_plans" as any).insert({
          client_id: clientId,
          name: "TD Tiered Commission",
          minimum_fee: 4350,
          currency: "ILS",
          base: "net_sales",
          is_active: true,
        }).select().single();
        if (error) throw error;
        planId = (data as any).id;
      }

      // Insert tiers
      const tiersWithPlanId = COMMISSION_TIERS.map(t => ({ ...t, plan_id: planId }));
      const { error: tierError } = await supabase.from("commission_tiers" as any).insert(tiersWithPlanId);
      if (tierError) throw tierError;

      return { clientId, planId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["service_catalog"] });
      qc.invalidateQueries({ queryKey: ["commission_plans"] });
    },
  });
}
