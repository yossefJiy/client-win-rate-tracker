import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SERVICE_CATALOG_ITEMS = [
  { name: "Meta Ads Management", regular_unit_price: 3500, plan_unit_price: 2900, currency: "ILS", billing: "monthly" },
  { name: "Google Ads Management", regular_unit_price: 3500, plan_unit_price: 2900, currency: "ILS", billing: "monthly" },
  { name: "Strategy Meeting", regular_unit_price: 900, plan_unit_price: 700, currency: "ILS", billing: "per_session" },
  { name: "One-off Site Management", regular_unit_price: 350, plan_unit_price: 290, currency: "ILS", billing: "hourly" },
  { name: "TikTok Ads Management", regular_unit_price: 3500, plan_unit_price: 2900, currency: "ILS", billing: "monthly" },
  { name: "TikTok Social Management", regular_unit_price: 2500, plan_unit_price: 2000, currency: "ILS", billing: "monthly" },
  { name: "Operational Systems Spec/Design", regular_unit_price: 500, plan_unit_price: 400, currency: "ILS", billing: "hourly" },
  { name: "CRO Site Management (10h/mo)", regular_unit_price: 350, plan_unit_price: 290, currency: "ILS", billing: "hourly" },
  { name: "Bi-weekly Strategy Meeting", regular_unit_price: 900, plan_unit_price: 700, currency: "ILS", billing: "per_session" },
  { name: "Email Marketing (bi-monthly)", regular_unit_price: 2200, plan_unit_price: 1770, currency: "ILS", billing: "monthly" },
];

const DEFAULT_MONTHLY_SERVICES = [
  { serviceName: "Meta Ads Management", platform: "meta" },
  { serviceName: "Google Ads Management", platform: "google" },
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
      // 1. Upsert client with plan_type
      const { data: existingClients } = await supabase.from("clients").select("id").eq("name", "תמר דרורי");
      let clientId: string;
      if (existingClients && existingClients.length > 0) {
        clientId = existingClients[0].id;
        await supabase.from("clients").update({ plan_type: "commission_plan" } as any).eq("id", clientId);
      } else {
        const { data, error } = await supabase.from("clients").insert({ name: "תמר דרורי", plan_type: "commission_plan" } as any).select().single();
        if (error) throw error;
        clientId = data.id;
      }

      // 2. Upsert service catalog items with dual pricing
      const catalogMap: Record<string, string> = {};
      for (const item of SERVICE_CATALOG_ITEMS) {
        const insertData = {
          name: item.name,
          default_monthly_fee: item.plan_unit_price,
          regular_unit_price: item.regular_unit_price,
          plan_unit_price: item.plan_unit_price,
          currency: item.currency,
          billing: item.billing,
        };
        const { data: existing } = await supabase.from("service_catalog").select("id").eq("name", item.name);
        if (existing && existing.length > 0) {
          await supabase.from("service_catalog").update(insertData as any).eq("id", existing[0].id);
          catalogMap[item.name] = existing[0].id;
        } else {
          const { data, error } = await supabase.from("service_catalog").insert(insertData as any).select().single();
          if (error) throw error;
          catalogMap[item.name] = data.id;
        }
      }

      // 3. Create default monthly service lines for current month (plan pricing)
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() + 1;
      for (const tmpl of DEFAULT_MONTHLY_SERVICES) {
        const catalogId = catalogMap[tmpl.serviceName];
        const catalogItem = SERVICE_CATALOG_ITEMS.find(s => s.name === tmpl.serviceName);
        const planPrice = catalogItem?.plan_unit_price ?? 0;
        
        // Check if already exists
        const { data: existing } = await supabase
          .from("client_monthly_services")
          .select("id")
          .eq("client_id", clientId)
          .eq("year", curYear)
          .eq("month", curMonth)
          .eq("service_id", catalogId);
        
        if (!existing || existing.length === 0) {
          await supabase.from("client_monthly_services").insert({
            client_id: clientId,
            year: curYear,
            month: curMonth,
            service_id: catalogId,
            service_name: tmpl.serviceName,
            platform: tmpl.platform,
            monthly_fee: planPrice,
            unit_price: planPrice,
            quantity: 1,
            pricing_basis: "plan",
            status: "planned",
          } as any);
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
          minimum_fee: 4350, currency: "ILS", base: "net_sales", is_active: true,
        }).eq("id", planId);
        await supabase.from("commission_tiers" as any).delete().eq("plan_id", planId);
      } else {
        const { data, error } = await supabase.from("commission_plans" as any).insert({
          client_id: clientId, name: "TD Tiered Commission",
          minimum_fee: 4350, currency: "ILS", base: "net_sales", is_active: true,
        }).select().single();
        if (error) throw error;
        planId = (data as any).id;
      }

      const tiersWithPlanId = COMMISSION_TIERS.map(t => ({ ...t, plan_id: planId }));
      const { error: tierError } = await supabase.from("commission_tiers" as any).insert(tiersWithPlanId);
      if (tierError) throw tierError;

      return { clientId, planId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["service_catalog"] });
      qc.invalidateQueries({ queryKey: ["commission_plans"] });
      qc.invalidateQueries({ queryKey: ["monthly_services"] });
    },
  });
}
