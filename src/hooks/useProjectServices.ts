import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProjectRequiredServices(projectId?: string) {
  return useQuery({
    queryKey: ["project_required_services", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_required_services" as any)
        .select("*, service_catalog(*)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateProjectRequiredService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: {
      project_id: string;
      service_id: string;
      default_quantity?: number;
      quantity_unit_note?: string;
      when_applied?: string;
      stage_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("project_required_services" as any)
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["project_required_services", vars.project_id] }),
  });
}

export function useDeleteProjectRequiredService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("project_required_services" as any).delete().eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => qc.invalidateQueries({ queryKey: ["project_required_services", projectId] }),
  });
}

/** Generate monthly service lines from project_required_services */
export function useGenerateProjectServiceLines() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      clientId,
      year,
      month,
      planType,
    }: {
      projectId: string;
      clientId: string;
      year: number;
      month: number;
      planType: string;
    }) => {
      // Get required services for this project
      const { data: requiredServices, error: rsErr } = await supabase
        .from("project_required_services" as any)
        .select("*, service_catalog(*)")
        .eq("project_id", projectId);
      if (rsErr) throw rsErr;

      let created = 0;
      for (const rs of (requiredServices as any[]) || []) {
        const service = rs.service_catalog;
        if (!service) continue;

        // Check if line already exists for this project+service+month
        const { data: existing } = await supabase
          .from("client_monthly_services")
          .select("id")
          .eq("client_id", clientId)
          .eq("year", year)
          .eq("month", month)
          .eq("service_id", service.id)
          .eq("linked_project_id", projectId);
        
        if (existing && existing.length > 0) continue; // skip duplicates

        // Determine price based on plan_type
        const unitPrice = planType === "commission_plan"
          ? (service.plan_unit_price ?? service.regular_unit_price ?? service.default_monthly_fee ?? 0)
          : (service.regular_unit_price ?? service.default_monthly_fee ?? 0);

        const quantity = rs.default_quantity ?? 1;
        const pricingBasis = planType === "commission_plan" ? "plan" : "regular";

        await supabase.from("client_monthly_services").insert({
          client_id: clientId,
          year,
          month,
          service_id: service.id,
          service_name: service.name,
          monthly_fee: unitPrice * quantity,
          unit_price: unitPrice,
          quantity,
          pricing_basis: pricingBasis,
          linked_project_id: projectId,
          status: "planned",
        } as any);
        created++;
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly_services"] });
      qc.invalidateQueries({ queryKey: ["monthly_services_year"] });
    },
  });
}
