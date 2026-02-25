import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useServiceCatalog() {
  return useQuery({
    queryKey: ["service_catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_catalog").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateServiceCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("service_catalog").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service_catalog"] }),
  });
}

export function useMonthlyServices(clientId?: string, year?: number, month?: number) {
  return useQuery({
    queryKey: ["monthly_services", clientId, year, month],
    enabled: !!clientId && !!year && !!month,
    queryFn: async () => {
      let q = supabase
        .from("client_monthly_services")
        .select("*, service_catalog(*)")
        .eq("client_id", clientId!)
        .eq("year", year!);
      if (month) q = q.eq("month", month);
      const { data, error } = await q.order("month");
      if (error) throw error;
      return data;
    },
  });
}

export function useMonthlyServicesByYear(clientId?: string, year?: number) {
  return useQuery({
    queryKey: ["monthly_services_year", clientId, year],
    enabled: !!clientId && !!year,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_monthly_services")
        .select("*, service_catalog(*)")
        .eq("client_id", clientId!)
        .eq("year", year!)
        .order("month");
      if (error) throw error;
      return data;
    },
  });
}

/** Determine the correct unit_price based on client plan_type */
export function resolvePrice(
  planType: string,
  service: { regular_unit_price?: number | null; plan_unit_price?: number | null; default_monthly_fee?: number | null }
): { unitPrice: number; pricingBasis: "plan" | "regular" } {
  if (planType === "commission_plan") {
    const price = service.plan_unit_price ?? service.regular_unit_price ?? service.default_monthly_fee ?? 0;
    return { unitPrice: price, pricingBasis: "plan" };
  }
  const price = service.regular_unit_price ?? service.default_monthly_fee ?? 0;
  return { unitPrice: price, pricingBasis: "regular" };
}

export function useCreateMonthlyService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (service: {
      client_id: string;
      year: number;
      month: number;
      service_id?: string;
      service_name?: string;
      platform?: string;
      monthly_fee: number;
      unit_price?: number;
      quantity?: number;
      pricing_basis?: string;
      linked_project_id?: string;
      status?: string;
      delivery_notes?: string;
      agreement_id?: string;
    }) => {
      // Ensure unit_price and quantity are set
      const insert = {
        ...service,
        unit_price: service.unit_price ?? service.monthly_fee,
        quantity: service.quantity ?? 1,
        pricing_basis: service.pricing_basis ?? "regular",
      };
      const { data, error } = await supabase.from("client_monthly_services").insert(insert).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["monthly_services", vars.client_id, vars.year, vars.month] });
      qc.invalidateQueries({ queryKey: ["monthly_services_year", vars.client_id, vars.year] });
    },
  });
}

export function useUpdateMonthlyService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("client_monthly_services").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly_services"] });
      qc.invalidateQueries({ queryKey: ["monthly_services_year"] });
    },
  });
}

export function useDeleteMonthlyService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_monthly_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly_services"] });
      qc.invalidateQueries({ queryKey: ["monthly_services_year"] });
    },
  });
}
