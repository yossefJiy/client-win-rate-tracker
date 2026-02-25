import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCommissionPlans(clientId?: string) {
  return useQuery({
    queryKey: ["commission_plans", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_plans" as any)
        .select("*, commission_tiers(*)")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateCommissionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: {
      client_id: string;
      name: string;
      minimum_fee: number;
      currency?: string;
      base?: string;
      is_active?: boolean;
      tiers?: { threshold_sales: number; rate_percent: number; order_index: number }[];
    }) => {
      const { tiers, ...planData } = plan;
      const { data, error } = await supabase.from("commission_plans" as any).insert(planData).select().single();
      if (error) throw error;
      if (tiers && tiers.length > 0) {
        const tiersWithPlanId = tiers.map((t) => ({ ...t, plan_id: (data as any).id }));
        const { error: tierError } = await supabase.from("commission_tiers" as any).insert(tiersWithPlanId);
        if (tierError) throw tierError;
      }
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["commission_plans", vars.client_id] }),
  });
}

export function useUpdateCommissionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, clientId, ...updates }: { id: string; clientId: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("commission_plans" as any).update(updates).eq("id", id).select().single();
      if (error) throw error;
      return { data, clientId };
    },
    onSuccess: (res) => qc.invalidateQueries({ queryKey: ["commission_plans", res.clientId] }),
  });
}

export function useDeleteCommissionTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("commission_tiers" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commission_plans"] }),
  });
}

export function useCreateCommissionTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tier: { plan_id: string; threshold_sales: number; rate_percent: number; order_index: number }) => {
      const { data, error } = await supabase.from("commission_tiers" as any).insert(tier).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commission_plans"] }),
  });
}

export function useUpdateCommissionTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("commission_tiers" as any).update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commission_plans"] }),
  });
}

export function calculateCommission(
  monthSales: number,
  tiers: { threshold_sales: number; rate_percent: number; order_index: number }[],
  minimumFee: number
): { commission: number; tierUsed: typeof tiers[0] | null; finalDue: number; isMinimum: boolean } {
  const sorted = [...tiers].sort((a, b) => a.order_index - b.order_index);
  let tierUsed: typeof tiers[0] | null = null;
  
  for (const tier of sorted) {
    if (monthSales >= tier.threshold_sales) {
      tierUsed = tier;
    }
  }
  
  const commission = tierUsed ? monthSales * tierUsed.rate_percent / 100 : 0;
  const finalDue = Math.max(commission, minimumFee);
  const isMinimum = finalDue === minimumFee && commission < minimumFee;
  
  return { commission, tierUsed, finalDue, isMinimum };
}
