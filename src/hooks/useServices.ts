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
        .select("*")
        .eq("client_id", clientId!)
        .eq("year", year!)
        .order("month");
      if (error) throw error;
      return data;
    },
  });
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
      status?: string;
      delivery_notes?: string;
      agreement_id?: string;
    }) => {
      const { data, error } = await supabase.from("client_monthly_services").insert(service).select().single();
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
