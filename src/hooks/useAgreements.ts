import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAgreements(clientId?: string) {
  return useQuery({
    queryKey: ["agreements", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("percent_agreements")
        .select("*")
        .eq("client_id", clientId!)
        .order("start_year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agreement: {
      client_id: string;
      percent_rate: number;
      revenue_source: string;
      start_year: number;
      start_month: number;
      end_year?: number;
      end_month?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase.from("percent_agreements").insert(agreement).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["agreements", vars.client_id] }),
  });
}

export function useUpdateAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; client_id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("percent_agreements").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["agreements", vars.client_id] }),
  });
}

export function useDeleteAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase.from("percent_agreements").delete().eq("id", id);
      if (error) throw error;
      return clientId;
    },
    onSuccess: (clientId) => qc.invalidateQueries({ queryKey: ["agreements", clientId] }),
  });
}
