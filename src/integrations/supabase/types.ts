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
      activity_events: {
        Row: {
          author_id: string | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          dwell_ms: number | null
          event_type: string
          hashtags: string[] | null
          id: number
          metadata: Json
          surface: string
          target_id: string | null
          target_type: string | null
          user_id: string
          weight: number
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          dwell_ms?: number | null
          event_type: string
          hashtags?: string[] | null
          id?: never
          metadata?: Json
          surface: string
          target_id?: string | null
          target_type?: string | null
          user_id?: string
          weight?: number
        }
        Update: {
          author_id?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          dwell_ms?: number | null
          event_type?: string
          hashtags?: string[] | null
          id?: never
          metadata?: Json
          surface?: string
          target_id?: string | null
          target_type?: string | null
          user_id?: string
          weight?: number
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
      article_likes: {
        Row: {
          article_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_likes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string
          body: string
          category: string
          cover_path: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          like_count: number
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          body: string
          category?: string
          cover_path?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          like_count?: number
          tags?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          body?: string
          category?: string
          cover_path?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          like_count?: number
          tags?: string[]
          title?: string
          updated_at?: string
          view_count?: number
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
      chat_groups: {
        Row: {
          avatar_path: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_settings: {
        Row: {
          created_at: string
          lock_pin: string | null
          updated_at: string
          user_id: string
          wallpaper: string
          wallpaper_path: string | null
        }
        Insert: {
          created_at?: string
          lock_pin?: string | null
          updated_at?: string
          user_id: string
          wallpaper?: string
          wallpaper_path?: string | null
        }
        Update: {
          created_at?: string
          lock_pin?: string | null
          updated_at?: string
          user_id?: string
          wallpaper?: string
          wallpaper_path?: string | null
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      content_mentions: {
        Row: {
          actor_id: string
          content_id: string
          content_type: string
          created_at: string
          id: string
          mentioned_user_id: string
        }
        Insert: {
          actor_id: string
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          mentioned_user_id: string
        }
        Update: {
          actor_id?: string
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_mentions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "content_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      content_popularity: {
        Row: {
          author_id: string | null
          category: string | null
          city: string | null
          content_id: string
          content_type: string
          country: string | null
          created_at: string | null
          engagement_score: number
          freshness_hours: number
          quality_score: number
          refreshed_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          city?: string | null
          content_id: string
          content_type: string
          country?: string | null
          created_at?: string | null
          engagement_score?: number
          freshness_hours?: number
          quality_score?: number
          refreshed_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          city?: string | null
          content_id?: string
          content_type?: string
          country?: string | null
          created_at?: string | null
          engagement_score?: number
          freshness_hours?: number
          quality_score?: number
          refreshed_at?: string
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolution_note: string | null
          reviewed_at: string | null
          status: string
          target_id: string | null
          target_type: string
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolution_note?: string | null
          reviewed_at?: string | null
          status?: string
          target_id?: string | null
          target_type: string
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolution_note?: string | null
          reviewed_at?: string | null
          status?: string
          target_id?: string | null
          target_type?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversation_prefs: {
        Row: {
          archived: boolean
          conversation_id: string
          created_at: string
          id: string
          locked: boolean
          pinned: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          conversation_id: string
          created_at?: string
          id?: string
          locked?: boolean
          pinned?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          conversation_id?: string
          created_at?: string
          id?: string
          locked?: boolean
          pinned?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_prefs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          booking_id: string | null
          client_id: string
          created_at: string
          group_id: string | null
          id: string
          job_id: string | null
          last_message_at: string
          listing_id: string | null
          owner_id: string | null
          provider_id: string | null
        }
        Insert: {
          booking_id?: string | null
          client_id: string
          created_at?: string
          group_id?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string
          listing_id?: string | null
          owner_id?: string | null
          provider_id?: string | null
        }
        Update: {
          booking_id?: string | null
          client_id?: string
          created_at?: string
          group_id?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string
          listing_id?: string | null
          owner_id?: string | null
          provider_id?: string | null
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
            foreignKeyName: "conversations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
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
      deal_claims: {
        Row: {
          claimed_at: string
          code: string
          deal_id: string
          id: string
          redeemed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          code: string
          deal_id: string
          id?: string
          redeemed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          code?: string
          deal_id?: string
          id?: string
          redeemed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_claims_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          category: string
          city: string | null
          claim_limit: number
          claimed_count: number
          country: string
          created_at: string
          deal_price: number
          description: string | null
          ends_at: string
          id: string
          image_path: string | null
          is_active: boolean
          original_price: number
          owner_id: string
          provider_id: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          city?: string | null
          claim_limit?: number
          claimed_count?: number
          country?: string
          created_at?: string
          deal_price: number
          description?: string | null
          ends_at?: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          original_price: number
          owner_id: string
          provider_id?: string | null
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          city?: string | null
          claim_limit?: number
          claimed_count?: number
          country?: string
          created_at?: string
          deal_price?: number
          description?: string | null
          ends_at?: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          original_price?: number
          owner_id?: string
          provider_id?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      department_tasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          department: string
          detail: string | null
          due_date: string
          id: string
          priority: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          department: string
          detail?: string | null
          due_date?: string
          id?: string
          priority?: string
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          department?: string
          detail?: string | null
          due_date?: string
          id?: string
          priority?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_tickets: {
        Row: {
          amount: number
          code: string
          created_at: string
          event_id: string
          id: string
          paid_at: string | null
          payment_provider: string
          payment_reference: string | null
          platform_fee: number
          provider_transaction_id: string | null
          quantity: number
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          code: string
          created_at?: string
          event_id: string
          id?: string
          paid_at?: string | null
          payment_provider?: string
          payment_reference?: string | null
          platform_fee?: number
          provider_transaction_id?: string | null
          quantity?: number
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          event_id?: string
          id?: string
          paid_at?: string | null
          payment_provider?: string
          payment_reference?: string | null
          platform_fee?: number
          provider_transaction_id?: string | null
          quantity?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          city: string | null
          country: string
          cover_path: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_free: boolean
          is_published: boolean
          organizer_id: string
          starts_at: string
          ticket_capacity: number
          ticket_price: number
          tickets_sold: number
          title: string
          updated_at: string
          venue: string | null
          views: number
        }
        Insert: {
          category?: string
          city?: string | null
          country?: string
          cover_path?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          organizer_id: string
          starts_at: string
          ticket_capacity?: number
          ticket_price?: number
          tickets_sold?: number
          title: string
          updated_at?: string
          venue?: string | null
          views?: number
        }
        Update: {
          category?: string
          city?: string | null
          country?: string
          cover_path?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          organizer_id?: string
          starts_at?: string
          ticket_capacity?: number
          ticket_price?: number
          tickets_sold?: number
          title?: string
          updated_at?: string
          venue?: string | null
          views?: number
        }
        Relationships: []
      }
      forum_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string
          body: string
          comment_count: number
          created_at: string
          id: string
          image_path: string | null
          like_count: number
          space: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          comment_count?: number
          created_at?: string
          id?: string
          image_path?: string | null
          like_count?: number
          space?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          comment_count?: number
          created_at?: string
          id?: string
          image_path?: string | null
          like_count?: number
          space?: string
          updated_at?: string
        }
        Relationships: []
      }
      freelance_projects: {
        Row: {
          awarded_user_id: string | null
          budget: number
          category: string
          city: string | null
          client_id: string
          country: string
          created_at: string
          currency: string
          deadline_days: number
          description: string
          id: string
          location_type: string
          proposals_count: number
          skills: string[]
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          awarded_user_id?: string | null
          budget?: number
          category?: string
          city?: string | null
          client_id: string
          country?: string
          created_at?: string
          currency?: string
          deadline_days?: number
          description: string
          id?: string
          location_type?: string
          proposals_count?: number
          skills?: string[]
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          awarded_user_id?: string | null
          budget?: number
          category?: string
          city?: string | null
          client_id?: string
          country?: string
          created_at?: string
          currency?: string
          deadline_days?: number
          description?: string
          id?: string
          location_type?: string
          proposals_count?: number
          skills?: string[]
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      freelance_proposals: {
        Row: {
          amount: number
          cover_letter: string
          created_at: string
          delivery_days: number
          freelancer_id: string
          id: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          cover_letter: string
          created_at?: string
          delivery_days?: number
          freelancer_id: string
          id?: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cover_letter?: string
          created_at?: string
          delivery_days?: number
          freelancer_id?: string
          id?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelance_proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "freelance_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_profiles: {
        Row: {
          availability: string
          bio: string | null
          categories: string[]
          city: string | null
          completed_projects: number
          country: string
          created_at: string
          headline: string
          hourly_rate: number | null
          id: string
          is_published: boolean
          profile_views: number
          rating_avg: number
          rating_count: number
          skills: string[]
          starting_price: number
          updated_at: string
          user_id: string
          years_experience: number
        }
        Insert: {
          availability?: string
          bio?: string | null
          categories?: string[]
          city?: string | null
          completed_projects?: number
          country?: string
          created_at?: string
          headline: string
          hourly_rate?: number | null
          id?: string
          is_published?: boolean
          profile_views?: number
          rating_avg?: number
          rating_count?: number
          skills?: string[]
          starting_price?: number
          updated_at?: string
          user_id: string
          years_experience?: number
        }
        Update: {
          availability?: string
          bio?: string | null
          categories?: string[]
          city?: string | null
          completed_projects?: number
          country?: string
          created_at?: string
          headline?: string
          hourly_rate?: number | null
          id?: string
          is_published?: boolean
          profile_views?: number
          rating_avg?: number
          rating_count?: number
          skills?: string[]
          starting_price?: number
          updated_at?: string
          user_id?: string
          years_experience?: number
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      fx_instructor_applications: {
        Row: {
          admin_note: string | null
          country: string
          created_at: string
          date_of_birth: string
          declarations_accepted: boolean
          display_name: string
          expertise: string[]
          government_id_path: string
          government_id_type: string
          id: string
          kyc_provider: string | null
          kyc_reference: string | null
          kyc_status: string
          legal_full_name: string
          profile_summary: string
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string
          status: string
          submitted_at: string
          trading_background: string
          trading_experience: string
          updated_at: string
          user_id: string
          years_experience: number
        }
        Insert: {
          admin_note?: string | null
          country: string
          created_at?: string
          date_of_birth: string
          declarations_accepted?: boolean
          display_name: string
          expertise?: string[]
          government_id_path: string
          government_id_type: string
          id?: string
          kyc_provider?: string | null
          kyc_reference?: string | null
          kyc_status?: string
          legal_full_name: string
          profile_summary: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path: string
          status?: string
          submitted_at?: string
          trading_background: string
          trading_experience: string
          updated_at?: string
          user_id: string
          years_experience: number
        }
        Update: {
          admin_note?: string | null
          country?: string
          created_at?: string
          date_of_birth?: string
          declarations_accepted?: boolean
          display_name?: string
          expertise?: string[]
          government_id_path?: string
          government_id_type?: string
          id?: string
          kyc_provider?: string | null
          kyc_reference?: string | null
          kyc_status?: string
          legal_full_name?: string
          profile_summary?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string
          status?: string
          submitted_at?: string
          trading_background?: string
          trading_experience?: string
          updated_at?: string
          user_id?: string
          years_experience?: number
        }
        Relationships: []
      }
      fx_instructor_follows: {
        Row: {
          created_at: string
          follower_id: string
          instructor_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          instructor_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          instructor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fx_instructor_follows_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "fx_instructor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_instructor_profiles: {
        Row: {
          about: string
          application_id: string
          approved_at: string
          created_at: string
          experience_summary: string
          follower_count: number
          id: string
          is_active: boolean
          specialties: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          about?: string
          application_id: string
          approved_at: string
          created_at?: string
          experience_summary?: string
          follower_count?: number
          id?: string
          is_active?: boolean
          specialties?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          about?: string
          application_id?: string
          approved_at?: string
          created_at?: string
          experience_summary?: string
          follower_count?: number
          id?: string
          is_active?: boolean
          specialties?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fx_instructor_profiles_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "fx_instructor_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          added_by: string | null
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtags: {
        Row: {
          created_at: string
          id: string
          name: string
          normalized_name: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          normalized_name: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          normalized_name?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      impersonation_attempts: {
        Row: {
          actor_id: string | null
          attempted_value: string | null
          created_at: string
          id: string
          kind: string
          protected_user_id: string | null
        }
        Insert: {
          actor_id?: string | null
          attempted_value?: string | null
          created_at?: string
          id?: string
          kind: string
          protected_user_id?: string | null
        }
        Update: {
          actor_id?: string | null
          attempted_value?: string | null
          created_at?: string
          id?: string
          kind?: string
          protected_user_id?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applicant_id: string
          contact_phone: string | null
          cover_letter: string
          created_at: string
          id: string
          job_id: string
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          contact_phone?: string | null
          cover_letter: string
          created_at?: string
          id?: string
          job_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          contact_phone?: string | null
          cover_letter?: string
          created_at?: string
          id?: string
          job_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          applications_count: number
          apply_deadline: string | null
          category: string
          city: string | null
          company: string
          contact_email: string | null
          country: string
          created_at: string
          currency: string
          description: string
          employment_type: string
          id: string
          image_path: string | null
          is_open: boolean
          location_type: string
          poster_id: string
          salary_max: number | null
          salary_min: number | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          applications_count?: number
          apply_deadline?: string | null
          category?: string
          city?: string | null
          company: string
          contact_email?: string | null
          country?: string
          created_at?: string
          currency?: string
          description: string
          employment_type?: string
          id?: string
          image_path?: string | null
          is_open?: boolean
          location_type?: string
          poster_id: string
          salary_max?: number | null
          salary_min?: number | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          applications_count?: number
          apply_deadline?: string | null
          category?: string
          city?: string | null
          company?: string
          contact_email?: string | null
          country?: string
          created_at?: string
          currency?: string
          description?: string
          employment_type?: string
          id?: string
          image_path?: string | null
          is_open?: boolean
          location_type?: string
          poster_id?: string
          salary_max?: number | null
          salary_min?: number | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          lead_id: string
          staff_id: string | null
          staff_name: string
          stage_from: string | null
          stage_to: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          lead_id: string
          staff_id?: string | null
          staff_name?: string
          stage_from?: string | null
          stage_to?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          lead_id?: string
          staff_id?: string | null
          staff_name?: string
          stage_from?: string | null
          stage_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          category: string | null
          city: string | null
          converted_provider_id: string | null
          converted_user_id: string | null
          country: string
          created_at: string
          created_by: string | null
          department: string
          email: string | null
          id: string
          last_contacted_at: string | null
          lead_type: string
          name: string
          next_follow_up: string | null
          notes: string | null
          phone: string | null
          source: string | null
          stage: string
          updated_at: string
          value: number
          whatsapp: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          city?: string | null
          converted_provider_id?: string | null
          converted_user_id?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          department?: string
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          lead_type?: string
          name: string
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
          value?: number
          whatsapp?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          city?: string | null
          converted_provider_id?: string | null
          converted_user_id?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          department?: string
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          lead_type?: string
          name?: string
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
          value?: number
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      market_post_saves: {
        Row: {
          created_at: string
          market_post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          market_post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          market_post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_post_saves_market_post_id_fkey"
            columns: ["market_post_id"]
            isOneToOne: false
            referencedRelation: "market_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      market_posts: {
        Row: {
          author_id: string
          content_type: string
          created_at: string
          educational_label: string
          id: string
          instructor_id: string
          instrument: string | null
          is_published: boolean
          market_category: string
          published_at: string
          social_post_id: string
          spotlight_post_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content_type: string
          created_at?: string
          educational_label?: string
          id?: string
          instructor_id: string
          instrument?: string | null
          is_published?: boolean
          market_category?: string
          published_at?: string
          social_post_id: string
          spotlight_post_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content_type?: string
          created_at?: string
          educational_label?: string
          id?: string
          instructor_id?: string
          instrument?: string | null
          is_published?: boolean
          market_category?: string
          published_at?: string
          social_post_id?: string
          spotlight_post_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_posts_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "fx_instructor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_posts_social_post_id_fkey"
            columns: ["social_post_id"]
            isOneToOne: true
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_posts_spotlight_post_id_fkey"
            columns: ["spotlight_post_id"]
            isOneToOne: true
            referencedRelation: "spotlight_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      member_presence: {
        Row: {
          last_active_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_active_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_active_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mentor_requests: {
        Row: {
          created_at: string
          id: string
          mentor_id: string
          message: string | null
          requester_id: string
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentor_id: string
          message?: string | null
          requester_id: string
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mentor_id?: string
          message?: string | null
          requester_id?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_requests_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          availability: string
          bio: string | null
          city: string | null
          country: string
          created_at: string
          headline: string
          id: string
          is_free: boolean
          is_published: boolean
          session_price: number
          sessions_count: number
          skills: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string
          bio?: string | null
          city?: string | null
          country?: string
          created_at?: string
          headline: string
          id?: string
          is_free?: boolean
          is_published?: boolean
          session_price?: number
          sessions_count?: number
          skills?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: string
          bio?: string | null
          city?: string | null
          country?: string
          created_at?: string
          headline?: string
          id?: string
          is_free?: boolean
          is_published?: boolean
          session_price?: number
          sessions_count?: number
          skills?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      moderation_cases: {
        Row: {
          confidence: number | null
          content_type: string
          created_at: string
          id: string
          media_hash: string
          media_type: string
          original_name: string | null
          reason: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          verdict: string
        }
        Insert: {
          confidence?: number | null
          content_type: string
          created_at?: string
          id?: string
          media_hash: string
          media_type: string
          original_name?: string | null
          reason: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verdict: string
        }
        Update: {
          confidence?: number | null
          content_type?: string
          created_at?: string
          id?: string
          media_hash?: string
          media_type?: string
          original_name?: string | null
          reason?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verdict?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
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
          actor_id?: string | null
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
          actor_id?: string | null
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
      outreach_log: {
        Row: {
          body: string
          channel: string
          created_at: string
          delivered: boolean
          error: string | null
          id: string
          lead_id: string | null
          recipient: string
          staff_id: string | null
          staff_name: string
          subject: string | null
          target_user_id: string | null
          template_key: string | null
          ticket_id: string | null
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          delivered?: boolean
          error?: string | null
          id?: string
          lead_id?: string | null
          recipient: string
          staff_id?: string | null
          staff_name?: string
          subject?: string | null
          target_user_id?: string | null
          template_key?: string | null
          ticket_id?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          delivered?: boolean
          error?: string | null
          id?: string
          lead_id?: string | null
          recipient?: string
          staff_id?: string | null
          staff_name?: string
          subject?: string | null
          target_user_id?: string | null
          template_key?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      platform_payouts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          destination: string
          failure_reason: string | null
          id: string
          note: string | null
          processed_at: string | null
          provider: string | null
          provider_reference: string | null
          reference: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          destination: string
          failure_reason?: string | null
          id?: string
          note?: string | null
          processed_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          reference: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          destination?: string
          failure_reason?: string | null
          id?: string
          note?: string | null
          processed_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          reference?: string
          status?: string
        }
        Relationships: []
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
      post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_hidden: boolean
          like_count: number
          parent_id: string | null
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          like_count?: number
          parent_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          like_count?: number
          parent_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_hashtags: {
        Row: {
          created_at: string
          hashtag_id: string
          post_id: string
        }
        Insert: {
          created_at?: string
          hashtag_id: string
          post_id: string
        }
        Update: {
          created_at?: string
          hashtag_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_hashtags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_photo_tags: {
        Row: {
          created_at: string
          id: string
          image_index: number
          post_id: string
          status: string
          tagged_by: string
          tagged_user_id: string
          updated_at: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_index: number
          post_id: string
          status?: string
          tagged_by: string
          tagged_user_id: string
          updated_at?: string
          x: number
          y: number
        }
        Update: {
          created_at?: string
          id?: string
          image_index?: number
          post_id?: string
          status?: string
          tagged_by?: string
          tagged_user_id?: string
          updated_at?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_photo_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_photo_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_photo_tags_tagged_user_id_fkey"
            columns: ["tagged_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      post_reposts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          birthday: string | null
          city: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          moderation_ban_reason: string | null
          moderation_banned_at: string | null
          moderation_previous_status: string | null
          phone: string
          referral_code: string
          referred_by: string | null
          stripe_account_id: string | null
          stripe_details_submitted: boolean
          stripe_payouts_enabled: boolean
          terms_accepted_at: string | null
          updated_at: string
          user_id: string
          username: string
          verified_tier: string | null
          verified_until: string | null
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          birthday?: string | null
          city?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          moderation_ban_reason?: string | null
          moderation_banned_at?: string | null
          moderation_previous_status?: string | null
          phone?: string
          referral_code: string
          referred_by?: string | null
          stripe_account_id?: string | null
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
          user_id: string
          username: string
          verified_tier?: string | null
          verified_until?: string | null
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          birthday?: string | null
          city?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          moderation_ban_reason?: string | null
          moderation_banned_at?: string | null
          moderation_previous_status?: string | null
          phone?: string
          referral_code?: string
          referred_by?: string | null
          stripe_account_id?: string | null
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          verified_tier?: string | null
          verified_until?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          amount: number
          category: string | null
          city: string | null
          clicks: number
          created_at: string
          currency: string
          ends_at: string | null
          headline: string
          id: string
          impressions: number
          owner_id: string
          payment_reference: string | null
          plan: string
          provider_transaction_id: string | null
          starts_at: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          city?: string | null
          clicks?: number
          created_at?: string
          currency?: string
          ends_at?: string | null
          headline: string
          id?: string
          impressions?: number
          owner_id: string
          payment_reference?: string | null
          plan: string
          provider_transaction_id?: string | null
          starts_at?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          city?: string | null
          clicks?: number
          created_at?: string
          currency?: string
          ends_at?: string | null
          headline?: string
          id?: string
          impressions?: number
          owner_id?: string
          payment_reference?: string | null
          plan?: string
          provider_transaction_id?: string | null
          starts_at?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      property_categories: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          kind: string
          label_en: string
          label_fr: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          label_en: string
          label_fr: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          label_en?: string
          label_fr?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      property_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_path: string
          listing_id: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_path: string
          listing_id: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_path?: string
          listing_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      property_listings: {
        Row: {
          amenities: string[]
          approx_lat: number | null
          approx_lng: number | null
          available_from: string | null
          bathrooms: number
          bedrooms: number
          category: string
          city: string
          contact_phone: string | null
          contact_whatsapp: string | null
          country: string
          created_at: string
          currency: string
          description: string | null
          distance_km: number | null
          expires_at: string
          id: string
          inquiry_count: number
          is_furnished: boolean
          land_use: string | null
          listing_kind: string
          neighborhood: string | null
          owner_id: string
          owner_kind: string
          postal_code: string | null
          price: number
          price_period: string
          region: string | null
          size_unit: string | null
          size_value: number | null
          status: string
          title: string
          university: string | null
          updated_at: string
          verification_status: string
          view_count: number
        }
        Insert: {
          amenities?: string[]
          approx_lat?: number | null
          approx_lng?: number | null
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          category?: string
          city: string
          contact_phone?: string | null
          contact_whatsapp?: string | null
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          distance_km?: number | null
          expires_at?: string
          id?: string
          inquiry_count?: number
          is_furnished?: boolean
          land_use?: string | null
          listing_kind?: string
          neighborhood?: string | null
          owner_id: string
          owner_kind?: string
          postal_code?: string | null
          price?: number
          price_period?: string
          region?: string | null
          size_unit?: string | null
          size_value?: number | null
          status?: string
          title: string
          university?: string | null
          updated_at?: string
          verification_status?: string
          view_count?: number
        }
        Update: {
          amenities?: string[]
          approx_lat?: number | null
          approx_lng?: number | null
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          category?: string
          city?: string
          contact_phone?: string | null
          contact_whatsapp?: string | null
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          distance_km?: number | null
          expires_at?: string
          id?: string
          inquiry_count?: number
          is_furnished?: boolean
          land_use?: string | null
          listing_kind?: string
          neighborhood?: string | null
          owner_id?: string
          owner_kind?: string
          postal_code?: string | null
          price?: number
          price_period?: string
          region?: string | null
          size_unit?: string | null
          size_value?: number | null
          status?: string
          title?: string
          university?: string | null
          updated_at?: string
          verification_status?: string
          view_count?: number
        }
        Relationships: []
      }
      property_saves: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_saves_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      property_verifications: {
        Row: {
          check_kind: string
          created_at: string
          id: string
          listing_id: string
          notes: string | null
          outcome: string
          reviewed_at: string | null
          reviewer: string
        }
        Insert: {
          check_kind: string
          created_at?: string
          id?: string
          listing_id: string
          notes?: string | null
          outcome?: string
          reviewed_at?: string | null
          reviewer?: string
        }
        Update: {
          check_kind?: string
          created_at?: string
          id?: string
          listing_id?: string
          notes?: string | null
          outcome?: string
          reviewed_at?: string | null
          reviewer?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_verifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      property_viewing_requests: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          message: string | null
          owner_id: string
          proposed_at: string | null
          requested_at: string
          requester_id: string
          responded_at: string | null
          response_note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          owner_id: string
          proposed_at?: string | null
          requested_at: string
          requester_id: string
          responded_at?: string | null
          response_note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          owner_id?: string
          proposed_at?: string | null
          requested_at?: string
          requester_id?: string
          responded_at?: string | null
          response_note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_viewing_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
        ]
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
      public_profiles: {
        Row: {
          account_status: string | null
          avatar_url: string | null
          birthday: string | null
          city: string | null
          created_at: string | null
          full_name: string | null
          user_id: string
          username: string | null
          verified_tier: string | null
          verified_until: string | null
        }
        Insert: {
          account_status?: string | null
          avatar_url?: string | null
          birthday?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          user_id: string
          username?: string | null
          verified_tier?: string | null
          verified_until?: string | null
        }
        Update: {
          account_status?: string | null
          avatar_url?: string | null
          birthday?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          user_id?: string
          username?: string | null
          verified_tier?: string | null
          verified_until?: string | null
        }
        Relationships: []
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
      recommendation_prefs: {
        Row: {
          created_at: string
          history_cleared_at: string | null
          personalization_enabled: boolean
          updated_at: string
          use_activity_history: boolean
          use_location: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          history_cleared_at?: string | null
          personalization_enabled?: boolean
          updated_at?: string
          use_activity_history?: boolean
          use_location?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          history_cleared_at?: string | null
          personalization_enabled?: boolean
          updated_at?: string
          use_activity_history?: boolean
          use_location?: boolean
          user_id?: string
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
      social_posts: {
        Row: {
          allow_reuse: boolean
          author_id: string
          caption: string
          city: string | null
          comment_count: number
          created_at: string
          filter_comments: boolean
          id: string
          is_published: boolean
          like_count: number
          media: Json
          repost_count: number
          reposted_from: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          allow_reuse?: boolean
          author_id: string
          caption?: string
          city?: string | null
          comment_count?: number
          created_at?: string
          filter_comments?: boolean
          id?: string
          is_published?: boolean
          like_count?: number
          media?: Json
          repost_count?: number
          reposted_from?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          allow_reuse?: boolean
          author_id?: string
          caption?: string
          city?: string | null
          comment_count?: number
          created_at?: string
          filter_comments?: boolean
          id?: string
          is_published?: boolean
          like_count?: number
          media?: Json
          repost_count?: number
          reposted_from?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_reposted_from_fkey"
            columns: ["reposted_from"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      spotlight_hashtags: {
        Row: {
          created_at: string
          hashtag_id: string
          spotlight_id: string
        }
        Insert: {
          created_at?: string
          hashtag_id: string
          spotlight_id: string
        }
        Update: {
          created_at?: string
          hashtag_id?: string
          spotlight_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spotlight_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spotlight_hashtags_spotlight_id_fkey"
            columns: ["spotlight_id"]
            isOneToOne: false
            referencedRelation: "spotlight_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      spotlight_posts: {
        Row: {
          author_id: string
          caption: string
          created_at: string
          id: string
          is_published: boolean
          media: Json
          provider_id: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          caption?: string
          created_at?: string
          id?: string
          is_published?: boolean
          media?: Json
          provider_id?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          caption?: string
          created_at?: string
          id?: string
          is_published?: boolean
          media?: Json
          provider_id?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "spotlight_posts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spotlight_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          spotlight_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          spotlight_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          spotlight_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spotlight_reactions_spotlight_id_fkey"
            columns: ["spotlight_id"]
            isOneToOne: false
            referencedRelation: "spotlight_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spotlight_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      staff_accounts: {
        Row: {
          created_at: string
          department: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          password_hash: string
          phone: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          department: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password_hash: string
          phone?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          department?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password_hash?: string
          phone?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      staff_channel_messages: {
        Row: {
          author_department: string
          author_name: string
          author_staff_id: string | null
          body: string
          channel: string
          created_at: string
          id: string
        }
        Insert: {
          author_department: string
          author_name: string
          author_staff_id?: string | null
          body: string
          channel?: string
          created_at?: string
          id?: string
        }
        Update: {
          author_department?: string
          author_name?: string
          author_staff_id?: string | null
          body?: string
          channel?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      staff_targets: {
        Row: {
          contacts_target: number
          created_at: string
          deals_target: number
          id: string
          period: string
          recruits_target: number
          revenue_target: number
          staff_id: string
          updated_at: string
        }
        Insert: {
          contacts_target?: number
          created_at?: string
          deals_target?: number
          id?: string
          period?: string
          recruits_target?: number
          revenue_target?: number
          staff_id: string
          updated_at?: string
        }
        Update: {
          contacts_target?: number
          created_at?: string
          deals_target?: number
          id?: string
          period?: string
          recruits_target?: number
          revenue_target?: number
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_targets_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          allow_ids: string[]
          audience: string
          author_id: string
          block_ids: string[]
          caption: string
          created_at: string
          expires_at: string
          id: string
          media_path: string
          media_type: string
          view_count: number
        }
        Insert: {
          allow_ids?: string[]
          audience?: string
          author_id: string
          block_ids?: string[]
          caption?: string
          created_at?: string
          expires_at?: string
          id?: string
          media_path: string
          media_type?: string
          view_count?: number
        }
        Update: {
          allow_ids?: string[]
          audience?: string
          author_id?: string
          block_ids?: string[]
          caption?: string
          created_at?: string
          expires_at?: string
          id?: string
          media_path?: string
          media_type?: string
          view_count?: number
        }
        Relationships: []
      }
      story_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          story_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          story_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          story_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      story_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_replies_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      story_views: {
        Row: {
          created_at: string
          id: string
          story_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          body: string
          created_at: string
          email_error: string | null
          email_sent: boolean
          id: string
          sender: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          email_error?: string | null
          email_sent?: boolean
          id?: string
          sender: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          email_error?: string | null
          email_sent?: boolean
          id?: string
          sender?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          email: string
          id: string
          last_message_at: string
          name: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          email: string
          id?: string
          last_message_at?: string
          name: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          email?: string
          id?: string
          last_message_at?: string
          name?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tag_preferences: {
        Row: {
          created_at: string
          review_tags: boolean
          updated_at: string
          user_id: string
          who_can_tag: string
        }
        Insert: {
          created_at?: string
          review_tags?: boolean
          updated_at?: string
          user_id: string
          who_can_tag?: string
        }
        Update: {
          created_at?: string
          review_tags?: boolean
          updated_at?: string
          user_id?: string
          who_can_tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      user_interest_signals: {
        Row: {
          event_count: number
          last_event_at: string | null
          score: number
          signal_key: string
          signal_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          event_count?: number
          last_event_at?: string | null
          score?: number
          signal_key: string
          signal_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          event_count?: number
          last_event_at?: string | null
          score?: number
          signal_key?: string
          signal_type?: string
          updated_at?: string
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
      verifications: {
        Row: {
          amount: number
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          note: string | null
          payment_reference: string | null
          provider_transaction_id: string | null
          started_at: string | null
          status: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          note?: string | null
          payment_reference?: string | null
          provider_transaction_id?: string | null
          started_at?: string | null
          status?: string
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          note?: string | null
          payment_reference?: string | null
          provider_transaction_id?: string | null
          started_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
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
      activity_event_direction: {
        Args: { _event_type: string }
        Returns: number
      }
      activity_event_weight: {
        Args: { _dwell_ms?: number; _event_type: string }
        Returns: number
      }
      admin_credit_wallet: {
        Args: { _amount: number; _reason: string; _user_id: string }
        Returns: Json
      }
      admin_manual_activate: {
        Args: { _actor?: string; _reason: string; _user_id: string }
        Returns: Json
      }
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      begin_booking_payment: {
        Args: { _booking_id: string; _reference: string }
        Returns: Json
      }
      can_view_avatar: { Args: { _object_name: string }; Returns: boolean }
      cancel_booking: {
        Args: { _booking_id: string; _reason?: string }
        Returns: Json
      }
      claim_deal: {
        Args: { _deal_id: string; _user_id: string }
        Returns: Json
      }
      clear_my_activity_history: { Args: never; Returns: undefined }
      complete_activation: {
        Args: { _payment_reference: string; _provider_transaction_id: string }
        Returns: Json
      }
      complete_booking_payment: {
        Args: { _payment_reference: string; _provider_transaction_id?: string }
        Returns: Json
      }
      complete_event_ticket: {
        Args: { _payment_reference: string; _provider_transaction_id: string }
        Returns: Json
      }
      complete_link_payment: {
        Args: { _payment_reference: string; _provider_transaction_id?: string }
        Returns: Json
      }
      complete_promotion: {
        Args: { _payment_reference: string; _provider_transaction_id: string }
        Returns: Json
      }
      complete_provider_subscription: {
        Args: { _payment_reference: string; _provider_transaction_id?: string }
        Returns: undefined
      }
      complete_verification: {
        Args: { _payment_reference: string; _provider_transaction_id?: string }
        Returns: Json
      }
      console_counts: { Args: never; Returns: Json }
      console_financials: { Args: never; Returns: Json }
      console_platform_payout: {
        Args: { _amount: number; _destination: string; _note?: string }
        Returns: Json
      }
      console_set_verification:
        | { Args: { _approve: boolean; _provider_id: string }; Returns: Json }
        | {
            Args: {
              _actor?: string
              _days?: number
              _note?: string
              _tier: string
              _user_id: string
            }
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
      create_spotlight_post: {
        Args: { _caption?: string; _media_path: string }
        Returns: string
      }
      decide_booking: {
        Args: { _accept: boolean; _booking_id: string; _reason?: string }
        Returns: Json
      }
      delete_spotlight_post: {
        Args: { _spotlight_id: string }
        Returns: string
      }
      expire_property_listings: { Args: never; Returns: number }
      expired_spotlight_video_batch: {
        Args: { _limit?: number }
        Returns: {
          id: string
          media: Json
        }[]
      }
      expired_story_cleanup_batch: {
        Args: { _limit?: number }
        Returns: {
          id: string
          media_path: string
        }[]
      }
      extract_social_tokens: {
        Args: {
          _actor_id: string
          _body: string
          _content_id: string
          _content_type: string
        }
        Returns: undefined
      }
      fail_booking_payment: {
        Args: { _payment_reference: string; _status: string }
        Returns: Json
      }
      fail_event_ticket: {
        Args: { _payment_reference: string; _status: string }
        Returns: undefined
      }
      fail_link_payment: {
        Args: { _payment_reference: string; _status: string }
        Returns: undefined
      }
      fail_promotion: {
        Args: { _payment_reference: string; _status: string }
        Returns: undefined
      }
      finalize_spotlight_video_cleanup: {
        Args: { _post_id: string; _removed_paths: string[] }
        Returns: string
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
      get_user_network_tree_with_profiles: {
        Args: never
        Returns: {
          account_status: string
          avatar_url: string
          commission: number
          id: string
          joined_at: string
          level: number
          member_name: string
          parent_id: string
        }[]
      }
      has_project_proposal: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hashtag_feed: {
        Args: {
          _limit?: number
          _normalized_name: string
          _offset?: number
          _sort?: string
        }
        Returns: {
          author_id: string
          caption: string
          city: string
          comment_count: number
          created_at: string
          filter_comments: boolean
          id: string
          like_count: number
          media: Json
          repost_count: number
        }[]
      }
      is_blocked_pair: { Args: { _a: string; _b: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      is_group_member: { Args: { _group_id: string }; Returns: boolean }
      is_group_owner: { Args: { _group_id: string }; Returns: boolean }
      is_project_client: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_provider_owner: { Args: { _provider_id: string }; Returns: boolean }
      is_provider_visible: { Args: { _provider_id: string }; Returns: boolean }
      is_verified: { Args: { _user_id: string }; Returns: boolean }
      log_activity_events: { Args: { _events: Json }; Returns: number }
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
      notify_actor: {
        Args: {
          _actor_id: string
          _body?: string
          _category: string
          _data?: Json
          _title: string
          _user_id: string
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
      open_job_conversation: { Args: { _job_id: string }; Returns: string }
      open_property_conversation: {
        Args: { _listing_id: string }
        Returns: Json
      }
      owns_job: { Args: { _job_id: string }; Returns: boolean }
      owns_mentor: { Args: { _mentor_id: string }; Returns: boolean }
      owns_property: { Args: { _listing_id: string }; Returns: boolean }
      property_is_public: { Args: { _listing_id: string }; Returns: boolean }
      provider_slots: {
        Args: { _date: string; _duration?: number; _provider_id: string }
        Returns: string[]
      }
      provider_zone: { Args: { _country: string }; Returns: string }
      purge_old_activity_events: { Args: { _days?: number }; Returns: number }
      rate_limit_check: {
        Args: {
          _bucket: string
          _limit: number
          _subject: string
          _window_seconds: number
        }
        Returns: Json
      }
      recommend_content: {
        Args: {
          _category?: string
          _city?: string
          _content_type?: string
          _limit?: number
          _offset?: number
        }
        Returns: {
          author_id: string
          category: string
          city: string
          closeness_score: number
          cold_start: boolean
          content_id: string
          diversity_penalty: number
          engagement_score: number
          freshness_score: number
          location_score: number
          personal_score: number
          quality_score: number
          seen_penalty: number
          total_score: number
        }[]
      }
      record_media_moderation: {
        Args: {
          _confidence: number
          _content_type: string
          _media_hash: string
          _media_type: string
          _original_name: string
          _reason: string
          _user_id: string
          _verdict: string
        }
        Returns: string
      }
      record_property_view: {
        Args: { _listing_id: string }
        Returns: undefined
      }
      refresh_active_user_interests: {
        Args: { _since_minutes?: number }
        Returns: number
      }
      refresh_content_popularity: { Args: never; Returns: number }
      refresh_user_interests: {
        Args: { _days?: number; _user_id?: string }
        Returns: number
      }
      release_housekeeping: { Args: never; Returns: Json }
      request_booking: {
        Args: {
          _address?: string
          _custom_price?: number
          _custom_title?: string
          _notes?: string
          _provider_id: string
          _scheduled_at: string
          _service_id: string
        }
        Returns: Json
      }
      request_property_viewing: {
        Args: { _listing_id: string; _message: string; _requested_at: string }
        Returns: Json
      }
      request_withdrawal: {
        Args: { _amount: number; _method: string; _phone: string }
        Returns: Json
      }
      respond_property_viewing: {
        Args: {
          _note: string
          _proposed_at: string
          _status: string
          _viewing_id: string
        }
        Returns: Json
      }
      review_fx_instructor_application: {
        Args: { _application_id: string; _note?: string; _status: string }
        Returns: undefined
      }
      review_media_moderation: {
        Args: {
          _case_id: string
          _decision: string
          _note: string
          _reviewed_by: string
        }
        Returns: undefined
      }
      search_tag_people: {
        Args: { _limit?: number; _query: string }
        Returns: {
          avatar_url: string
          full_name: string
          user_id: string
          username: string
          verified_tier: string
          verified_until: string
        }[]
      }
      security_housekeeping: { Args: never; Returns: undefined }
      security_overview: { Args: { _hours?: number }; Returns: Json }
      security_selfcheck: { Args: never; Returns: Json }
      set_booking_progress: {
        Args: { _booking_id: string; _status: string }
        Returns: Json
      }
      set_comment_reaction: {
        Args: { _comment_id: string; _reaction_type: string }
        Returns: undefined
      }
      set_post_reaction: {
        Args: { _post_id: string; _reaction_type: string }
        Returns: undefined
      }
      set_spotlight_reaction: {
        Args: { _reaction_type: string; _spotlight_id: string }
        Returns: undefined
      }
      set_story_reaction: {
        Args: { _reaction_type: string; _story_id: string }
        Returns: undefined
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
      social_feed: {
        Args: { _limit?: number; _offset?: number }
        Returns: {
          author_id: string
          caption: string
          city: string
          comment_count: number
          created_at: string
          filter_comments: boolean
          id: string
          like_count: number
          liked: boolean
          media: Json
          repost_count: number
          reposted: boolean
          reposted_from: string
          score: number
        }[]
      }
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
      touch_member_presence: { Args: never; Returns: undefined }
      verify_story_cleanup_secret: {
        Args: { _secret: string }
        Returns: boolean
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
