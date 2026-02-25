export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      client_monthly_services: {
        Row: {
          agreement_id: string | null
          client_id: string
          created_at: string
          delivery_notes: string | null
          id: string
          month: number
          monthly_fee: number
          platform: string | null
          service_id: string | null
          service_name: string | null
          status: string
          year: number
        }
        Insert: {
          agreement_id?: string | null
          client_id: string
          created_at?: string
          delivery_notes?: string | null
          id?: string
          month: number
          monthly_fee?: number
          platform?: string | null
          service_id?: string | null
          service_name?: string | null
          status?: string
          year: number
        }
        Update: {
          agreement_id?: string | null
          client_id?: string
          created_at?: string
          delivery_notes?: string | null
          id?: string
          month?: number
          monthly_fee?: number
          platform?: string | null
          service_id?: string | null
          service_name?: string | null
          status?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_monthly_services_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "percent_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_monthly_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_monthly_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      payouts: {
        Row: {
          agreement_id: string | null
          amount: number
          client_id: string
          created_at: string
          id: string
          month: number
          notes: string | null
          year: number
        }
        Insert: {
          agreement_id?: string | null
          amount?: number
          client_id: string
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          year: number
        }
        Update: {
          agreement_id?: string | null
          amount?: number
          client_id?: string
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payouts_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "percent_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      percent_agreements: {
        Row: {
          client_id: string
          created_at: string
          end_month: number | null
          end_year: number | null
          id: string
          notes: string | null
          percent_rate: number
          revenue_source: string
          start_month: number
          start_year: number
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          end_month?: number | null
          end_year?: number | null
          id?: string
          notes?: string | null
          percent_rate: number
          revenue_source: string
          start_month: number
          start_year: number
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          end_month?: number | null
          end_year?: number | null
          id?: string
          notes?: string | null
          percent_rate?: number
          revenue_source?: string
          start_month?: number
          start_year?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "percent_agreements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      project_monthly_checkpoints: {
        Row: {
          blockers: string | null
          created_at: string
          id: string
          month: number
          next_month_focus: string | null
          project_id: string
          status: string
          what_was_done: string | null
          year: number
        }
        Insert: {
          blockers?: string | null
          created_at?: string
          id?: string
          month: number
          next_month_focus?: string | null
          project_id: string
          status?: string
          what_was_done?: string | null
          year: number
        }
        Update: {
          blockers?: string | null
          created_at?: string
          id?: string
          month?: number
          next_month_focus?: string | null
          project_id?: string
          status?: string
          what_was_done?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_monthly_checkpoints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stages: {
        Row: {
          created_at: string
          expected_outcome: string | null
          id: string
          order_index: number
          planned_month: number | null
          planned_year: number | null
          project_id: string
          stage_name: string
        }
        Insert: {
          created_at?: string
          expected_outcome?: string | null
          id?: string
          order_index: number
          planned_month?: number | null
          planned_year?: number | null
          project_id: string
          stage_name: string
        }
        Update: {
          created_at?: string
          expected_outcome?: string | null
          id?: string
          order_index?: number
          planned_month?: number | null
          planned_year?: number | null
          project_id?: string
          stage_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          agreement_id: string | null
          client_id: string
          created_at: string
          description: string | null
          end_month: number | null
          end_year: number | null
          id: string
          name: string
          start_month: number
          start_year: number
          status: string
        }
        Insert: {
          agreement_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          end_month?: number | null
          end_year?: number | null
          id?: string
          name: string
          start_month: number
          start_year: number
          status?: string
        }
        Update: {
          agreement_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          end_month?: number | null
          end_year?: number | null
          id?: string
          name?: string
          start_month?: number
          start_year?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "percent_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          created_at: string
          default_monthly_fee: number | null
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          default_monthly_fee?: number | null
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          default_monthly_fee?: number | null
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
