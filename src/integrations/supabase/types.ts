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
      activation_keys: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          is_used: boolean | null
          label: string | null
          merchant_tier: string | null
          role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          is_used?: boolean | null
          label?: string | null
          merchant_tier?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean | null
          label?: string | null
          merchant_tier?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      addon_options: {
        Row: {
          addon_id: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          price: number | null
          sort_order: number | null
          wholesale_price: number | null
        }
        Insert: {
          addon_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          price?: number | null
          sort_order?: number | null
          wholesale_price?: number | null
        }
        Update: {
          addon_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          price?: number | null
          sort_order?: number | null
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "addon_options_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "product_addons"
            referencedColumns: ["id"]
          },
        ]
      }
      addon_scopes: {
        Row: {
          addon_id: string
          category_id: string | null
          created_at: string
          deposit_price_override: number | null
          id: string
          price_override: number | null
          product_id: string | null
          scope_type: string
          wholesale_price_override: number | null
        }
        Insert: {
          addon_id: string
          category_id?: string | null
          created_at?: string
          deposit_price_override?: number | null
          id?: string
          price_override?: number | null
          product_id?: string | null
          scope_type: string
          wholesale_price_override?: number | null
        }
        Update: {
          addon_id?: string
          category_id?: string | null
          created_at?: string
          deposit_price_override?: number | null
          id?: string
          price_override?: number | null
          product_id?: string | null
          scope_type?: string
          wholesale_price_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "addon_scopes_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "product_addons"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      attendance_overtime_payments: {
        Row: {
          amount: number
          attendance_id: string
          id: string
          minutes: number
          note: string | null
          paid_at: string
          paid_by: string
          staff_id: string
        }
        Insert: {
          amount: number
          attendance_id: string
          id?: string
          minutes: number
          note?: string | null
          paid_at?: string
          paid_by: string
          staff_id: string
        }
        Update: {
          amount?: number
          attendance_id?: string
          id?: string
          minutes?: number
          note?: string | null
          paid_at?: string
          paid_by?: string
          staff_id?: string
        }
        Relationships: []
      }
      attendance_shifts: {
        Row: {
          absent_after_minutes: number
          created_at: string
          grace_minutes: number
          id: string
          is_active: boolean
          name: string
          overtime_enabled: boolean
          overtime_min_minutes: number
          overtime_rate_per_hour: number
          shift_end: string
          shift_start: string
        }
        Insert: {
          absent_after_minutes?: number
          created_at?: string
          grace_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          overtime_enabled?: boolean
          overtime_min_minutes?: number
          overtime_rate_per_hour?: number
          shift_end: string
          shift_start: string
        }
        Update: {
          absent_after_minutes?: number
          created_at?: string
          grace_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          overtime_enabled?: boolean
          overtime_min_minutes?: number
          overtime_rate_per_hour?: number
          shift_end?: string
          shift_start?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          bg_gradient: string | null
          created_at: string
          cta_text: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link: string | null
          sort_order: number | null
          subtitle: string | null
          title: string
        }
        Insert: {
          bg_gradient?: string | null
          created_at?: string
          cta_text?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title: string
        }
        Update: {
          bg_gradient?: string | null
          created_at?: string
          cta_text?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      discount_code_products: {
        Row: {
          created_at: string
          discount_code_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          discount_code_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          discount_code_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_products_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_code_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_value: number | null
          product_id: string | null
          scope: Database["public"]["Enums"]["discount_scope"]
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          product_id?: string | null
          scope?: Database["public"]["Enums"]["discount_scope"]
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          product_id?: string | null
          scope?: Database["public"]["Enums"]["discount_scope"]
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
        }
        Relationships: []
      }
      governorates: {
        Row: {
          id: string
          is_active: boolean | null
          name_ar: string
          name_en: string | null
          shipping_fee: number | null
        }
        Insert: {
          id: string
          is_active?: boolean | null
          name_ar: string
          name_en?: string | null
          shipping_fee?: number | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          name_ar?: string
          name_en?: string | null
          shipping_fee?: number | null
        }
        Relationships: []
      }
      issue_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          duplicate_of: string | null
          id: string
          issue_type: string
          order_id: string
          order_status_history_id: string | null
          reported_at: string
          reported_by: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["issue_status"]
          updated_at: string
          urgency: Database["public"]["Enums"]["issue_urgency"]
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          duplicate_of?: string | null
          id?: string
          issue_type?: string
          order_id: string
          order_status_history_id?: string | null
          reported_at?: string
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["issue_urgency"]
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          duplicate_of?: string | null
          id?: string
          issue_type?: string
          order_id?: string
          order_status_history_id?: string | null
          reported_at?: string
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["issue_urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "issue_reports_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "issue_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          addons: Json | null
          color: string | null
          design_file_url: string | null
          design_file_urls: string[] | null
          discount_amount: number
          discount_code: string | null
          id: string
          merchant_price: number
          mockup_file_url: string | null
          mockup_file_urls: string[] | null
          order_id: string
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          retail_price: number
          size: string
          variant_id: string | null
          wholesale_price: number
        }
        Insert: {
          addons?: Json | null
          color?: string | null
          design_file_url?: string | null
          design_file_urls?: string[] | null
          discount_amount?: number
          discount_code?: string | null
          id?: string
          merchant_price: number
          mockup_file_url?: string | null
          mockup_file_urls?: string[] | null
          order_id: string
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity: number
          retail_price: number
          size: string
          variant_id?: string | null
          wholesale_price: number
        }
        Update: {
          addons?: Json | null
          color?: string | null
          design_file_url?: string | null
          design_file_urls?: string[] | null
          discount_amount?: number
          discount_code?: string | null
          id?: string
          merchant_price?: number
          mockup_file_url?: string | null
          mockup_file_urls?: string[] | null
          order_id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          retail_price?: number
          size?: string
          variant_id?: string | null
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_returns: {
        Row: {
          admin_notes: string | null
          created_at: string
          deadline_at: string
          deadline_days: number
          id: string
          merchant_id: string
          new_retail_price: number | null
          order_id: string
          original_customer_name: string | null
          original_customer_phone: string | null
          original_customer_phone2: string | null
          original_governorate: string | null
          original_landmark: string | null
          original_region: string | null
          resent_at: string | null
          resent_to_governorate: string | null
          resent_to_landmark: string | null
          resent_to_name: string | null
          resent_to_phone: string | null
          resent_to_phone2: string | null
          resent_to_region: string | null
          status: string
          updated_at: string
          wholesale_charge_amount: number | null
          wholesale_charged_at: string | null
          wholesale_charged_by: string | null
          wholesale_settled: boolean
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          deadline_at?: string
          deadline_days?: number
          id?: string
          merchant_id: string
          new_retail_price?: number | null
          order_id: string
          original_customer_name?: string | null
          original_customer_phone?: string | null
          original_customer_phone2?: string | null
          original_governorate?: string | null
          original_landmark?: string | null
          original_region?: string | null
          resent_at?: string | null
          resent_to_governorate?: string | null
          resent_to_landmark?: string | null
          resent_to_name?: string | null
          resent_to_phone?: string | null
          resent_to_phone2?: string | null
          resent_to_region?: string | null
          status?: string
          updated_at?: string
          wholesale_charge_amount?: number | null
          wholesale_charged_at?: string | null
          wholesale_charged_by?: string | null
          wholesale_settled?: boolean
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          deadline_at?: string
          deadline_days?: number
          id?: string
          merchant_id?: string
          new_retail_price?: number | null
          order_id?: string
          original_customer_name?: string | null
          original_customer_phone?: string | null
          original_customer_phone2?: string | null
          original_governorate?: string | null
          original_landmark?: string | null
          original_region?: string | null
          resent_at?: string | null
          resent_to_governorate?: string | null
          resent_to_landmark?: string | null
          resent_to_name?: string | null
          resent_to_phone?: string | null
          resent_to_phone2?: string | null
          resent_to_region?: string | null
          status?: string
          updated_at?: string
          wholesale_charge_amount?: number | null
          wholesale_charged_at?: string | null
          wholesale_charged_by?: string | null
          wholesale_settled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "order_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          notes: string | null
          old_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          customer_phone2: string | null
          delivered_at: string | null
          deposit_amount: number | null
          deposit_receipt_url: string | null
          deposit_verified: boolean | null
          discount_amount: number | null
          discount_code: string | null
          estimated_delivery: string | null
          final_retail_price: number
          governorate: string
          id: string
          is_hidden: boolean
          landmark: string | null
          merchant_id: string
          merchant_notes: string | null
          merchant_payment_amount: number | null
          merchant_payment_receipt_url: string | null
          merchant_payment_verified: boolean | null
          net_profit: number
          order_number: string
          region: string | null
          shipping_fee: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_merchant_cost: number
          total_wholesale_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          customer_phone2?: string | null
          delivered_at?: string | null
          deposit_amount?: number | null
          deposit_receipt_url?: string | null
          deposit_verified?: boolean | null
          discount_amount?: number | null
          discount_code?: string | null
          estimated_delivery?: string | null
          final_retail_price: number
          governorate: string
          id?: string
          is_hidden?: boolean
          landmark?: string | null
          merchant_id: string
          merchant_notes?: string | null
          merchant_payment_amount?: number | null
          merchant_payment_receipt_url?: string | null
          merchant_payment_verified?: boolean | null
          net_profit: number
          order_number: string
          region?: string | null
          shipping_fee?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_merchant_cost: number
          total_wholesale_cost: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          customer_phone2?: string | null
          delivered_at?: string | null
          deposit_amount?: number | null
          deposit_receipt_url?: string | null
          deposit_verified?: boolean | null
          discount_amount?: number | null
          discount_code?: string | null
          estimated_delivery?: string | null
          final_retail_price?: number
          governorate?: string
          id?: string
          is_hidden?: boolean
          landmark?: string | null
          merchant_id?: string
          merchant_notes?: string | null
          merchant_payment_amount?: number | null
          merchant_payment_receipt_url?: string | null
          merchant_payment_verified?: boolean | null
          net_profit?: number
          order_number?: string
          region?: string | null
          shipping_fee?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_merchant_cost?: number
          total_wholesale_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_addons: {
        Row: {
          created_at: string
          deposit_price: number | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          price: number
          requires_deposit: boolean | null
          tag: string | null
          wholesale_price: number
        }
        Insert: {
          created_at?: string
          deposit_price?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          price: number
          requires_deposit?: boolean | null
          tag?: string | null
          wholesale_price?: number
        }
        Update: {
          created_at?: string
          deposit_price?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          price?: number
          requires_deposit?: boolean | null
          tag?: string | null
          wholesale_price?: number
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          color: string | null
          color_hex: string | null
          created_at: string
          id: string
          is_active: boolean | null
          product_id: string
          size: string
          sku: string | null
          stock_level: number | null
        }
        Insert: {
          color?: string | null
          color_hex?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_id: string
          size: string
          sku?: string | null
          stock_level?: number | null
        }
        Update: {
          color?: string | null
          color_hex?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_id?: string
          size?: string
          sku?: string | null
          stock_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          merchant_price: number
          name: string
          name_en: string | null
          updated_at: string
          wholesale_price: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          merchant_price: number
          name: string
          name_en?: string | null
          updated_at?: string
          wholesale_price: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          merchant_price?: number
          name?: string
          name_en?: string | null
          updated_at?: string
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          is_hidden: boolean
          is_suspended: boolean | null
          merchant_tier: string | null
          phone: string | null
          profile_completed: boolean | null
          shift_id: string | null
          store_link: string | null
          store_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          is_hidden?: boolean
          is_suspended?: boolean | null
          merchant_tier?: string | null
          phone?: string | null
          profile_completed?: boolean | null
          shift_id?: string | null
          store_link?: string | null
          store_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_hidden?: boolean
          is_suspended?: boolean | null
          merchant_tier?: string | null
          phone?: string | null
          profile_completed?: boolean | null
          shift_id?: string | null
          store_link?: string | null
          store_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "attendance_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_order_links: {
        Row: {
          created_at: string
          order_id: string
          settlement_id: string
        }
        Insert: {
          created_at?: string
          order_id: string
          settlement_id: string
        }
        Update: {
          created_at?: string
          order_id?: string
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_order_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_order_links_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlement_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_receipts: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          merchant_id: string
          settled_by: string | null
          wallet_transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          merchant_id: string
          settled_by?: string | null
          wallet_transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          merchant_id?: string
          settled_by?: string | null
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_receipts_wallet_transaction_id_fkey"
            columns: ["wallet_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          merchant_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          merchant_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          merchant_id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: []
      }
      staff_attendance: {
        Row: {
          check_in_at: string
          check_out_at: string | null
          created_at: string
          id: string
          shift_id: string | null
          staff_id: string
          status: string
          updated_at: string
          work_date: string
        }
        Insert: {
          check_in_at?: string
          check_out_at?: string | null
          created_at?: string
          id?: string
          shift_id?: string | null
          staff_id: string
          status?: string
          updated_at?: string
          work_date?: string
        }
        Update: {
          check_in_at?: string
          check_out_at?: string | null
          created_at?: string
          id?: string
          shift_id?: string | null
          staff_id?: string
          status?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "attendance_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_discounts: {
        Row: {
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string
          id: string
          merchant_id: string
          total_earned: number | null
          total_withdrawn: number | null
          updated_at: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          id?: string
          merchant_id: string
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          id?: string
          merchant_id?: string
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_resend_returned_order:
        | {
            Args: {
              p_new_retail_price?: number
              p_resent_to_governorate: string
              p_resent_to_landmark: string
              p_resent_to_name: string
              p_resent_to_phone: string
              p_resent_to_phone2: string
              p_resent_to_region: string
              p_return_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_discount_amount?: number
              p_discount_base_price?: number
              p_discount_code?: string
              p_new_retail_price?: number
              p_resent_to_governorate: string
              p_resent_to_landmark: string
              p_resent_to_name: string
              p_resent_to_phone: string
              p_resent_to_phone2: string
              p_resent_to_region: string
              p_return_id: string
            }
            Returns: string
          }
      charge_merchant_wholesale: {
        Args: { p_reason?: string; p_return_id: string }
        Returns: number
      }
      check_and_decrement_stock: {
        Args: { p_quantity: number; p_variant_id: string }
        Returns: boolean
      }
      complete_user_registration: {
        Args: { p_activation_key: string; p_user_id: string }
        Returns: boolean
      }
      create_order_with_validation: {
        Args: {
          p_customer_name: string
          p_customer_phone: string
          p_customer_phone2: string
          p_deposit_receipt_url: string
          p_discount_code: string
          p_governorate: string
          p_items: Json
          p_landmark: string
          p_merchant_notes: string
          p_merchant_payment_receipt_url: string
          p_region: string
        }
        Returns: string
      }
      generate_order_number: { Args: never; Returns: string }
      get_activation_key_role: {
        Args: { key_code: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      handle_order_returned: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_discount_used_count: {
        Args: { code_text: string }
        Returns: undefined
      }
      restore_order_stock: { Args: { p_order_id: string }; Returns: undefined }
      use_activation_key: {
        Args: { key_code: string; p_user_id: string }
        Returns: boolean
      }
      validate_activation_key: { Args: { key_code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "merchant" | "staff" | "guest"
      discount_scope: "store" | "product"
      discount_type: "percentage" | "fixed"
      issue_status:
        | "new"
        | "in_progress"
        | "waiting_merchant"
        | "declined"
        | "duplicate"
        | "postponed"
        | "solved"
      issue_urgency: "low" | "medium" | "high"
      order_status:
        | "pending"
        | "processing"
        | "printed"
        | "shipped"
        | "delivered"
        | "returned"
        | "cancelled"
        | "resent"
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
      app_role: ["admin", "merchant", "staff", "guest"],
      discount_scope: ["store", "product"],
      discount_type: ["percentage", "fixed"],
      issue_status: [
        "new",
        "in_progress",
        "waiting_merchant",
        "declined",
        "duplicate",
        "postponed",
        "solved",
      ],
      issue_urgency: ["low", "medium", "high"],
      order_status: [
        "pending",
        "processing",
        "printed",
        "shipped",
        "delivered",
        "returned",
        "cancelled",
        "resent",
      ],
    },
  },
} as const
