import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAnalyticsSnapshots(clientId?: string, year?: number) {
  return useQuery({
    queryKey: ["analytics_snapshots", clientId, year],
    enabled: !!clientId && !!year,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_analytics_snapshots" as any)
        .select("*")
        .eq("client_id", clientId!)
        .eq("year", year!)
        .order("month");
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useAnalyticsSnapshotsByYears(clientId?: string, years?: number[]) {
  return useQuery({
    queryKey: ["analytics_snapshots_multi", clientId, years],
    enabled: !!clientId && !!years && years.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_analytics_snapshots" as any)
        .select("*")
        .eq("client_id", clientId!)
        .in("year", years!)
        .order("year")
        .order("month");
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useClientIntegration(clientId?: string) {
  return useQuery({
    queryKey: ["client_integration", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_integrations" as any)
        .select("*")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useUpsertClientIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (integration: { client_id: string; poconverto_client_key?: string; shop_domain?: string; icount_company_id?: string; icount_api_token?: string }) => {
      const { data: existing } = await supabase
        .from("client_integrations" as any)
        .select("id")
        .eq("client_id", integration.client_id)
        .maybeSingle();
      
      if (existing) {
        const { data, error } = await supabase
          .from("client_integrations" as any)
          .update(integration)
          .eq("client_id", integration.client_id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("client_integrations" as any)
          .insert(integration)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["client_integration", vars.client_id] }),
  });
}

export function useIntegrationSettings() {
  return useQuery({
    queryKey: ["integration_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("integration_settings" as any).select("*");
      if (error) throw error;
      const settings: Record<string, string> = {};
      (data as any[])?.forEach((s: any) => { settings[s.key] = s.value; });
      return settings;
    },
  });
}

export function useUpsertIntegrationSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data: existing } = await supabase
        .from("integration_settings" as any)
        .select("id")
        .eq("key", key)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase.from("integration_settings" as any).update({ value }).eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("integration_settings" as any).insert({ key, value });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integration_settings"] }),
  });
}

export function useSyncPoconverto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, action }: { clientId: string; action?: string }) => {
      const res = await supabase.functions.invoke("poconverto-sync", {
        body: { client_id: clientId, action: action || "sync_all" },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analytics_snapshots"] });
      qc.invalidateQueries({ queryKey: ["analytics_snapshots_multi"] });
    },
  });
}

export function useSyncIcount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, action, monthsBack }: { clientId: string; action?: string; monthsBack?: number }) => {
      const res = await supabase.functions.invoke("icount-sync", {
        body: { client_id: clientId, action: action || "sync_daily", months_back: monthsBack },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offline_revenue"] });
      qc.invalidateQueries({ queryKey: ["offline_revenue_multi"] });
    },
  });
}
