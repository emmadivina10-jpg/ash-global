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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          reason: string | null
          reviewed_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      activations: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          payment_provider: string
          payment_reference: string
          provider_transaction_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_provider?: string
          payment_reference: string
          provider_transaction_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_provider?: string
          payment_reference?: string
          provider_transaction_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          id: string
          metadata: Json
          new_state: Json
          previous_state: Json
          reason: string | null
          target_reference: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          id?: string
          metadata?: Json
          new_state?: Json
          previous_state?: Json
          reason?: string | null
          target_reference?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          id?: string
          metadata?: Json
          new_state?: Json
          previous_state?: Json
          reason?: string | null
          target_reference?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          accepted_at: string | null
          address: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          decline_reason: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          paid_at: string | null
          pay_by: string | null
          payment_amount: number | null
          payment_currency: string | null
          payment_provider: string
          payment_reference: string | null
          platform_fee: number
          price: number
          provider_amount: number | null
          provider_id: string
          provider_transaction_id: string | null
          respond_by: string | null
          scheduled_at: string
          service_id: string | null
          service_title: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          address?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          decline_reason?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          pay_by?: string | null
          payment_amount?: number | null
          payment_currency?: string | null
          payment_provider?: string
          payment_reference?: string | null
          platform_fee?: number
          price?: number
          provider_amount?: number | null
          provider_id: string
          provider_transaction_id?: string | null
          respond_by?: string | null
          scheduled_at: string
          service_id?: string | null
          service_title: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          address?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          decline_reason?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          pay_by?: string | null
          payment_amount?: number | null
          payment_currency?: string | null
          payment_provider?: string
          payment_reference?: string | null
          platform_fee?: number
          price?: number
          provider_amount?: number | null
          provider_id?: string
          provider_transaction_id?: string | null
          respond_by?: string | null
          scheduled_at?: string
          service_id?: string | null
          service_title?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "provider_services"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          booking_id: string | null
          client_id: string
          created_at: string
          id: string
          last_message_at: string
          provider_id: string
        }
        Insert: {
          booking_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          provider_id: string
        }
        Update: {
          booking_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          kind: string
          metadata: Json
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          category: string
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          category: string
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          detail: Json
          id: string
          outcome: string
          reference: string | null
          signature_verified: boolean
          source: string
          status: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          outcome: string
          reference?: string | null
          signature_verified?: boolean
          source: string
          status?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          outcome?: string
          reference?: string | null
          signature_verified?: boolean
          source?: string
          status?: string | null
        }
        Relationships: []
      }
      payment_link_charges: {
        Row: {
          amount: number
          created_at: string
          id: string
          link_id: string
          paid_at: string | null
          payer_name: string | null
          payer_phone: string | null
          platform_fee: number
          provider_amount: number
          provider_transaction_id: string | null
          reference: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          link_id: string
          paid_at?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          platform_fee?: number
          provider_amount?: number
          provider_transaction_id?: string | null
          reference: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          link_id?: string
          paid_at?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          platform_fee?: number
          provider_amount?: number
          provider_transaction_id?: string | null
          reference?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_link_charges_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "payment_links"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          amount: number
          code: string
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          paid_count: number
          provider_id: string
          service_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          paid_count?: number
          provider_id: string
          service_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          paid_count?: number
          provider_id?: string
          service_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "provider_services"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_path: string
          provider_id: string
          service_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_path: string
          provider_id: string
          service_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_path?: string
          provider_id?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "provider_services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          referral_code: string
          referred_by: string | null
          stripe_account_id: string | null
          stripe_details_submitted: boolean
          stripe_payouts_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          referral_code: string
          referred_by?: string | null
          stripe_account_id?: string | null
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          referral_code?: string
          referred_by?: string | null
          stripe_account_id?: string | null
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          created_at: string
          end_minute: number
          id: string
          provider_id: string
          start_minute: number
          weekday: number
        }
        Insert: {
          created_at?: string
          end_minute: number
          id?: string
          provider_id: string
          start_minute: number
          weekday: number
        }
        Update: {
          created_at?: string
          end_minute?: number
          id?: string
          provider_id?: string
          start_minute?: number
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_profiles: {
        Row: {
          accepting_bookings: boolean
          avatar_url: string | null
          billing_mode: string
          bio: string | null
          booking_lead_hours: number
          business_name: string
          categories: Database["public"]["Enums"]["service_category"][]
          city: string | null
          completed_bookings: number
          country: string
          cover_url: string | null
          created_at: string
          id: string
          is_live: boolean
          is_verified: boolean
          phone: string | null
          rating_avg: number
          rating_count: number
          service_areas: string[]
          slot_minutes: number
          slug: string | null
          subscription_expires_at: string | null
          tagline: string | null
          updated_at: string
          user_id: string
          verification_requested_at: string | null
          verification_status: string
          verified_at: string | null
          whatsapp: string | null
        }
        Insert: {
          accepting_bookings?: boolean
          avatar_url?: string | null
          billing_mode?: string
          bio?: string | null
          booking_lead_hours?: number
          business_name: string
          categories?: Database["public"]["Enums"]["service_category"][]
          city?: string | null
          completed_bookings?: number
          country?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          is_live?: boolean
          is_verified?: boolean
          phone?: string | null
          rating_avg?: number
          rating_count?: number
          service_areas?: string[]
          slot_minutes?: number
          slug?: string | null
          subscription_expires_at?: string | null
          tagline?: string | null
          updated_at?: string
          user_id: string
          verification_requested_at?: string | null
          verification_status?: string
          verified_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          accepting_bookings?: boolean
          avatar_url?: string | null
          billing_mode?: string
          bio?: string | null
          booking_lead_hours?: number
          business_name?: string
          categories?: Database["public"]["Enums"]["service_category"][]
          city?: string | null
          completed_bookings?: number
          country?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          is_live?: boolean
          is_verified?: boolean
          phone?: string | null
          rating_avg?: number
          rating_count?: number
          service_areas?: string[]
          slot_minutes?: number
          slug?: string | null
          subscription_expires_at?: string | null
          tagline?: string | null
          updated_at?: string
          user_id?: string
          verification_requested_at?: string | null
          verification_status?: string
          verified_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      provider_services: {
        Row: {
          category: Database["public"]["Enums"]["service_category"]
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          price: number
          provider_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          price: number
          provider_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          price?: number
          provider_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_subscriptions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_provider: string
          payment_reference: string | null
          period_end: string | null
          period_start: string | null
          provider_id: string
          provider_transaction_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_provider?: string
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          provider_id: string
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_provider?: string
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          provider_id?: string
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_subscriptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_hits: {
        Row: {
          bucket: string
          hits: number
          subject: string
          updated_at: string
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          subject: string
          updated_at?: string
          window_start: string
        }
        Update: {
          bucket?: string
          hits?: number
          subject?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          activated_at: string | null
          activation_status: string
          commission_amount: number
          commission_status: string
          created_at: string
          id: string
          level: number
          referred_user_id: string
          referrer_id: string
          transaction_id: string | null
        }
        Insert: {
          activated_at?: string | null
          activation_status?: string
          commission_amount?: number
          commission_status?: string
          created_at?: string
          id?: string
          level: number
          referred_user_id: string
          referrer_id: string
          transaction_id?: string | null
        }
        Update: {
          activated_at?: string | null
          activation_status?: string
          commission_amount?: number
          commission_status?: string
          created_at?: string
          id?: string
          level?: number
          referred_user_id?: string
          referrer_id?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string | null
          client_id: string
          comment: string | null
          created_at: string
          id: string
          kind: string
          photo_path: string | null
          provider_id: string
          rating: number
        }
        Insert: {
          booking_id?: string | null
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          kind?: string
          photo_path?: string | null
          provider_id: string
          rating: number
        }
        Update: {
          booking_id?: string | null
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          kind?: string
          photo_path?: string | null
          provider_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          detail: Json
          id: string
          kind: string
          route: string | null
          severity: string
          subject: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          kind: string
          route?: string | null
          severity?: string
          subject?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          kind?: string
          route?: string | null
          severity?: string
          subject?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string
          id: string
          reference: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string
          id?: string
          reference: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string
          id?: string
          reference?: string
          status?: string
          type?: string
          user_id?: string
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
      wallets: {
        Row: {
          available_balance: number
          created_at: string
          currency: string
          id: string
          pending_balance: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          pending_balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          pending_balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          currency: string
          id: string
          payment_method: string
          phone_number: string
          processed_at: string | null
          provider_reference: string | null
          reference: string
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          currency?: string
          id?: string
          payment_method: string
          phone_number: string
          processed_at?: string | null
          provider_reference?: string | null
          reference: string
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          currency?: string
          id?: string
          payment_method?: string
          phone_number?: string
          processed_at?: string | null
          provider_reference?: string | null
          reference?: string
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_manual_activate: {
        Args: { _actor?: string; _reason: string; _user_id: string }
        Returns: Json
      }
      begin_booking_payment: {
        Args: { _booking_id: string; _reference: string }
        Returns: Json
      }
      can_view_avatar: { Args: { _object_name: string }; Returns: boolean }
      cancel_booking: {
        Args: { _booking_id: string; _reason?: string }
        Returns: Json
      }
      complete_activation: {
        Args: { _payment_reference: string; _provider_transaction_id: string }
        Returns: Json
      }
      complete_booking_payment: {
        Args: { _payment_reference: string; _provider_transaction_id?: string }
        Returns: Json
      }
      complete_link_payment: {
        Args: { _payment_reference: string; _provider_transaction_id?: string }
        Returns: Json
      }
      complete_provider_subscription: {
        Args: { _payment_reference: string; _provider_transaction_id?: string }
        Returns: undefined
      }
      console_counts: { Args: never; Returns: Json }
      console_financials: { Args: never; Returns: Json }
      console_set_verification: {
        Args: { _approve: boolean; _provider_id: string }
        Returns: Json
      }
      console_settle_withdrawal: {
        Args: {
          _note?: string
          _provider_reference?: string
          _status: string
          _withdrawal_id: string
        }
        Returns: Json
      }
      decide_booking: {
        Args: { _accept: boolean; _booking_id: string; _reason?: string }
        Returns: Json
      }
      fail_booking_payment: {
        Args: { _payment_reference: string; _status: string }
        Returns: Json
      }
      fail_link_payment: {
        Args: { _payment_reference: string; _status: string }
        Returns: undefined
      }
      generate_referral_code: { Args: never; Returns: string }
      get_provider_bookings: {
        Args: never
        Returns: {
          accepted_at: string
          address: string
          client_email: string
          client_id: string
          client_name: string
          client_phone: string
          completed_at: string
          created_at: string
          decline_reason: string
          id: string
          invoice_number: string
          notes: string
          paid_at: string
          pay_by: string
          platform_fee: number
          price: number
          provider_amount: number
          provider_id: string
          respond_by: string
          scheduled_at: string
          service_id: string
          service_title: string
          status: string
        }[]
      }
      get_user_network_tree: {
        Args: never
        Returns: {
          account_status: string
          commission: number
          id: string
          joined_at: string
          level: number
          parent_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      is_provider_owner: { Args: { _provider_id: string }; Returns: boolean }
      is_provider_visible: { Args: { _provider_id: string }; Returns: boolean }
      log_security_event: {
        Args: {
          _actor?: string
          _detail?: Json
          _kind: string
          _route?: string
          _severity?: string
          _subject?: string
        }
        Returns: undefined
      }
      notify_user: {
        Args: {
          _body?: string
          _category: string
          _data?: Json
          _title: string
          _user_id: string
        }
        Returns: undefined
      }
      provider_slots: {
        Args: { _date: string; _duration?: number; _provider_id: string }
        Returns: string[]
      }
      rate_limit_check: {
        Args: {
          _bucket: string
          _limit: number
          _subject: string
          _window_seconds: number
        }
        Returns: Json
      }
      request_booking: {
        Args: {
          _address?: string
          _notes?: string
          _provider_id: string
          _scheduled_at: string
          _service_id: string
        }
        Returns: Json
      }
      request_withdrawal: {
        Args: { _amount: number; _method: string; _phone: string }
        Returns: Json
      }
      security_housekeeping: { Args: never; Returns: undefined }
      security_overview: { Args: { _hours?: number }; Returns: Json }
      security_selfcheck: { Args: never; Returns: Json }
      set_booking_progress: {
        Args: { _booking_id: string; _status: string }
        Returns: Json
      }
      settle_withdrawal: {
        Args: {
          _note?: string
          _provider_reference?: string
          _status: string
          _withdrawal_id: string
        }
        Returns: Json
      }
      slugify: { Args: { _value: string }; Returns: string }
      submit_community_review: {
        Args: { _comment?: string; _provider_id: string; _rating: number }
        Returns: Json
      }
      submit_review: {
        Args: {
          _booking_id: string
          _comment?: string
          _photo_path?: string
          _rating: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      booking_status:
        | "PENDING"
        | "CONFIRMED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELLED"
        | "DECLINED"
        | "SETTLED"
        | "NO_SHOW"
        | "REFUNDED"
        | "DISPUTED"
        | "ACCEPTED"
        | "PAYMENT_PROCESSING"
        | "PAYMENT_FAILED"
        | "PAYMENT_EXPIRED"
      service_category:
        | "BRAIDER"
        | "NAIL_TECH"
        | "LASH_TECH"
        | "MAKEUP"
        | "BARBER"
        | "OTHER"
        | "HAIR_STYLIST"
        | "MASSAGE"
        | "WEB_DEV"
        | "MOBILE_DEV"
        | "UIUX"
        | "CYBERSECURITY"
        | "DEVOPS"
        | "CLOUD"
        | "AI"
        | "IT_CONSULTING"
        | "ELECTRICIAN"
        | "PLUMBER"
        | "CLEANER"
        | "HANDYMAN"
        | "PRIVATE_CHEF"
        | "PHOTOGRAPHY"
        | "VIDEOGRAPHY"
        | "CATERING"
        | "DECORATION"
        | "DJ"
        | "EVENT_PLANNING"
        | "HEALTH_WELLNESS"
        | "PROFESSIONAL"
      subscription_status: "PENDING" | "ACTIVE" | "EXPIRED" | "FAILED"
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
      app_role: ["admin", "user"],
      booking_status: [
        "PENDING",
        "CONFIRMED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "DECLINED",
        "SETTLED",
        "NO_SHOW",
        "REFUNDED",
        "DISPUTED",
        "ACCEPTED",
        "PAYMENT_PROCESSING",
        "PAYMENT_FAILED",
        "PAYMENT_EXPIRED",
      ],
      service_category: [
        "BRAIDER",
        "NAIL_TECH",
        "LASH_TECH",
        "MAKEUP",
        "BARBER",
        "OTHER",
        "HAIR_STYLIST",
        "MASSAGE",
        "WEB_DEV",
        "MOBILE_DEV",
        "UIUX",
        "CYBERSECURITY",
        "DEVOPS",
        "CLOUD",
        "AI",
        "IT_CONSULTING",
        "ELECTRICIAN",
        "PLUMBER",
        "CLEANER",
        "HANDYMAN",
        "PRIVATE_CHEF",
        "PHOTOGRAPHY",
        "VIDEOGRAPHY",
        "CATERING",
        "DECORATION",
        "DJ",
        "EVENT_PLANNING",
        "HEALTH_WELLNESS",
        "PROFESSIONAL",
      ],
      subscription_status: ["PENDING", "ACTIVE", "EXPIRED", "FAILED"],
    },
  },
} as const
