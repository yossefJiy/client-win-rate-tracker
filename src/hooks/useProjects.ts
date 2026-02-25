import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProjects(clientId?: string) {
  return useQuery({
    queryKey: ["projects", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, project_stages(*)")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useProject(projectId?: string) {
  return useQuery({
    queryKey: ["project", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, project_stages(*), project_monthly_checkpoints(*)")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (project: {
      client_id: string;
      name: string;
      description?: string;
      start_year: number;
      start_month: number;
      end_year?: number;
      end_month?: number;
      status?: string;
      stages?: { stage_name: string; order_index: number; planned_year?: number; planned_month?: number; expected_outcome?: string }[];
    }) => {
      const { stages, ...projectData } = project;
      const { data, error } = await supabase.from("projects").insert(projectData).select().single();
      if (error) throw error;
      if (stages && stages.length > 0) {
        const stagesWithProjectId = stages.map((s) => ({ ...s, project_id: data.id }));
        const { error: stagesError } = await supabase.from("project_stages").insert(stagesWithProjectId);
        if (stagesError) throw stagesError;
      }
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["projects", vars.client_id] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("projects").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useCreateCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (checkpoint: {
      project_id: string;
      year: number;
      month: number;
      status?: string;
      what_was_done?: string;
      blockers?: string;
      next_month_focus?: string;
    }) => {
      const { data, error } = await supabase.from("project_monthly_checkpoints").insert(checkpoint).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["project", vars.project_id] }),
  });
}

export function useUpdateCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }: { id: string; projectId: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("project_monthly_checkpoints").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return { ...data, projectId };
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["project", data.projectId] }),
  });
}

export const PROJECT_TEMPLATES = {
  paid_media_growth: {
    name: "Paid Media Growth (Ecom)",
    stages: [
      { stage_name: "Baseline & Goals", order_index: 1 },
      { stage_name: "Tracking & Events QA", order_index: 2 },
      { stage_name: "Account Structure & Audiences", order_index: 3 },
      { stage_name: "Creative System & Testing", order_index: 4 },
      { stage_name: "Scaling & Budget Rules", order_index: 5 },
      { stage_name: "Retention / LTV Boost (email/SMS)", order_index: 6 },
    ],
  },
  cro_project: {
    name: "CRO Project",
    stages: [
      { stage_name: "Audit & Hypotheses", order_index: 1 },
      { stage_name: "Implementation", order_index: 2 },
      { stage_name: "A/B Testing", order_index: 3 },
      { stage_name: "Iteration & Rollout", order_index: 4 },
    ],
  },
};
