import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePayouts(clientId?: string, year?: number) {
  return useQuery({
    queryKey: ["payouts", clientId, year],
    enabled: !!clientId && !!year,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .eq("client_id", clientId!)
        .eq("year", year!)
        .order("month");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payout: {
      client_id: string;
      year: number;
      month: number;
      amount: number;
      agreement_id?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.from("payouts").upsert(payout, {
        onConflict: "client_id,agreement_id,year,month",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["payouts", vars.client_id, vars.year] }),
  });
}
