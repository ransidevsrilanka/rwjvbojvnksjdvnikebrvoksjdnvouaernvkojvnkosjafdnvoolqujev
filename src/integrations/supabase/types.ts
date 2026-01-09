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
      access_codes: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          activation_limit: number | null
          activations_used: number | null
          bound_device: string | null
          bound_email: string | null
          code: string
          created_at: string
          created_by: string | null
          duration_days: number | null
          grade: string | null
          id: string
          ip_history: Json | null
          medium: string | null
          status: string
          stream: string | null
          tier: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          activation_limit?: number | null
          activations_used?: number | null
          bound_device?: string | null
          bound_email?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          duration_days?: number | null
          grade?: string | null
          id?: string
          ip_history?: Json | null
          medium?: string | null
          status?: string
          stream?: string | null
          tier?: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          activation_limit?: number | null
          activations_used?: number | null
          bound_device?: string | null
          bound_email?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          duration_days?: number | null
          grade?: string | null
          id?: string
          ip_history?: Json | null
          medium?: string | null
          status?: string
          stream?: string | null
          tier?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      business_phases: {
        Row: {
          current_phase: number | null
          id: string
          phase_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          current_phase?: number | null
          id?: string
          phase_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          current_phase?: number | null
          id?: string
          phase_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      cmo_payouts: {
        Row: {
          amount: number | null
          base_commission_amount: number | null
          bonus_amount: number | null
          cmo_id: string | null
          created_at: string
          id: string
          paid_at: string | null
          payout_month: string | null
          status: string | null
          total_commission: number | null
          total_paid_users: number | null
        }
        Insert: {
          amount?: number | null
          base_commission_amount?: number | null
          bonus_amount?: number | null
          cmo_id?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          payout_month?: string | null
          status?: string | null
          total_commission?: number | null
          total_paid_users?: number | null
        }
        Update: {
          amount?: number | null
          base_commission_amount?: number | null
          bonus_amount?: number | null
          cmo_id?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          payout_month?: string | null
          status?: string | null
          total_commission?: number | null
          total_paid_users?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cmo_payouts_cmo_id_fkey"
            columns: ["cmo_id"]
            isOneToOne: false
            referencedRelation: "cmo_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmo_payouts_cmo_id_fkey"
            columns: ["cmo_id"]
            isOneToOne: false
            referencedRelation: "cmo_performance"
            referencedColumns: ["cmo_id"]
          },
          {
            foreignKeyName: "cmo_payouts_cmo_id_fkey"
            columns: ["cmo_id"]
            isOneToOne: false
            referencedRelation: "cmo_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cmo_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean | null
          is_head_ops: boolean | null
          referral_code: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          is_head_ops?: boolean | null
          referral_code?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          is_head_ops?: boolean | null
          referral_code?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cmo_targets: {
        Row: {
          created_at: string | null
          creators_target: number
          id: string
          phase: number
          users_per_creator_target: number
        }
        Insert: {
          created_at?: string | null
          creators_target: number
          id?: string
          phase: number
          users_per_creator_target: number
        }
        Update: {
          created_at?: string | null
          creators_target?: number
          id?: string
          phase?: number
          users_per_creator_target?: number
        }
        Relationships: []
      }
      commission_tiers: {
        Row: {
          commission_rate: number
          created_at: string | null
          id: string
          monthly_user_threshold: number
          tier_level: number
          tier_name: string
          updated_at: string | null
        }
        Insert: {
          commission_rate: number
          created_at?: string | null
          id?: string
          monthly_user_threshold: number
          tier_level: number
          tier_name: string
          updated_at?: string | null
        }
        Update: {
          commission_rate?: number
          created_at?: string | null
          id?: string
          monthly_user_threshold?: number
          tier_level?: number
          tier_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      content: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          file_path: string | null
          file_type: string | null
          id: string
          is_active: boolean | null
          tier_required: string | null
          title: string
          topic_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          is_active?: boolean | null
          tier_required?: string | null
          title: string
          topic_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          is_active?: boolean | null
          tier_required?: string | null
          title?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_payouts: {
        Row: {
          commission_amount: number | null
          created_at: string
          creator_id: string | null
          id: string
          paid_at: string | null
          paid_users_count: number | null
          payout_month: string | null
          status: string | null
        }
        Insert: {
          commission_amount?: number | null
          created_at?: string
          creator_id?: string | null
          id?: string
          paid_at?: string | null
          paid_users_count?: number | null
          payout_month?: string | null
          status?: string | null
        }
        Update: {
          commission_amount?: number | null
          created_at?: string
          creator_id?: string | null
          id?: string
          paid_at?: string | null
          paid_users_count?: number | null
          payout_month?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_content_stats"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "creator_payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profiles: {
        Row: {
          available_balance: number | null
          cmo_id: string | null
          commission_rate: number | null
          created_at: string
          current_tier_level: number | null
          display_name: string | null
          id: string
          is_active: boolean | null
          lifetime_paid_users: number | null
          monthly_paid_users: number | null
          referral_code: string
          tier_protection_until: string | null
          total_withdrawn: number | null
          user_id: string
        }
        Insert: {
          available_balance?: number | null
          cmo_id?: string | null
          commission_rate?: number | null
          created_at?: string
          current_tier_level?: number | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          lifetime_paid_users?: number | null
          monthly_paid_users?: number | null
          referral_code: string
          tier_protection_until?: string | null
          total_withdrawn?: number | null
          user_id: string
        }
        Update: {
          available_balance?: number | null
          cmo_id?: string | null
          commission_rate?: number | null
          created_at?: string
          current_tier_level?: number | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          lifetime_paid_users?: number | null
          monthly_paid_users?: number | null
          referral_code?: string
          tier_protection_until?: string | null
          total_withdrawn?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_profiles_cmo_id_fkey"
            columns: ["cmo_id"]
            isOneToOne: false
            referencedRelation: "cmo_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_profiles_cmo_id_fkey"
            columns: ["cmo_id"]
            isOneToOne: false
            referencedRelation: "cmo_performance"
            referencedColumns: ["cmo_id"]
          },
          {
            foreignKeyName: "creator_profiles_cmo_id_fkey"
            columns: ["cmo_id"]
            isOneToOne: false
            referencedRelation: "cmo_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          creator_id: string | null
          discount_percent: number | null
          id: string
          is_active: boolean | null
          paid_conversions: number | null
          usage_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          creator_id?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          paid_conversions?: number | null
          usage_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          creator_id?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          paid_conversions?: number | null
          usage_count?: number | null
        }
        Relationships: []
      }
      download_logs: {
        Row: {
          created_at: string
          file_name: string | null
          id: string
          ip_address: string | null
          note_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          id?: string
          ip_address?: string | null
          note_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          id?: string
          ip_address?: string | null
          note_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "download_logs_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          access_code_id: string | null
          created_at: string
          expires_at: string | null
          grade: string | null
          id: string
          is_active: boolean | null
          medium: string | null
          payment_order_id: string | null
          stream: string | null
          tier: string
          updated_at: string
          upgrade_celebrated: boolean | null
          user_id: string
        }
        Insert: {
          access_code_id?: string | null
          created_at?: string
          expires_at?: string | null
          grade?: string | null
          id?: string
          is_active?: boolean | null
          medium?: string | null
          payment_order_id?: string | null
          stream?: string | null
          tier?: string
          updated_at?: string
          upgrade_celebrated?: boolean | null
          user_id: string
        }
        Update: {
          access_code_id?: string | null
          created_at?: string
          expires_at?: string | null
          grade?: string | null
          id?: string
          is_active?: boolean | null
          medium?: string | null
          payment_order_id?: string | null
          stream?: string | null
          tier?: string
          updated_at?: string
          upgrade_celebrated?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_access_code_id_fkey"
            columns: ["access_code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_progress: {
        Row: {
          ease_factor: number | null
          flashcard_id: string
          id: string
          interval_days: number | null
          last_reviewed_at: string | null
          next_review_at: string | null
          repetitions: number | null
          user_id: string
        }
        Insert: {
          ease_factor?: number | null
          flashcard_id: string
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          next_review_at?: string | null
          repetitions?: number | null
          user_id: string
        }
        Update: {
          ease_factor?: number | null
          flashcard_id?: string
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          next_review_at?: string | null
          repetitions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_progress_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_sets: {
        Row: {
          card_count: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          min_tier: string | null
          title: string
          topic_id: string | null
          updated_at: string | null
        }
        Insert: {
          card_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_tier?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string | null
        }
        Update: {
          card_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_tier?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_sets_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back_text: string
          created_at: string | null
          front_text: string
          id: string
          image_url: string | null
          set_id: string
          sort_order: number | null
        }
        Insert: {
          back_text: string
          created_at?: string | null
          front_text: string
          id?: string
          image_url?: string | null
          set_id: string
          sort_order?: number | null
        }
        Update: {
          back_text?: string
          created_at?: string | null
          front_text?: string
          id?: string
          image_url?: string | null
          set_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "flashcard_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      head_ops_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          details: Json | null
          id: string
          request_type: string
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          target_id: string | null
          target_type: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          request_type: string
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          target_id?: string | null
          target_type?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          request_type?: string
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          target_id?: string | null
          target_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      join_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          discount_code: string | null
          grade: string | null
          id: string
          medium: string | null
          receipt_url: string | null
          ref_creator: string | null
          reference_number: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          stream: string | null
          subject_1: string | null
          subject_2: string | null
          subject_3: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          discount_code?: string | null
          grade?: string | null
          id?: string
          medium?: string | null
          receipt_url?: string | null
          ref_creator?: string | null
          reference_number: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          stream?: string | null
          subject_1?: string | null
          subject_2?: string | null
          subject_3?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          discount_code?: string | null
          grade?: string | null
          id?: string
          medium?: string | null
          receipt_url?: string | null
          ref_creator?: string | null
          reference_number?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          stream?: string | null
          subject_1?: string | null
          subject_2?: string | null
          subject_3?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          recipient_id: string
          recipient_type: string
          sender_id: string | null
          subject: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          recipient_id: string
          recipient_type: string
          sender_id?: string | null
          subject: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          recipient_id?: string
          recipient_type?: string
          sender_id?: string | null
          subject?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          download_count: number | null
          file_size: number | null
          file_url: string | null
          id: string
          is_active: boolean | null
          min_tier: string | null
          title: string
          topic_id: string | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          min_tier?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          min_tier?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attributions: {
        Row: {
          amount: number | null
          created_at: string
          creator_commission_amount: number | null
          creator_commission_rate: number | null
          creator_id: string | null
          discount_applied: number | null
          enrollment_id: string | null
          final_amount: number | null
          id: string
          order_id: string | null
          original_amount: number | null
          payment_month: string | null
          payment_type: string | null
          tier: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          creator_commission_amount?: number | null
          creator_commission_rate?: number | null
          creator_id?: string | null
          discount_applied?: number | null
          enrollment_id?: string | null
          final_amount?: number | null
          id?: string
          order_id?: string | null
          original_amount?: number | null
          payment_month?: string | null
          payment_type?: string | null
          tier?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          creator_commission_amount?: number | null
          creator_commission_rate?: number | null
          creator_id?: string | null
          discount_applied?: number | null
          enrollment_id?: string | null
          final_amount?: number | null
          id?: string
          order_id?: string | null
          original_amount?: number | null
          payment_month?: string | null
          payment_type?: string | null
          tier?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attributions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attributions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_content_stats"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "payment_attributions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attributions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          discount_code: string | null
          enrollment_id: string | null
          failure_reason: string | null
          id: string
          order_id: string
          payment_id: string | null
          payment_method: string | null
          processed_at: string | null
          ref_creator: string | null
          refund_amount: number | null
          refund_status: string | null
          refunded_at: string | null
          refunded_by: string | null
          status: string | null
          tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          discount_code?: string | null
          enrollment_id?: string | null
          failure_reason?: string | null
          id?: string
          order_id: string
          payment_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          ref_creator?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          status?: string | null
          tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          discount_code?: string | null
          enrollment_id?: string | null
          failure_reason?: string | null
          id?: string
          order_id?: string
          payment_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          ref_creator?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          status?: string | null
          tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          abuse_flags: number | null
          avatar_url: string | null
          created_at: string
          device_fingerprint: string | null
          downloads_disabled: boolean | null
          email: string | null
          full_name: string | null
          id: string
          is_locked: boolean | null
          max_devices: number | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          abuse_flags?: number | null
          avatar_url?: string | null
          created_at?: string
          device_fingerprint?: string | null
          downloads_disabled?: boolean | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_locked?: boolean | null
          max_devices?: number | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          abuse_flags?: number | null
          avatar_url?: string | null
          created_at?: string
          device_fingerprint?: string | null
          downloads_disabled?: boolean | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_locked?: boolean | null
          max_devices?: number | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          correct_answer: string
          created_at: string | null
          created_by: string | null
          difficulty: string | null
          explanation: string | null
          id: string
          is_active: boolean | null
          min_tier: string | null
          options: Json | null
          question_text: string
          question_type: string
          topic_id: string | null
          updated_at: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          min_tier?: string | null
          options?: Json | null
          question_text: string
          question_type: string
          topic_id?: string | null
          updated_at?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          min_tier?: string | null
          options?: Json | null
          question_text?: string
          question_type?: string
          topic_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string | null
          id: string
          passed: boolean | null
          quiz_id: string
          score: number | null
          time_taken_seconds: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          answers: Json
          completed_at?: string | null
          created_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id: string
          score?: number | null
          time_taken_seconds?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score?: number | null
          time_taken_seconds?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          min_tier: string | null
          pass_percentage: number | null
          question_ids: string[]
          time_limit_minutes: number | null
          title: string
          topic_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_tier?: string | null
          pass_percentage?: number | null
          question_ids: string[]
          time_limit_minutes?: number | null
          title: string
          topic_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_tier?: string | null
          pass_percentage?: number | null
          question_ids?: string[]
          time_limit_minutes?: number | null
          title?: string
          topic_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_claimed: boolean | null
          referral_count: number | null
          unlocked_at: string | null
          unlocked_tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_claimed?: boolean | null
          referral_count?: number | null
          unlocked_at?: string | null
          unlocked_tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_claimed?: boolean | null
          referral_count?: number | null
          unlocked_at?: string | null
          unlocked_tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      stream_subjects: {
        Row: {
          basket: string | null
          created_at: string
          display_order: number | null
          id: string
          is_mandatory: boolean | null
          sort_order: number | null
          stream: string
          subject_code: string
          subject_name: string
        }
        Insert: {
          basket?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_mandatory?: boolean | null
          sort_order?: number | null
          stream: string
          subject_code: string
          subject_name: string
        }
        Update: {
          basket?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_mandatory?: boolean | null
          sort_order?: number | null
          stream?: string
          subject_code?: string
          subject_name?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number | null
          grade: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          medium: string | null
          name: string
          sort_order: number | null
          stream: string | null
          streams: Json | null
          subject_code: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          grade?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          medium?: string | null
          name: string
          sort_order?: number | null
          stream?: string | null
          streams?: Json | null
          subject_code?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          grade?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          medium?: string | null
          name?: string
          sort_order?: number | null
          stream?: string | null
          streams?: Json | null
          subject_code?: string | null
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          subject_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          subject_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "content_overview"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      upgrade_requests: {
        Row: {
          admin_notes: string | null
          amount: number | null
          created_at: string
          current_tier: string | null
          enrollment_id: string | null
          id: string
          notes: string | null
          receipt_url: string | null
          reference_number: string | null
          requested_tier: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount?: number | null
          created_at?: string
          current_tier?: string | null
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          requested_tier: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number | null
          created_at?: string
          current_tier?: string | null
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          requested_tier?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_requests_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_attributions: {
        Row: {
          created_at: string
          creator_id: string | null
          discount_code_id: string | null
          id: string
          referral_source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_id?: string | null
          discount_code_id?: string | null
          id?: string
          referral_source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string | null
          discount_code_id?: string | null
          id?: string
          referral_source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_attributions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_attributions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_content_stats"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "user_attributions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_attributions_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
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
      user_sessions: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_seen_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_seen_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_seen_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subjects: {
        Row: {
          created_at: string
          enrollment_id: string | null
          id: string
          is_confirmed: boolean | null
          is_locked: boolean | null
          locked_at: string | null
          subject_1: string | null
          subject_2: string | null
          subject_3: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enrollment_id?: string | null
          id?: string
          is_confirmed?: boolean | null
          is_locked?: boolean | null
          locked_at?: string | null
          subject_1?: string | null
          subject_2?: string | null
          subject_3?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string | null
          id?: string
          is_confirmed?: boolean | null
          is_locked?: boolean | null
          locked_at?: string | null
          subject_1?: string | null
          subject_2?: string | null
          subject_3?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subjects_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_methods: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          bank_name: string | null
          branch_name: string | null
          created_at: string
          creator_id: string
          crypto_type: string | null
          id: string
          is_primary: boolean | null
          method_type: string
          network: string | null
          updated_at: string
          wallet_address: string | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string
          creator_id: string
          crypto_type?: string | null
          id?: string
          is_primary?: boolean | null
          method_type: string
          network?: string | null
          updated_at?: string
          wallet_address?: string | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string
          creator_id?: string
          crypto_type?: string | null
          id?: string
          is_primary?: boolean | null
          method_type?: string
          network?: string | null
          updated_at?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_methods_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_methods_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_content_stats"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "withdrawal_methods_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          creator_id: string
          fee_amount: number
          fee_percent: number
          id: string
          net_amount: number
          paid_at: string | null
          receipt_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          withdrawal_method_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          creator_id: string
          fee_amount: number
          fee_percent?: number
          id?: string
          net_amount: number
          paid_at?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          withdrawal_method_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          creator_id?: string
          fee_amount?: number
          fee_percent?: number
          id?: string
          net_amount?: number
          paid_at?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          withdrawal_method_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_content_stats"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_withdrawal_method_id_fkey"
            columns: ["withdrawal_method_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_methods"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cmo_analytics: {
        Row: {
          annual_paid_users: number | null
          created_at: string | null
          creators_count: number | null
          display_name: string | null
          id: string | null
          is_active: boolean | null
          monthly_paid_users: number | null
          pending_commission: number | null
          referral_code: string | null
          total_lifetime_paid_users: number | null
          total_revenue_generated: number | null
          user_id: string | null
        }
        Insert: {
          annual_paid_users?: never
          created_at?: string | null
          creators_count?: never
          display_name?: string | null
          id?: string | null
          is_active?: boolean | null
          monthly_paid_users?: never
          pending_commission?: never
          referral_code?: string | null
          total_lifetime_paid_users?: never
          total_revenue_generated?: never
          user_id?: string | null
        }
        Update: {
          annual_paid_users?: never
          created_at?: string | null
          creators_count?: never
          display_name?: string | null
          id?: string | null
          is_active?: boolean | null
          monthly_paid_users?: never
          pending_commission?: never
          referral_code?: string | null
          total_lifetime_paid_users?: never
          total_revenue_generated?: never
          user_id?: string | null
        }
        Relationships: []
      }
      cmo_performance: {
        Row: {
          cmo_id: string | null
          creators_count: number | null
          display_name: string | null
          is_active: boolean | null
          is_head_ops: boolean | null
          monthly_paid_users: number | null
          referral_code: string | null
          total_paid_users: number | null
          total_revenue_generated: number | null
          user_id: string | null
        }
        Relationships: []
      }
      content_overview: {
        Row: {
          grade: string | null
          is_active: boolean | null
          medium: string | null
          note_count: number | null
          stream: string | null
          subject_id: string | null
          subject_name: string | null
          topic_count: number | null
        }
        Relationships: []
      }
      creator_analytics: {
        Row: {
          available_balance: number | null
          cmo_id: string | null
          cmo_name: string | null
          commission_rate: number | null
          created_at: string | null
          discount_code_count: number | null
          display_name: string | null
          id: string | null
          is_active: boolean | null
          lifetime_paid_users: number | null
          monthly_paid_users: number | null
          referral_code: string | null
          total_commission_earned: number | null
          total_referred_users: number | null
          total_withdrawn: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_profiles_cmo_id_fkey"
            columns: ["cmo_id"]
            isOneToOne: false
            referencedRelation: "cmo_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_profiles_cmo_id_fkey"
            columns: ["cmo_id"]
            isOneToOne: false
            referencedRelation: "cmo_performance"
            referencedColumns: ["cmo_id"]
          },
          {
            foreignKeyName: "creator_profiles_cmo_id_fkey"
            columns: ["cmo_id"]
            isOneToOne: false
            referencedRelation: "cmo_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_content_stats: {
        Row: {
          available_balance: number | null
          cmo_id: string | null
          creator_id: string | null
          display_name: string | null
          is_active: boolean | null
          lifetime_users: number | null
          monthly_users: number | null
          notes_uploaded: number | null
          referral_code: string | null
          total_referrals: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_profiles_cmo_id_fkey"
            columns: ["cmo_id"]
            isOneToOne: false
            referencedRelation: "cmo_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_profiles_cmo_id_fkey"
            columns: ["cmo_id"]
            isOneToOne: false
            referencedRelation: "cmo_performance"
            referencedColumns: ["cmo_id"]
          },
          {
            foreignKeyName: "creator_profiles_cmo_id_fkey"
            columns: ["cmo_id"]
            isOneToOne: false
            referencedRelation: "cmo_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_financial_summary: {
        Row: {
          non_referral_revenue: number | null
          referral_revenue: number | null
          this_month_revenue: number | null
          total_paid_users: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      platform_stats: {
        Row: {
          this_month_revenue: number | null
          total_attributed_users: number | null
          total_cmos: number | null
          total_creator_balances: number | null
          total_creators: number | null
          total_paid_users_all_time: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_admin_dashboard_stats: {
        Args: never
        Returns: {
          active_codes: number
          active_enrollments: number
          bank_payments: number
          card_payments: number
          last_month_revenue: number
          lifetime_count: number
          pending_join_requests: number
          pending_upgrades: number
          pending_withdrawals: number
          standard_count: number
          starter_count: number
          this_month_revenue: number
          total_codes: number
          total_creators: number
          total_revenue: number
          total_students: number
          total_subjects: number
        }[]
      }
      get_cmo_monthly_data: {
        Args: { p_cmo_id: string; p_months?: number }
        Returns: {
          creators: number
          month: string
          paid_users: number
          revenue: number
        }[]
      }
      get_creator_monthly_data: {
        Args: { p_creator_id: string; p_months?: number }
        Returns: {
          conversions: number
          earnings: number
          month: string
          referrals: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_creator_role: {
        Args: {
          _cmo_id?: string
          _display_name?: string
          _referral_code?: string
          _user_id: string
        }
        Returns: Json
      }
      validate_access_code: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      app_role:
        | "admin"
        | "cmo"
        | "creator"
        | "user"
        | "student"
        | "super_admin"
        | "content_admin"
        | "support_admin"
        | "content_creator"
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
      app_role: [
        "admin",
        "cmo",
        "creator",
        "user",
        "student",
        "super_admin",
        "content_admin",
        "support_admin",
        "content_creator",
      ],
    },
  },
} as const
