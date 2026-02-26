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
      client_integrations: {
        Row: {
          client_id: string
          created_at: string
          google_ads_customer_id: string | null
          icount_api_token: string | null
          icount_company_id: string | null
          icount_user: string | null
          id: string
          meta_ad_account_id: string | null
          poconverto_client_key: string | null
          shop_domain: string | null
          tiktok_ad_account_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          google_ads_customer_id?: string | null
          icount_api_token?: string | null
          icount_company_id?: string | null
          icount_user?: string | null
          id?: string
          meta_ad_account_id?: string | null
          poconverto_client_key?: string | null
          shop_domain?: string | null
          tiktok_ad_account_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          google_ads_customer_id?: string | null
          icount_api_token?: string | null
          icount_company_id?: string | null
          icount_user?: string | null
          id?: string
          meta_ad_account_id?: string | null
          poconverto_client_key?: string | null
          shop_domain?: string | null
          tiktok_ad_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_integrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_monthly_services: {
        Row: {
          agreement_id: string | null
          agreement_link: string | null
          client_id: string
          created_at: string
          delivery_notes: string | null
          id: string
          linked_project_id: string | null
          month: number
          monthly_fee: number
          platform: string | null
          pricing_basis: string
          quantity: number
          service_id: string | null
          service_name: string | null
          status: string
          unit_price: number | null
          year: number
        }
        Insert: {
          agreement_id?: string | null
          agreement_link?: string | null
          client_id: string
          created_at?: string
          delivery_notes?: string | null
          id?: string
          linked_project_id?: string | null
          month: number
          monthly_fee?: number
          platform?: string | null
          pricing_basis?: string
          quantity?: number
          service_id?: string | null
          service_name?: string | null
          status?: string
          unit_price?: number | null
          year: number
        }
        Update: {
          agreement_id?: string | null
          agreement_link?: string | null
          client_id?: string
          created_at?: string
          delivery_notes?: string | null
          id?: string
          linked_project_id?: string | null
          month?: number
          monthly_fee?: number
          platform?: string | null
          pricing_basis?: string
          quantity?: number
          service_id?: string | null
          service_name?: string | null
          status?: string
          unit_price?: number | null
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
            foreignKeyName: "client_monthly_services_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      client_service_templates: {
        Row: {
          client_id: string
          created_at: string
          default_fee: number
          default_status: string
          id: string
          is_active: boolean
          platform: string | null
          service_catalog_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          default_fee?: number
          default_status?: string
          id?: string
          is_active?: boolean
          platform?: string | null
          service_catalog_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          default_fee?: number
          default_status?: string
          id?: string
          is_active?: boolean
          platform?: string | null
          service_catalog_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_service_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_service_templates_service_catalog_id_fkey"
            columns: ["service_catalog_id"]
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
          plan_type: string
          status: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
        }
        Relationships: []
      }
      commission_plans: {
        Row: {
          base: string
          client_id: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          minimum_fee: number
          name: string
        }
        Insert: {
          base?: string
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          minimum_fee?: number
          name: string
        }
        Update: {
          base?: string
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          minimum_fee?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_tiers: {
        Row: {
          created_at: string
          id: string
          order_index: number
          plan_id: string
          rate_percent: number
          threshold_sales: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_index: number
          plan_id: string
          rate_percent: number
          threshold_sales?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          plan_id?: string
          rate_percent?: number
          threshold_sales?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_tiers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "commission_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_total: number
          quantity: number
          source_id: string | null
          source_type: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_total?: number
          quantity?: number
          source_id?: string | null
          source_type?: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number
          quantity?: number
          source_id?: string | null
          source_type?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          id: string
          month: number
          paid_at: string | null
          sent_at: string | null
          status: string
          subtotal: number
          total: number
          vat_amount: number
          year: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          month: number
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          vat_amount?: number
          year: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          month?: number
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          vat_amount?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_analytics_snapshots: {
        Row: {
          ad_spend_google: number | null
          ad_spend_meta: number | null
          ad_spend_tiktok: number | null
          ad_spend_total: number | null
          avg_order_value: number | null
          avg_session_duration: number | null
          blended_roas: number | null
          bounce_rate: number | null
          client_id: string
          conversion_rate: number | null
          created_at: string
          discounts: number | null
          google_clicks: number | null
          google_cpc: number | null
          google_cpm: number | null
          google_impressions: number | null
          google_roas: number | null
          gross_sales: number | null
          id: string
          last_synced_at: string | null
          mer: number | null
          meta_clicks: number | null
          meta_cpc: number | null
          meta_cpm: number | null
          meta_impressions: number | null
          meta_roas: number | null
          month: number
          net_sales: number | null
          new_customers: number | null
          orders: number | null
          page_views: number | null
          refunds: number | null
          returning_customers: number | null
          sessions: number | null
          tiktok_clicks: number | null
          tiktok_cpc: number | null
          tiktok_cpm: number | null
          tiktok_impressions: number | null
          tiktok_roas: number | null
          total_ad_clicks: number | null
          total_ad_impressions: number | null
          year: number
        }
        Insert: {
          ad_spend_google?: number | null
          ad_spend_meta?: number | null
          ad_spend_tiktok?: number | null
          ad_spend_total?: number | null
          avg_order_value?: number | null
          avg_session_duration?: number | null
          blended_roas?: number | null
          bounce_rate?: number | null
          client_id: string
          conversion_rate?: number | null
          created_at?: string
          discounts?: number | null
          google_clicks?: number | null
          google_cpc?: number | null
          google_cpm?: number | null
          google_impressions?: number | null
          google_roas?: number | null
          gross_sales?: number | null
          id?: string
          last_synced_at?: string | null
          mer?: number | null
          meta_clicks?: number | null
          meta_cpc?: number | null
          meta_cpm?: number | null
          meta_impressions?: number | null
          meta_roas?: number | null
          month: number
          net_sales?: number | null
          new_customers?: number | null
          orders?: number | null
          page_views?: number | null
          refunds?: number | null
          returning_customers?: number | null
          sessions?: number | null
          tiktok_clicks?: number | null
          tiktok_cpc?: number | null
          tiktok_cpm?: number | null
          tiktok_impressions?: number | null
          tiktok_roas?: number | null
          total_ad_clicks?: number | null
          total_ad_impressions?: number | null
          year: number
        }
        Update: {
          ad_spend_google?: number | null
          ad_spend_meta?: number | null
          ad_spend_tiktok?: number | null
          ad_spend_total?: number | null
          avg_order_value?: number | null
          avg_session_duration?: number | null
          blended_roas?: number | null
          bounce_rate?: number | null
          client_id?: string
          conversion_rate?: number | null
          created_at?: string
          discounts?: number | null
          google_clicks?: number | null
          google_cpc?: number | null
          google_cpm?: number | null
          google_impressions?: number | null
          google_roas?: number | null
          gross_sales?: number | null
          id?: string
          last_synced_at?: string | null
          mer?: number | null
          meta_clicks?: number | null
          meta_cpc?: number | null
          meta_cpm?: number | null
          meta_impressions?: number | null
          meta_roas?: number | null
          month?: number
          net_sales?: number | null
          new_customers?: number | null
          orders?: number | null
          page_views?: number | null
          refunds?: number | null
          returning_customers?: number | null
          sessions?: number | null
          tiktok_clicks?: number | null
          tiktok_cpc?: number | null
          tiktok_cpm?: number | null
          tiktok_impressions?: number | null
          tiktok_roas?: number | null
          total_ad_clicks?: number | null
          total_ad_impressions?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_analytics_snapshots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_offline_revenue: {
        Row: {
          amount_gross: number
          amount_net: number | null
          client_id: string
          created_at: string
          icount_doc_id: string | null
          icount_doc_type: string | null
          id: string
          last_synced_at: string | null
          month: number
          notes: string | null
          source: string
          year: number
        }
        Insert: {
          amount_gross?: number
          amount_net?: number | null
          client_id: string
          created_at?: string
          icount_doc_id?: string | null
          icount_doc_type?: string | null
          id?: string
          last_synced_at?: string | null
          month: number
          notes?: string | null
          source?: string
          year: number
        }
        Update: {
          amount_gross?: number
          amount_net?: number | null
          client_id?: string
          created_at?: string
          icount_doc_id?: string | null
          icount_doc_type?: string | null
          id?: string
          last_synced_at?: string | null
          month?: number
          notes?: string | null
          source?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_offline_revenue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      project_required_services: {
        Row: {
          created_at: string
          default_quantity: number
          id: string
          project_id: string
          quantity_unit_note: string | null
          service_id: string
          stage_id: string | null
          when_applied: string
        }
        Insert: {
          created_at?: string
          default_quantity?: number
          id?: string
          project_id: string
          quantity_unit_note?: string | null
          service_id: string
          stage_id?: string | null
          when_applied?: string
        }
        Update: {
          created_at?: string
          default_quantity?: number
          id?: string
          project_id?: string
          quantity_unit_note?: string | null
          service_id?: string
          stage_id?: string | null
          when_applied?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_required_services_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_required_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_required_services_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
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
          billing: string
          created_at: string
          currency: string
          default_monthly_fee: number | null
          id: string
          name: string
          notes: string | null
          plan_unit_price: number | null
          regular_unit_price: number | null
        }
        Insert: {
          billing?: string
          created_at?: string
          currency?: string
          default_monthly_fee?: number | null
          id?: string
          name: string
          notes?: string | null
          plan_unit_price?: number | null
          regular_unit_price?: number | null
        }
        Update: {
          billing?: string
          created_at?: string
          currency?: string
          default_monthly_fee?: number | null
          id?: string
          name?: string
          notes?: string | null
          plan_unit_price?: number | null
          regular_unit_price?: number | null
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
