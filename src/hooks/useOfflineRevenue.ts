import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOfflineRevenue(clientId?: string, year?: number) {
  return useQuery({
    queryKey: ["offline_revenue", clientId, year],
    enabled: !!clientId && !!year,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_offline_revenue")
        .select("*")
        .eq("client_id", clientId!)
        .eq("year", year!)
        .order("month");
      if (error) throw error;
      return data;
    },
  });
}

export function useOfflineRevenueMultiYear(clientId?: string, years?: number[]) {
  return useQuery({
    queryKey: ["offline_revenue_multi", clientId, years],
    enabled: !!clientId && !!years && years.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_offline_revenue")
        .select("*")
        .eq("client_id", clientId!)
        .in("year", years!)
        .order("year")
        .order("month");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertOfflineRevenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: {
      client_id: string;
      year: number;
      month: number;
      amount_gross: number;
      amount_net?: number;
      source?: string;
      notes?: string;
    }) => {
      // Check existing
      const { data: existing } = await supabase
        .from("monthly_offline_revenue")
        .select("id")
        .eq("client_id", item.client_id)
        .eq("year", item.year)
        .eq("month", item.month)
        .eq("source", item.source || "icount_other")
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("monthly_offline_revenue")
          .update({
            amount_gross: item.amount_gross,
            amount_net: item.amount_net,
            notes: item.notes,
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("monthly_offline_revenue")
          .insert({
            client_id: item.client_id,
            year: item.year,
            month: item.month,
            amount_gross: item.amount_gross,
            amount_net: item.amount_net,
            source: item.source || "icount_other",
            notes: item.notes,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["offline_revenue", vars.client_id, vars.year] });
      qc.invalidateQueries({ queryKey: ["offline_revenue_multi"] });
    },
  });
}

export function useDeleteOfflineRevenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("monthly_offline_revenue").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offline_revenue"] });
      qc.invalidateQueries({ queryKey: ["offline_revenue_multi"] });
    },
  });
}
