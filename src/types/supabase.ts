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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          clock_in: string
          clock_out: string | null
          id: string
          location_coordinates: unknown
          note: string | null
          status: string | null
          task: string | null
          user_id: string | null
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          id?: string
          location_coordinates?: unknown
          note?: string | null
          status?: string | null
          task?: string | null
          user_id?: string | null
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          id?: string
          location_coordinates?: unknown
          note?: string | null
          status?: string | null
          task?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_attendance_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      bookings: {
        Row: {
          add_ons: string[] | null
          advance_amount: number | null
          anchorage_hours: number | null
          assigned_employee_id: string | null
          assigned_vendor_id: string | null
          booking_date: string
          brand: string | null
          created_at: string | null
          customer_contact: string | null
          customer_name: string
          end_time: string | null
          enquiry_date: string | null
          guest_count: number | null
          id: string
          item_id: string | null
          kids_below_5_count: number | null
          kids_count: number | null
          kids_price: number | null
          pickup_drop_guest_count: number | null
          pickup_drop_price: number | null
          region_id: string | null
          sailing_hours: number | null
          sale_price: number | null
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          transaction_id: string | null
          transport_type: string | null
        }
        Insert: {
          add_ons?: string[] | null
          advance_amount?: number | null
          anchorage_hours?: number | null
          assigned_employee_id?: string | null
          assigned_vendor_id?: string | null
          booking_date: string
          brand?: string | null
          created_at?: string | null
          customer_contact?: string | null
          customer_name: string
          end_time?: string | null
          enquiry_date?: string | null
          guest_count?: number | null
          id?: string
          item_id?: string | null
          kids_below_5_count?: number | null
          kids_count?: number | null
          kids_price?: number | null
          pickup_drop_guest_count?: number | null
          pickup_drop_price?: number | null
          region_id?: string | null
          sailing_hours?: number | null
          sale_price?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          transaction_id?: string | null
          transport_type?: string | null
        }
        Update: {
          add_ons?: string[] | null
          advance_amount?: number | null
          anchorage_hours?: number | null
          assigned_employee_id?: string | null
          assigned_vendor_id?: string | null
          booking_date?: string
          brand?: string | null
          created_at?: string | null
          customer_contact?: string | null
          customer_name?: string
          end_time?: string | null
          enquiry_date?: string | null
          guest_count?: number | null
          id?: string
          item_id?: string | null
          kids_below_5_count?: number | null
          kids_count?: number | null
          kids_price?: number | null
          pickup_drop_guest_count?: number | null
          pickup_drop_price?: number | null
          region_id?: string | null
          sailing_hours?: number | null
          sale_price?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          transaction_id?: string | null
          transport_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_assigned_vendor_id_fkey"
            columns: ["assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "vw_region_revenue_orders"
            referencedColumns: ["region_id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          b2b_price: number | null
          category: string | null
          coordinator_name: string | null
          coordinator_phone: string | null
          description: string | null
          id: string
          image_url: string | null
          jetty_location_url: string | null
          jetty_name: string | null
          kids_b2b_price: number | null
          kids_sale_price: number | null
          name: string
          reporting_time: string | null
          sale_price: number | null
          sku: string
          vendor_id: string | null
        }
        Insert: {
          b2b_price?: number | null
          category?: string | null
          coordinator_name?: string | null
          coordinator_phone?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          jetty_location_url?: string | null
          jetty_name?: string | null
          kids_b2b_price?: number | null
          kids_sale_price?: number | null
          name: string
          reporting_time?: string | null
          sale_price?: number | null
          sku: string
          vendor_id?: string | null
        }
        Update: {
          b2b_price?: number | null
          category?: string | null
          coordinator_name?: string | null
          coordinator_phone?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          jetty_location_url?: string | null
          jetty_name?: string | null
          kids_b2b_price?: number | null
          kids_sale_price?: number | null
          name?: string
          reporting_time?: string | null
          sale_price?: number | null
          sku?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          region_id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          region_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          region_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "vw_region_revenue_orders"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "profiles_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          assigned_employee_id: string | null
          assigned_vendor_id: string | null
          budget: number | null
          deadline: string | null
          id: string
          region_id: string | null
          status: string | null
          title: string
        }
        Insert: {
          assigned_employee_id?: string | null
          assigned_vendor_id?: string | null
          budget?: number | null
          deadline?: string | null
          id?: string
          region_id?: string | null
          status?: string | null
          title: string
        }
        Update: {
          assigned_employee_id?: string | null
          assigned_vendor_id?: string | null
          budget?: number | null
          deadline?: string | null
          id?: string
          region_id?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_attendance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_assigned_vendor_id_fkey"
            columns: ["assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "vw_region_revenue_orders"
            referencedColumns: ["region_id"]
          },
        ]
      }
      regional_inventory: {
        Row: {
          id: string
          item_id: string | null
          region_id: string | null
          reserved_quantity: number
          stock_quantity: number
        }
        Insert: {
          id?: string
          item_id?: string | null
          region_id?: string | null
          reserved_quantity?: number
          stock_quantity?: number
        }
        Update: {
          id?: string
          item_id?: string | null
          region_id?: string | null
          reserved_quantity?: number
          stock_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "regional_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regional_inventory_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regional_inventory_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "vw_region_revenue_orders"
            referencedColumns: ["region_id"]
          },
        ]
      }
      regions: {
        Row: {
          code: string
          id: string
          name: string
        }
        Insert: {
          code: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      sla_guidelines: {
        Row: {
          id: string
          max_resolution_time_hours: number
          max_response_time_mins: number
          penalty_terms: string | null
          vendor_id: string | null
        }
        Insert: {
          id?: string
          max_resolution_time_hours: number
          max_response_time_mins: number
          penalty_terms?: string | null
          vendor_id?: string | null
        }
        Update: {
          id?: string
          max_resolution_time_hours?: number
          max_response_time_mins?: number
          penalty_terms?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_guidelines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          booking_id: string | null
          brand: string | null
          created_at: string
          created_by: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          id: string
          notes: string | null
          source: Database["public"]["Enums"]["transaction_source"]
          transaction_date: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          brand?: string | null
          created_at?: string
          created_by?: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          id?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["transaction_source"]
          transaction_date?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          brand?: string | null
          created_at?: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["transaction_direction"]
          id?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["transaction_source"]
          transaction_date?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      vendor_category_selections: {
        Row: {
          category_id: string
          created_at: string
          id: string
          sub_category_id: string | null
          vendor_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          sub_category_id?: string | null
          vendor_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          sub_category_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_category_selections_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vendor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_category_selections_sub_category_id_fkey"
            columns: ["sub_category_id"]
            isOneToOne: false
            referencedRelation: "vendor_sub_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_category_selections_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_sub_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_sub_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vendor_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          additional_contact_number: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          ifsc_code: string | null
          location: string | null
          name: string | null
          payment_terms: string | null
          priority: string | null
          upi_id: string | null
        }
        Insert: {
          additional_contact_number?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          ifsc_code?: string | null
          location?: string | null
          name?: string | null
          payment_terms?: string | null
          priority?: string | null
          upi_id?: string | null
        }
        Update: {
          additional_contact_number?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          ifsc_code?: string | null
          location?: string | null
          name?: string | null
          payment_terms?: string | null
          priority?: string | null
          upi_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vw_brand_performance: {
        Row: {
          brand: string | null
          total_bookings: number | null
          total_profit: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      vw_monthly_attendance_summary: {
        Row: {
          avg_hours_worked: number | null
          days_logged: number | null
          days_present: number | null
          full_name: string | null
          month: string | null
          user_id: string | null
        }
        Relationships: []
      }
      vw_region_revenue_orders: {
        Row: {
          region_id: string | null
          region_name: string | null
          total_orders: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_region: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_vendor: { Args: never; Returns: string }
      is_privileged: { Args: never; Returns: boolean }
    }
    Enums: {
      booking_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "cancelled_refunded"
      transaction_direction: "paid" | "received"
      transaction_source: "manual" | "booking"
      user_role:
        | "admin"
        | "vendor"
        | "project_manager"
        | "hr"
        | "employee"
        | "developer"
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
    Enums: {
      booking_status: [
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
        "cancelled_refunded",
      ],
      transaction_direction: ["paid", "received"],
      transaction_source: ["manual", "booking"],
      user_role: [
        "admin",
        "vendor",
        "project_manager",
        "hr",
        "employee",
        "developer",
      ],
    },
  },
} as const
