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
      acknowledgments: {
        Row: {
          acknowledged_at: string | null
          id: string
          ref_a: string | null
          ref_b: string | null
          severity: Database["public"]["Enums"]["severity_enum"] | null
          subject: string
          user_id: string
          warning_text: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          id?: string
          ref_a?: string | null
          ref_b?: string | null
          severity?: Database["public"]["Enums"]["severity_enum"] | null
          subject: string
          user_id: string
          warning_text?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          id?: string
          ref_a?: string | null
          ref_b?: string | null
          severity?: Database["public"]["Enums"]["severity_enum"] | null
          subject?: string
          user_id?: string
          warning_text?: string | null
        }
        Relationships: []
      }
      admins: {
        Row: {
          added_at: string | null
          email: string
        }
        Insert: {
          added_at?: string | null
          email: string
        }
        Update: {
          added_at?: string | null
          email?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          path: string | null
          properties: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          path?: string | null
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          path?: string | null
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_launch_waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          platform: string | null
          user_agent: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          platform?: string | null
          user_agent?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          platform?: string | null
          user_agent?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      barcode_cache: {
        Row: {
          category: string
          code: string
          created_at: string
          payload: Json
          source: string
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          payload: Json
          source: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          payload?: Json
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      barcode_corrections: {
        Row: {
          code: string
          created_at: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Update: {
          code?: string
          created_at?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: []
      }
      barcode_scan_events: {
        Row: {
          api_results: Json
          category: string | null
          code: string
          created_at: string
          id: string
          latency_ms: number | null
          resolved: boolean
          scan_source: string | null
          source: string | null
          symbology: string | null
          user_id: string | null
        }
        Insert: {
          api_results?: Json
          category?: string | null
          code: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          resolved?: boolean
          scan_source?: string | null
          source?: string | null
          symbology?: string | null
          user_id?: string | null
        }
        Update: {
          api_results?: Json
          category?: string | null
          code?: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          resolved?: boolean
          scan_source?: string | null
          source?: string | null
          symbology?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      body_checkins: {
        Row: {
          body_fat_pct: number | null
          checked_at: string
          created_at: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          body_fat_pct?: number | null
          checked_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          body_fat_pct?: number | null
          checked_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      body_metrics: {
        Row: {
          arm_cm: number | null
          bench_kg: number | null
          body_fat_pct: number | null
          chest_cm: number | null
          created_at: string
          deadlift_kg: number | null
          id: string
          measured_at: string
          notes: string | null
          ohp_kg: number | null
          squat_kg: number | null
          thigh_cm: number | null
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          arm_cm?: number | null
          bench_kg?: number | null
          body_fat_pct?: number | null
          chest_cm?: number | null
          created_at?: string
          deadlift_kg?: number | null
          id?: string
          measured_at?: string
          notes?: string | null
          ohp_kg?: number | null
          squat_kg?: number | null
          thigh_cm?: number | null
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          arm_cm?: number | null
          bench_kg?: number | null
          body_fat_pct?: number | null
          chest_cm?: number | null
          created_at?: string
          deadlift_kg?: number | null
          id?: string
          measured_at?: string
          notes?: string | null
          ohp_kg?: number | null
          squat_kg?: number | null
          thigh_cm?: number | null
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          parts: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parts?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parts?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_usage: {
        Row: {
          message_count: number
          period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          message_count?: number
          period: string
          updated_at?: string
          user_id: string
        }
        Update: {
          message_count?: number
          period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      closed_testing_signups: {
        Row: {
          attribution: Json
          converted_at: string | null
          created_at: string | null
          email: string
          feedback_prompt_at: string | null
          id: string
          install_reminder_at: string | null
          installed_at: string | null
          invited_at: string | null
          ip_hash: string | null
          landing_path: string | null
          name: string | null
          notes: string | null
          platform_preference: string | null
          referrer: string | null
          retained_14d_at: string | null
          sequence_opted_out: boolean
          source: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          welcome_email_at: string | null
          wrapup_email_at: string | null
        }
        Insert: {
          attribution?: Json
          converted_at?: string | null
          created_at?: string | null
          email: string
          feedback_prompt_at?: string | null
          id?: string
          install_reminder_at?: string | null
          installed_at?: string | null
          invited_at?: string | null
          ip_hash?: string | null
          landing_path?: string | null
          name?: string | null
          notes?: string | null
          platform_preference?: string | null
          referrer?: string | null
          retained_14d_at?: string | null
          sequence_opted_out?: boolean
          source?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          welcome_email_at?: string | null
          wrapup_email_at?: string | null
        }
        Update: {
          attribution?: Json
          converted_at?: string | null
          created_at?: string | null
          email?: string
          feedback_prompt_at?: string | null
          id?: string
          install_reminder_at?: string | null
          installed_at?: string | null
          invited_at?: string | null
          ip_hash?: string | null
          landing_path?: string | null
          name?: string | null
          notes?: string | null
          platform_preference?: string | null
          referrer?: string | null
          retained_14d_at?: string | null
          sequence_opted_out?: boolean
          source?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          welcome_email_at?: string | null
          wrapup_email_at?: string | null
        }
        Relationships: []
      }
      comp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          issued_to_email: string | null
          months: number
          reason: string
          redeemed_at: string | null
          redeemed_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          issued_to_email?: string | null
          months?: number
          reason?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          issued_to_email?: string | null
          months?: number
          reason?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Relationships: []
      }
      compound_content: {
        Row: {
          benefits_md: string | null
          body_md: string
          compound_id: string
          contraindications_md: string | null
          do_not_mix_md: string | null
          evidence_md: string | null
          faq_md: string | null
          last_reviewed: string | null
          mechanism_md: string | null
          meta_description: string
          meta_title: string
          overview_md: string | null
          pubchem_cid: string | null
          side_effects_md: string | null
          sources_md: string | null
          structure_image_url: string | null
          timing_md: string | null
          updated_at: string
          warnings_md: string | null
        }
        Insert: {
          benefits_md?: string | null
          body_md: string
          compound_id: string
          contraindications_md?: string | null
          do_not_mix_md?: string | null
          evidence_md?: string | null
          faq_md?: string | null
          last_reviewed?: string | null
          mechanism_md?: string | null
          meta_description: string
          meta_title: string
          overview_md?: string | null
          pubchem_cid?: string | null
          side_effects_md?: string | null
          sources_md?: string | null
          structure_image_url?: string | null
          timing_md?: string | null
          updated_at?: string
          warnings_md?: string | null
        }
        Update: {
          benefits_md?: string | null
          body_md?: string
          compound_id?: string
          contraindications_md?: string | null
          do_not_mix_md?: string | null
          evidence_md?: string | null
          faq_md?: string | null
          last_reviewed?: string | null
          mechanism_md?: string | null
          meta_description?: string
          meta_title?: string
          overview_md?: string | null
          pubchem_cid?: string | null
          side_effects_md?: string | null
          sources_md?: string | null
          structure_image_url?: string | null
          timing_md?: string | null
          updated_at?: string
          warnings_md?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compound_content_compound_id_fkey"
            columns: ["compound_id"]
            isOneToOne: true
            referencedRelation: "compounds"
            referencedColumns: ["id"]
          },
        ]
      }
      compound_references: {
        Row: {
          compound_slug: string
          created_at: string
          id: string
          journal: string | null
          pmid: string
          position: number
          title: string
          year: string | null
        }
        Insert: {
          compound_slug: string
          created_at?: string
          id?: string
          journal?: string | null
          pmid: string
          position?: number
          title: string
          year?: string | null
        }
        Update: {
          compound_slug?: string
          created_at?: string
          id?: string
          journal?: string | null
          pmid?: string
          position?: number
          title?: string
          year?: string | null
        }
        Relationships: []
      }
      compounds: {
        Row: {
          aliases: string[] | null
          category: Database["public"]["Enums"]["compound_cat"]
          created_at: string | null
          default_unit: Database["public"]["Enums"]["dose_unit_enum"] | null
          education_md: string | null
          food_rule: Database["public"]["Enums"]["food_rule_enum"] | null
          goal_tags: string[]
          half_life_hours: number | null
          hypo_risk: boolean | null
          id: string
          is_controlled: boolean | null
          is_injectable: boolean | null
          name: string
          rda_high: number | null
          rda_low: number | null
          slug: string
          typical_timing: Database["public"]["Enums"]["timing_enum"] | null
          upper_limit: number | null
        }
        Insert: {
          aliases?: string[] | null
          category: Database["public"]["Enums"]["compound_cat"]
          created_at?: string | null
          default_unit?: Database["public"]["Enums"]["dose_unit_enum"] | null
          education_md?: string | null
          food_rule?: Database["public"]["Enums"]["food_rule_enum"] | null
          goal_tags?: string[]
          half_life_hours?: number | null
          hypo_risk?: boolean | null
          id?: string
          is_controlled?: boolean | null
          is_injectable?: boolean | null
          name: string
          rda_high?: number | null
          rda_low?: number | null
          slug: string
          typical_timing?: Database["public"]["Enums"]["timing_enum"] | null
          upper_limit?: number | null
        }
        Update: {
          aliases?: string[] | null
          category?: Database["public"]["Enums"]["compound_cat"]
          created_at?: string | null
          default_unit?: Database["public"]["Enums"]["dose_unit_enum"] | null
          education_md?: string | null
          food_rule?: Database["public"]["Enums"]["food_rule_enum"] | null
          goal_tags?: string[]
          half_life_hours?: number | null
          hypo_risk?: boolean | null
          id?: string
          is_controlled?: boolean | null
          is_injectable?: boolean | null
          name?: string
          rda_high?: number | null
          rda_low?: number | null
          slug?: string
          typical_timing?: Database["public"]["Enums"]["timing_enum"] | null
          upper_limit?: number | null
        }
        Relationships: []
      }
      cron_run_metrics: {
        Row: {
          budget_note: string | null
          candidates: number
          capped: number
          created_at: string
          db_queries: number
          db_rows_read: number
          duration_ms: number
          email_sent: number
          errors: number
          id: string
          inbox_queued: number
          job: string
          over_budget: boolean
          push_sent: number
          query_breakdown: Json
          skipped: number
          started_at: string
          users_scanned: number
        }
        Insert: {
          budget_note?: string | null
          candidates?: number
          capped?: number
          created_at?: string
          db_queries?: number
          db_rows_read?: number
          duration_ms?: number
          email_sent?: number
          errors?: number
          id?: string
          inbox_queued?: number
          job: string
          over_budget?: boolean
          push_sent?: number
          query_breakdown?: Json
          skipped?: number
          started_at?: string
          users_scanned?: number
        }
        Update: {
          budget_note?: string | null
          candidates?: number
          capped?: number
          created_at?: string
          db_queries?: number
          db_rows_read?: number
          duration_ms?: number
          email_sent?: number
          errors?: number
          id?: string
          inbox_queued?: number
          job?: string
          over_budget?: boolean
          push_sent?: number
          query_breakdown?: Json
          skipped?: number
          started_at?: string
          users_scanned?: number
        }
        Relationships: []
      }
      custom_exercises: {
        Row: {
          category: string | null
          created_at: string
          family: string
          id: string
          name: string
          updated_at: string
          use_count: number
          user_id: string
          workout_type: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          family?: string
          id?: string
          name: string
          updated_at?: string
          use_count?: number
          user_id: string
          workout_type?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          family?: string
          id?: string
          name?: string
          updated_at?: string
          use_count?: number
          user_id?: string
          workout_type?: string | null
        }
        Relationships: []
      }
      food_admin_audit: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          food_id: string | null
          id: string
          label: string | null
          reverted_at: string | null
          reverted_by: string | null
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          food_id?: string | null
          id?: string
          label?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          food_id?: string | null
          id?: string
          label?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          target_id?: string | null
          target_table?: string
        }
        Relationships: []
      }
      food_aliases: {
        Row: {
          alias: string
          alias_norm: string
          created_at: string
          food_id: string
          id: string
        }
        Insert: {
          alias: string
          alias_norm: string
          created_at?: string
          food_id: string
          id?: string
        }
        Update: {
          alias?: string
          alias_norm?: string
          created_at?: string
          food_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_aliases_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      food_portions: {
        Row: {
          created_at: string
          food_id: string
          grams: number
          id: string
          is_default: boolean
          label: string
          reference_hint: string | null
          sort_order: number
          source: string
        }
        Insert: {
          created_at?: string
          food_id: string
          grams: number
          id?: string
          is_default?: boolean
          label: string
          reference_hint?: string | null
          sort_order?: number
          source?: string
        }
        Update: {
          created_at?: string
          food_id?: string
          grams?: number
          id?: string
          is_default?: boolean
          label?: string
          reference_hint?: string | null
          sort_order?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_portions_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          brand: string | null
          cache_key: string | null
          carbs_100g: number
          created_at: string
          default_portion_g: number
          external_id: string | null
          fat_100g: number
          fiber_100g: number | null
          gtin: string | null
          id: string
          kcal_100g: number
          name: string
          name_norm: string
          protein_100g: number
          quality_score: number
          satfat_100g: number | null
          sodium_100mg: number | null
          source: string
          sugar_100g: number | null
          times_logged: number
          updated_at: string
          verified: boolean
        }
        Insert: {
          brand?: string | null
          cache_key?: string | null
          carbs_100g?: number
          created_at?: string
          default_portion_g?: number
          external_id?: string | null
          fat_100g?: number
          fiber_100g?: number | null
          gtin?: string | null
          id?: string
          kcal_100g?: number
          name: string
          name_norm: string
          protein_100g?: number
          quality_score?: number
          satfat_100g?: number | null
          sodium_100mg?: number | null
          source?: string
          sugar_100g?: number | null
          times_logged?: number
          updated_at?: string
          verified?: boolean
        }
        Update: {
          brand?: string | null
          cache_key?: string | null
          carbs_100g?: number
          created_at?: string
          default_portion_g?: number
          external_id?: string | null
          fat_100g?: number
          fiber_100g?: number | null
          gtin?: string | null
          id?: string
          kcal_100g?: number
          name?: string
          name_norm?: string
          protein_100g?: number
          quality_score?: number
          satfat_100g?: number | null
          sodium_100mg?: number | null
          source?: string
          sugar_100g?: number | null
          times_logged?: number
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      goal_content: {
        Row: {
          intro_md: string
          meta_description: string
          meta_title: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          intro_md: string
          meta_description: string
          meta_title: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          intro_md?: string
          meta_description?: string
          meta_title?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      grocery_list_overrides: {
        Row: {
          checked: boolean
          created_at: string
          hidden: boolean
          id: string
          is_custom: boolean
          name: string
          quantity: string | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          checked?: boolean
          created_at?: string
          hidden?: boolean
          id?: string
          is_custom?: boolean
          name: string
          quantity?: string | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          checked?: boolean
          created_at?: string
          hidden?: boolean
          id?: string
          is_custom?: boolean
          name?: string
          quantity?: string | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      gsc_crawl_inspections: {
        Row: {
          api_error: string | null
          checked_at: string
          coverage_state: string | null
          created_at: string
          id: string
          indexing_state: string | null
          is_blocked: boolean
          last_crawl_time: string | null
          page_fetch_state: string | null
          robots_txt_state: string | null
          site_url: string
          updated_at: string
          url: string
          verdict: string | null
        }
        Insert: {
          api_error?: string | null
          checked_at?: string
          coverage_state?: string | null
          created_at?: string
          id?: string
          indexing_state?: string | null
          is_blocked?: boolean
          last_crawl_time?: string | null
          page_fetch_state?: string | null
          robots_txt_state?: string | null
          site_url: string
          updated_at?: string
          url: string
          verdict?: string | null
        }
        Update: {
          api_error?: string | null
          checked_at?: string
          coverage_state?: string | null
          created_at?: string
          id?: string
          indexing_state?: string | null
          is_blocked?: boolean
          last_crawl_time?: string | null
          page_fetch_state?: string | null
          robots_txt_state?: string | null
          site_url?: string
          updated_at?: string
          url?: string
          verdict?: string | null
        }
        Relationships: []
      }
      gsc_daily_snapshots: {
        Row: {
          api_error: string | null
          api_ok: boolean
          avg_position: number | null
          clicks: number | null
          coverage_breakdown: Json
          crawl_error_urls: number
          created_at: string
          ctr: number | null
          excluded_urls: number
          id: string
          impressions: number | null
          indexed_urls: number
          inspected_urls: number
          issues: Json
          not_indexed_urls: number
          performance_range_end: string | null
          performance_range_start: string | null
          rich_result_fail_urls: number
          robots_blocked_urls: number
          site_url: string
          sitemap_errors: number | null
          sitemap_fetch_ok: boolean | null
          sitemap_indexed_urls: number | null
          sitemap_is_pending: boolean | null
          sitemap_last_downloaded: string | null
          sitemap_last_submitted: string | null
          sitemap_path: string | null
          sitemap_submitted_urls: number | null
          sitemap_url_count: number | null
          sitemap_warnings: number | null
          snapshot_date: string
          updated_at: string
        }
        Insert: {
          api_error?: string | null
          api_ok?: boolean
          avg_position?: number | null
          clicks?: number | null
          coverage_breakdown?: Json
          crawl_error_urls?: number
          created_at?: string
          ctr?: number | null
          excluded_urls?: number
          id?: string
          impressions?: number | null
          indexed_urls?: number
          inspected_urls?: number
          issues?: Json
          not_indexed_urls?: number
          performance_range_end?: string | null
          performance_range_start?: string | null
          rich_result_fail_urls?: number
          robots_blocked_urls?: number
          site_url: string
          sitemap_errors?: number | null
          sitemap_fetch_ok?: boolean | null
          sitemap_indexed_urls?: number | null
          sitemap_is_pending?: boolean | null
          sitemap_last_downloaded?: string | null
          sitemap_last_submitted?: string | null
          sitemap_path?: string | null
          sitemap_submitted_urls?: number | null
          sitemap_url_count?: number | null
          sitemap_warnings?: number | null
          snapshot_date: string
          updated_at?: string
        }
        Update: {
          api_error?: string | null
          api_ok?: boolean
          avg_position?: number | null
          clicks?: number | null
          coverage_breakdown?: Json
          crawl_error_urls?: number
          created_at?: string
          ctr?: number | null
          excluded_urls?: number
          id?: string
          impressions?: number | null
          indexed_urls?: number
          inspected_urls?: number
          issues?: Json
          not_indexed_urls?: number
          performance_range_end?: string | null
          performance_range_start?: string | null
          rich_result_fail_urls?: number
          robots_blocked_urls?: number
          site_url?: string
          sitemap_errors?: number | null
          sitemap_fetch_ok?: boolean | null
          sitemap_indexed_urls?: number | null
          sitemap_is_pending?: boolean | null
          sitemap_last_downloaded?: string | null
          sitemap_last_submitted?: string | null
          sitemap_path?: string | null
          sitemap_submitted_urls?: number | null
          sitemap_url_count?: number | null
          sitemap_warnings?: number | null
          snapshot_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      index_submissions: {
        Row: {
          created_at: string
          details: Json
          duration_ms: number | null
          id: string
          indexnow_error: string | null
          indexnow_ok: boolean
          indexnow_submitted: number
          site_url: string
          sitemap_is_pending: boolean | null
          sitemap_last_downloaded: string | null
          sitemap_submit_error: string | null
          sitemap_submit_ok: boolean
          sitemap_url: string
          sitemap_url_count: number | null
          source: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          duration_ms?: number | null
          id?: string
          indexnow_error?: string | null
          indexnow_ok?: boolean
          indexnow_submitted?: number
          site_url: string
          sitemap_is_pending?: boolean | null
          sitemap_last_downloaded?: string | null
          sitemap_submit_error?: string | null
          sitemap_submit_ok?: boolean
          sitemap_url: string
          sitemap_url_count?: number | null
          source?: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          duration_ms?: number | null
          id?: string
          indexnow_error?: string | null
          indexnow_ok?: boolean
          indexnow_submitted?: number
          site_url?: string
          sitemap_is_pending?: boolean | null
          sitemap_last_downloaded?: string | null
          sitemap_submit_error?: string | null
          sitemap_submit_ok?: boolean
          sitemap_url?: string
          sitemap_url_count?: number | null
          source?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      injection_sites: {
        Row: {
          id: string
          site: string
          used_at: string | null
          user_compound_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          site: string
          used_at?: string | null
          user_compound_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          site?: string
          used_at?: string | null
          user_compound_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "injection_sites_user_compound_id_fkey"
            columns: ["user_compound_id"]
            isOneToOne: false
            referencedRelation: "user_compounds"
            referencedColumns: ["id"]
          },
        ]
      }
      interaction_rules: {
        Row: {
          category_a: Database["public"]["Enums"]["compound_cat"] | null
          category_b: Database["public"]["Enums"]["compound_cat"] | null
          compound_a_id: string | null
          compound_b_id: string | null
          confidence: Database["public"]["Enums"]["interaction_confidence"]
          created_at: string | null
          id: string
          mechanism: string
          mechanism_shared_with: string | null
          no_known_interaction: boolean
          recommendation: string
          same_axis: boolean | null
          separation_hours: number | null
          severity: Database["public"]["Enums"]["severity_enum"]
          source_refs: string[] | null
        }
        Insert: {
          category_a?: Database["public"]["Enums"]["compound_cat"] | null
          category_b?: Database["public"]["Enums"]["compound_cat"] | null
          compound_a_id?: string | null
          compound_b_id?: string | null
          confidence?: Database["public"]["Enums"]["interaction_confidence"]
          created_at?: string | null
          id?: string
          mechanism: string
          mechanism_shared_with?: string | null
          no_known_interaction?: boolean
          recommendation: string
          same_axis?: boolean | null
          separation_hours?: number | null
          severity: Database["public"]["Enums"]["severity_enum"]
          source_refs?: string[] | null
        }
        Update: {
          category_a?: Database["public"]["Enums"]["compound_cat"] | null
          category_b?: Database["public"]["Enums"]["compound_cat"] | null
          compound_a_id?: string | null
          compound_b_id?: string | null
          confidence?: Database["public"]["Enums"]["interaction_confidence"]
          created_at?: string | null
          id?: string
          mechanism?: string
          mechanism_shared_with?: string | null
          no_known_interaction?: boolean
          recommendation?: string
          same_axis?: boolean | null
          separation_hours?: number | null
          severity?: Database["public"]["Enums"]["severity_enum"]
          source_refs?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "interaction_rules_compound_a_id_fkey"
            columns: ["compound_a_id"]
            isOneToOne: false
            referencedRelation: "compounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_rules_compound_b_id_fkey"
            columns: ["compound_b_id"]
            isOneToOne: false
            referencedRelation: "compounds"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_markers: {
        Row: {
          category: string
          description: string | null
          id: string
          name: string
          ref_high: number | null
          ref_high_female: number | null
          ref_high_male: number | null
          ref_low: number | null
          ref_low_female: number | null
          ref_low_male: number | null
          slug: string
          sort_order: number
          unit: string
        }
        Insert: {
          category: string
          description?: string | null
          id?: string
          name: string
          ref_high?: number | null
          ref_high_female?: number | null
          ref_high_male?: number | null
          ref_low?: number | null
          ref_low_female?: number | null
          ref_low_male?: number | null
          slug: string
          sort_order?: number
          unit: string
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          name?: string
          ref_high?: number | null
          ref_high_female?: number | null
          ref_high_male?: number | null
          ref_low?: number | null
          ref_low_female?: number | null
          ref_low_male?: number | null
          slug?: string
          sort_order?: number
          unit?: string
        }
        Relationships: []
      }
      lab_panels: {
        Row: {
          created_at: string
          drawn_on: string
          id: string
          lab_name: string | null
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drawn_on: string
          id?: string
          lab_name?: string | null
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drawn_on?: string
          id?: string
          lab_name?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lab_results: {
        Row: {
          created_at: string
          id: string
          marker_slug: string
          panel_id: string
          ref_high: number | null
          ref_low: number | null
          unit: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          marker_slug: string
          panel_id: string
          ref_high?: number | null
          ref_low?: number | null
          unit?: string | null
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          marker_slug?: string
          panel_id?: string
          ref_high?: number | null
          ref_low?: number | null
          unit?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_marker_slug_fkey"
            columns: ["marker_slug"]
            isOneToOne: false
            referencedRelation: "lab_markers"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "lab_results_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "lab_panels"
            referencedColumns: ["id"]
          },
        ]
      }
      label_reports: {
        Row: {
          barcode: string | null
          brand: string | null
          confidence_score: number | null
          created_at: string
          id: string
          note: string | null
          product_name: string | null
          reason: string
          scan_history_id: string | null
          source_name: string | null
          source_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          note?: string | null
          product_name?: string | null
          reason: string
          scan_history_id?: string | null
          source_name?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          note?: string | null
          product_name?: string | null
          reason?: string
          scan_history_id?: string | null
          source_name?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_reports_scan_history_id_fkey"
            columns: ["scan_history_id"]
            isOneToOne: false
            referencedRelation: "scan_history"
            referencedColumns: ["id"]
          },
        ]
      }
      logging_reminder_settings: {
        Row: {
          breakfast_by: string
          created_at: string
          dinner_by: string
          doses_enabled: boolean
          lunch_by: string
          meals_enabled: boolean
          quiet_after: string
          snoozed_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          breakfast_by?: string
          created_at?: string
          dinner_by?: string
          doses_enabled?: boolean
          lunch_by?: string
          meals_enabled?: boolean
          quiet_after?: string
          snoozed_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          breakfast_by?: string
          created_at?: string
          dinner_by?: string
          doses_enabled?: boolean
          lunch_by?: string
          meals_enabled?: boolean
          quiet_after?: string
          snoozed_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      manual_bookmarks: {
        Row: {
          created_at: string
          id: string
          removed: boolean
          section_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          removed?: boolean
          section_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          removed?: boolean
          section_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      manual_feedback: {
        Row: {
          chapter_id: string
          chapter_title: string
          created_at: string
          id: string
          kind: string
          message: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          chapter_title: string
          created_at?: string
          id?: string
          kind?: string
          message: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          chapter_title?: string
          created_at?: string
          id?: string
          kind?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_photo_events: {
        Row: {
          action: string
          created_at: string
          id: string
          item_count: number
          note: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          item_count?: number
          note?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          item_count?: number
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meal_plan_slots: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          id: string
          items: Json
          label: string
          logged_meal_id: string | null
          meal_slot: string
          planned_on: string
          protein_g: number | null
          source_meal_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          id?: string
          items?: Json
          label: string
          logged_meal_id?: string | null
          meal_slot?: string
          planned_on: string
          protein_g?: number | null
          source_meal_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          id?: string
          items?: Json
          label?: string
          logged_meal_id?: string | null
          meal_slot?: string
          planned_on?: string
          protein_g?: number | null
          source_meal_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_scan_corrections: {
        Row: {
          ai_calories: number
          ai_carbs_g: number
          ai_fat_g: number
          ai_grams: number | null
          ai_portion: string | null
          ai_protein_g: number
          calorie_drift_pct: number
          created_at: string
          food_id: string | null
          id: string
          item_name: string
          item_name_norm: string
          meal_id: string | null
          read_from: string | null
          resolved_source: string | null
          scan_id: string | null
          user_calories: number
          user_carbs_g: number
          user_fat_g: number
          user_grams: number | null
          user_id: string
          user_portion: string | null
          user_protein_g: number
        }
        Insert: {
          ai_calories?: number
          ai_carbs_g?: number
          ai_fat_g?: number
          ai_grams?: number | null
          ai_portion?: string | null
          ai_protein_g?: number
          calorie_drift_pct?: number
          created_at?: string
          food_id?: string | null
          id?: string
          item_name: string
          item_name_norm: string
          meal_id?: string | null
          read_from?: string | null
          resolved_source?: string | null
          scan_id?: string | null
          user_calories?: number
          user_carbs_g?: number
          user_fat_g?: number
          user_grams?: number | null
          user_id: string
          user_portion?: string | null
          user_protein_g?: number
        }
        Update: {
          ai_calories?: number
          ai_carbs_g?: number
          ai_fat_g?: number
          ai_grams?: number | null
          ai_portion?: string | null
          ai_protein_g?: number
          calorie_drift_pct?: number
          created_at?: string
          food_id?: string | null
          id?: string
          item_name?: string
          item_name_norm?: string
          meal_id?: string | null
          read_from?: string | null
          resolved_source?: string | null
          scan_id?: string | null
          user_calories?: number
          user_carbs_g?: number
          user_fat_g?: number
          user_grams?: number | null
          user_id?: string
          user_portion?: string | null
          user_protein_g?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_scan_corrections_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_times: {
        Row: {
          active: boolean
          alerts_on: boolean
          created_at: string
          days_of_week: number[]
          id: string
          label: string
          planned_time: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          alerts_on?: boolean
          created_at?: string
          days_of_week?: number[]
          id?: string
          label: string
          planned_time: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          alerts_on?: boolean
          created_at?: string
          days_of_week?: number[]
          id?: string
          label?: string
          planned_time?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_timing_presets: {
        Row: {
          auto_mode: string
          auto_weekdays: number[]
          created_at: string
          empty_stomach_gap_min: number
          first_meal_protein_g: number
          id: string
          late_meal_hour: number
          max_meals_per_day: number
          name: string
          suggestions_enabled: boolean
          updated_at: string
          user_id: string
          with_food_window_min: number
          workout_window_min: number
        }
        Insert: {
          auto_mode?: string
          auto_weekdays?: number[]
          created_at?: string
          empty_stomach_gap_min?: number
          first_meal_protein_g?: number
          id?: string
          late_meal_hour?: number
          max_meals_per_day?: number
          name: string
          suggestions_enabled?: boolean
          updated_at?: string
          user_id: string
          with_food_window_min?: number
          workout_window_min?: number
        }
        Update: {
          auto_mode?: string
          auto_weekdays?: number[]
          created_at?: string
          empty_stomach_gap_min?: number
          first_meal_protein_g?: number
          id?: string
          late_meal_hour?: number
          max_meals_per_day?: number
          name?: string
          suggestions_enabled?: boolean
          updated_at?: string
          user_id?: string
          with_food_window_min?: number
          workout_window_min?: number
        }
        Relationships: []
      }
      meal_timing_rules: {
        Row: {
          created_at: string
          empty_stomach_gap_min: number
          first_meal_protein_g: number
          late_meal_hour: number
          max_meals_per_day: number
          suggestions_enabled: boolean
          updated_at: string
          user_id: string
          with_food_window_min: number
          workout_window_min: number
        }
        Insert: {
          created_at?: string
          empty_stomach_gap_min?: number
          first_meal_protein_g?: number
          late_meal_hour?: number
          max_meals_per_day?: number
          suggestions_enabled?: boolean
          updated_at?: string
          user_id: string
          with_food_window_min?: number
          workout_window_min?: number
        }
        Update: {
          created_at?: string
          empty_stomach_gap_min?: number
          first_meal_protein_g?: number
          late_meal_hour?: number
          max_meals_per_day?: number
          suggestions_enabled?: boolean
          updated_at?: string
          user_id?: string
          with_food_window_min?: number
          workout_window_min?: number
        }
        Relationships: []
      }
      meals: {
        Row: {
          adj_calories: number | null
          adj_carbs_g: number | null
          adj_fat_g: number | null
          adj_protein_g: number | null
          ai_confidence: string | null
          ai_items: Json
          barcode: string | null
          est_calories: number | null
          est_carbs_g: number | null
          est_fat_g: number | null
          est_protein_g: number | null
          fiber_g: number | null
          health_score: number | null
          id: string
          label: string | null
          logged_at: string | null
          meal_slot: string
          meal_type: string | null
          name: string | null
          notes: string | null
          photo_url: string | null
          source: string
          storage_path: string | null
          user_id: string
          was_adjusted: boolean | null
        }
        Insert: {
          adj_calories?: number | null
          adj_carbs_g?: number | null
          adj_fat_g?: number | null
          adj_protein_g?: number | null
          ai_confidence?: string | null
          ai_items?: Json
          barcode?: string | null
          est_calories?: number | null
          est_carbs_g?: number | null
          est_fat_g?: number | null
          est_protein_g?: number | null
          fiber_g?: number | null
          health_score?: number | null
          id?: string
          label?: string | null
          logged_at?: string | null
          meal_slot?: string
          meal_type?: string | null
          name?: string | null
          notes?: string | null
          photo_url?: string | null
          source?: string
          storage_path?: string | null
          user_id: string
          was_adjusted?: boolean | null
        }
        Update: {
          adj_calories?: number | null
          adj_carbs_g?: number | null
          adj_fat_g?: number | null
          adj_protein_g?: number | null
          ai_confidence?: string | null
          ai_items?: Json
          barcode?: string | null
          est_calories?: number | null
          est_carbs_g?: number | null
          est_fat_g?: number | null
          est_protein_g?: number | null
          fiber_g?: number | null
          health_score?: number | null
          id?: string
          label?: string | null
          logged_at?: string | null
          meal_slot?: string
          meal_type?: string | null
          name?: string | null
          notes?: string | null
          photo_url?: string | null
          source?: string
          storage_path?: string | null
          user_id?: string
          was_adjusted?: boolean | null
        }
        Relationships: []
      }
      not_found_log: {
        Row: {
          id: string
          ip_hash: string | null
          occurred_at: string
          path: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          path: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          path?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          channel: Database["public"]["Enums"]["channel_enum"]
          day_key: string | null
          id: string
          schedule_event_id: string | null
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["channel_enum"]
          day_key?: string | null
          id?: string
          schedule_event_id?: string | null
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["channel_enum"]
          day_key?: string | null
          id?: string
          schedule_event_id?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_schedule_event_id_fkey"
            columns: ["schedule_event_id"]
            isOneToOne: false
            referencedRelation: "schedule_events"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
          updated_at: string
          url: string | null
          user_id: string
          workout_log_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
          workout_log_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
          workout_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_events: {
        Row: {
          created_at: string
          details: Json | null
          elapsed_ms: number | null
          error_message: string | null
          event: string
          id: string
          landing_path: string | null
          ok: boolean | null
          path: string | null
          step: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          elapsed_ms?: number | null
          error_message?: string | null
          event: string
          id?: string
          landing_path?: string | null
          ok?: boolean | null
          path?: string | null
          step?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          elapsed_ms?: number | null
          error_message?: string | null
          event?: string
          id?: string
          landing_path?: string | null
          ok?: boolean | null
          path?: string | null
          step?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      outrank_articles: {
        Row: {
          answer: string | null
          body: string
          body_format: string | null
          created_at: string | null
          faqs: Json | null
          featured_image_url: string | null
          id: string
          lang: string | null
          meta_description: string | null
          meta_title: string | null
          modified_at: string | null
          published_at: string | null
          raw_payload: Json | null
          slug: string
          status: string | null
          target_keyword: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          answer?: string | null
          body: string
          body_format?: string | null
          created_at?: string | null
          faqs?: Json | null
          featured_image_url?: string | null
          id?: string
          lang?: string | null
          meta_description?: string | null
          meta_title?: string | null
          modified_at?: string | null
          published_at?: string | null
          raw_payload?: Json | null
          slug: string
          status?: string | null
          target_keyword?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          answer?: string | null
          body?: string
          body_format?: string | null
          created_at?: string | null
          faqs?: Json | null
          featured_image_url?: string | null
          id?: string
          lang?: string | null
          meta_description?: string | null
          meta_title?: string | null
          modified_at?: string | null
          published_at?: string | null
          raw_payload?: Json | null
          slug?: string
          status?: string | null
          target_keyword?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_go_live_waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          notified_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notified_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notified_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plan_schedule_snapshots: {
        Row: {
          created_at: string
          goal: string | null
          id: string
          kind: string
          snapshot_json: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal?: string | null
          id?: string
          kind: string
          snapshot_json?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal?: string | null
          id?: string
          kind?: string
          snapshot_json?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          generated_at: string | null
          goal: string
          id: string
          plan_json: Json | null
          user_id: string
          warnings_json: Json | null
        }
        Insert: {
          generated_at?: string | null
          goal: string
          id?: string
          plan_json?: Json | null
          user_id: string
          warnings_json?: Json | null
        }
        Update: {
          generated_at?: string | null
          goal?: string
          id?: string
          plan_json?: Json | null
          user_id?: string
          warnings_json?: Json | null
        }
        Relationships: []
      }
      product_labels: {
        Row: {
          barcode: string
          fetched_at: string
          payload: Json
          source: string
        }
        Insert: {
          barcode: string
          fetched_at?: string
          payload: Json
          source: string
        }
        Update: {
          barcode?: string
          fetched_at?: string
          payload?: Json
          source?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          audience_tier: Database["public"]["Enums"]["audience_tier"] | null
          avatar_url: string | null
          coach_enabled: boolean | null
          coach_tone: string | null
          color_scheme: string
          comp_access_until: string | null
          consented_at: string | null
          created_at: string | null
          daily_alert_limit: number
          display_name: string | null
          dob: string | null
          goals: string[] | null
          grandfathered: boolean
          has_used_trial: boolean
          height_cm: number | null
          id: string
          is_adult: boolean | null
          meal_photo_retention_days: number
          notify_email: boolean | null
          notify_push: boolean | null
          notify_sms: boolean | null
          pause_end: string | null
          pause_reason: string | null
          pause_start: string | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sex: Database["public"]["Enums"]["sex_enum"] | null
          target_calories: number | null
          target_carbs_g: number | null
          target_fat_g: number | null
          target_protein_g: number | null
          theme: string
          timezone: string | null
          unit_pref: Database["public"]["Enums"]["unit_pref"] | null
          weight_kg: number | null
        }
        Insert: {
          audience_tier?: Database["public"]["Enums"]["audience_tier"] | null
          avatar_url?: string | null
          coach_enabled?: boolean | null
          coach_tone?: string | null
          color_scheme?: string
          comp_access_until?: string | null
          consented_at?: string | null
          created_at?: string | null
          daily_alert_limit?: number
          display_name?: string | null
          dob?: string | null
          goals?: string[] | null
          grandfathered?: boolean
          has_used_trial?: boolean
          height_cm?: number | null
          id: string
          is_adult?: boolean | null
          meal_photo_retention_days?: number
          notify_email?: boolean | null
          notify_push?: boolean | null
          notify_sms?: boolean | null
          pause_end?: string | null
          pause_reason?: string | null
          pause_start?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sex?: Database["public"]["Enums"]["sex_enum"] | null
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          theme?: string
          timezone?: string | null
          unit_pref?: Database["public"]["Enums"]["unit_pref"] | null
          weight_kg?: number | null
        }
        Update: {
          audience_tier?: Database["public"]["Enums"]["audience_tier"] | null
          avatar_url?: string | null
          coach_enabled?: boolean | null
          coach_tone?: string | null
          color_scheme?: string
          comp_access_until?: string | null
          consented_at?: string | null
          created_at?: string | null
          daily_alert_limit?: number
          display_name?: string | null
          dob?: string | null
          goals?: string[] | null
          grandfathered?: boolean
          has_used_trial?: boolean
          height_cm?: number | null
          id?: string
          is_adult?: boolean | null
          meal_photo_retention_days?: number
          notify_email?: boolean | null
          notify_push?: boolean | null
          notify_sms?: boolean | null
          pause_end?: string | null
          pause_reason?: string | null
          pause_start?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sex?: Database["public"]["Enums"]["sex_enum"] | null
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          theme?: string
          timezone?: string | null
          unit_pref?: Database["public"]["Enums"]["unit_pref"] | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          category: string
          created_at: string
          id: string
          notes: string | null
          storage_path: string
          taken_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          storage_path: string
          taken_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          storage_path?: string
          taken_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      redirect_verifications: {
        Row: {
          checked_at: string
          created_at: string
          expected_url: string
          fetch_error: string | null
          from_robots_allowed: boolean | null
          from_url: string
          id: string
          is_failing: boolean
          issues: Json
          location: string | null
          reason: string | null
          status: number | null
          target_redirects: boolean
          target_status: number | null
          to_robots_allowed: boolean | null
          updated_at: string
        }
        Insert: {
          checked_at?: string
          created_at?: string
          expected_url: string
          fetch_error?: string | null
          from_robots_allowed?: boolean | null
          from_url: string
          id?: string
          is_failing?: boolean
          issues?: Json
          location?: string | null
          reason?: string | null
          status?: number | null
          target_redirects?: boolean
          target_status?: number | null
          to_robots_allowed?: boolean | null
          updated_at?: string
        }
        Update: {
          checked_at?: string
          created_at?: string
          expected_url?: string
          fetch_error?: string | null
          from_robots_allowed?: boolean | null
          from_url?: string
          id?: string
          is_failing?: boolean
          issues?: Json
          location?: string | null
          reason?: string | null
          status?: number | null
          target_redirects?: boolean
          target_status?: number | null
          to_robots_allowed?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          channel: Database["public"]["Enums"]["channel_enum"]
          created_at: string | null
          enabled: boolean | null
          id: string
          lead_time_minutes: number | null
          user_compound_id: string | null
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["channel_enum"]
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          lead_time_minutes?: number | null
          user_compound_id?: string | null
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["channel_enum"]
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          lead_time_minutes?: number | null
          user_compound_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_user_compound_id_fkey"
            columns: ["user_compound_id"]
            isOneToOne: false
            referencedRelation: "user_compounds"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_notification_log: {
        Row: {
          channel: string
          created_at: string
          day_key: string
          id: string
          routine_id: string
          routine_kind: string
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          day_key: string
          id?: string
          routine_id: string
          routine_kind: string
          status?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          day_key?: string
          id?: string
          routine_id?: string
          routine_kind?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_shares: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          owner_user_id: string
          public_id: string
          routine_id: string
          save_count: number
          show_owner_name: boolean
          view_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          owner_user_id: string
          public_id: string
          routine_id: string
          save_count?: number
          show_owner_name?: boolean
          view_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          owner_user_id?: string
          public_id?: string
          routine_id?: string
          save_count?: number
          show_owner_name?: boolean
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "routine_shares_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_history: {
        Row: {
          applied: boolean
          barcode: string | null
          brand: string | null
          confidence_level: string | null
          confidence_score: number | null
          created_at: string
          directions: string | null
          id: string
          product_name: string | null
          source_name: string | null
          source_url: string | null
          summary: string | null
          updated_at: string
          user_compound_id: string | null
          user_id: string
        }
        Insert: {
          applied?: boolean
          barcode?: string | null
          brand?: string | null
          confidence_level?: string | null
          confidence_score?: number | null
          created_at?: string
          directions?: string | null
          id?: string
          product_name?: string | null
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          updated_at?: string
          user_compound_id?: string | null
          user_id: string
        }
        Update: {
          applied?: boolean
          barcode?: string | null
          brand?: string | null
          confidence_level?: string | null
          confidence_score?: number | null
          created_at?: string
          directions?: string | null
          id?: string
          product_name?: string | null
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          updated_at?: string
          user_compound_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_history_user_compound_id_fkey"
            columns: ["user_compound_id"]
            isOneToOne: false
            referencedRelation: "user_compounds"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_events: {
        Row: {
          created_at: string | null
          dose_amount: number | null
          dose_unit: Database["public"]["Enums"]["dose_unit_enum"] | null
          id: string
          note: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["event_status"] | null
          taken_at: string | null
          user_compound_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dose_amount?: number | null
          dose_unit?: Database["public"]["Enums"]["dose_unit_enum"] | null
          id?: string
          note?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["event_status"] | null
          taken_at?: string | null
          user_compound_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dose_amount?: number | null
          dose_unit?: Database["public"]["Enums"]["dose_unit_enum"] | null
          id?: string
          note?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["event_status"] | null
          taken_at?: string | null
          user_compound_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_user_compound_id_fkey"
            columns: ["user_compound_id"]
            isOneToOne: false
            referencedRelation: "user_compounds"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_page_snapshots: {
        Row: {
          coverage_state: string | null
          created_at: string
          has_description_suffix: boolean | null
          id: string
          indexing_verdict: string | null
          last_checked_at: string
          meta_description: string | null
          rich_result_types: string[]
          updated_at: string
          url: string
        }
        Insert: {
          coverage_state?: string | null
          created_at?: string
          has_description_suffix?: boolean | null
          id?: string
          indexing_verdict?: string | null
          last_checked_at?: string
          meta_description?: string | null
          rich_result_types?: string[]
          updated_at?: string
          url: string
        }
        Update: {
          coverage_state?: string | null
          created_at?: string
          has_description_suffix?: boolean | null
          id?: string
          indexing_verdict?: string | null
          last_checked_at?: string
          meta_description?: string | null
          rich_result_types?: string[]
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      shared_protocols: {
        Row: {
          created_at: string
          owner_id: string
          snapshot: Json
          title: string
          token: string
          view_count: number
        }
        Insert: {
          created_at?: string
          owner_id: string
          snapshot: Json
          title?: string
          token: string
          view_count?: number
        }
        Update: {
          created_at?: string
          owner_id?: string
          snapshot?: Json
          title?: string
          token?: string
          view_count?: number
        }
        Relationships: []
      }
      side_effects: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          occurred_at: string
          resolved: boolean
          severity: number
          symptom: string
          updated_at: string
          user_compound_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          resolved?: boolean
          severity: number
          symptom: string
          updated_at?: string
          user_compound_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          resolved?: boolean
          severity?: number
          symptom?: string
          updated_at?: string
          user_compound_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "side_effects_user_compound_id_fkey"
            columns: ["user_compound_id"]
            isOneToOne: false
            referencedRelation: "user_compounds"
            referencedColumns: ["id"]
          },
        ]
      }
      sitemap_snapshots: {
        Row: {
          article_count: number
          changed: boolean
          created_at: string
          fingerprint: string
          id: string
          image_count: number
          regressions: Json
          resubmit_ok: boolean | null
          resubmitted: boolean
          url_count: number
          xml: string | null
        }
        Insert: {
          article_count?: number
          changed?: boolean
          created_at?: string
          fingerprint: string
          id?: string
          image_count?: number
          regressions?: Json
          resubmit_ok?: boolean | null
          resubmitted?: boolean
          url_count: number
          xml?: string | null
        }
        Update: {
          article_count?: number
          changed?: boolean
          created_at?: string
          fingerprint?: string
          id?: string
          image_count?: number
          regressions?: Json
          resubmit_ok?: boolean | null
          resubmitted?: boolean
          url_count?: number
          xml?: string | null
        }
        Relationships: []
      }
      standing_skip_rules: {
        Row: {
          created_at: string
          days_of_week: number[]
          enabled: boolean
          id: string
          note: string | null
          updated_at: string
          user_compound_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[]
          enabled?: boolean
          id?: string
          note?: string | null
          updated_at?: string
          user_compound_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          enabled?: boolean
          id?: string
          note?: string | null
          updated_at?: string
          user_compound_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standing_skip_rules_user_compound_id_fkey"
            columns: ["user_compound_id"]
            isOneToOne: false
            referencedRelation: "user_compounds"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          entitlement: string | null
          environment: string | null
          id: string
          price_id: string | null
          product_id: string | null
          provider: string | null
          revenuecat_app_user_id: string | null
          status: string | null
          store_product_id: string | null
          store_transaction_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["sub_tier"] | null
          trial_ending_email_at: string | null
          trial_final_email_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          entitlement?: string | null
          environment?: string | null
          id?: string
          price_id?: string | null
          product_id?: string | null
          provider?: string | null
          revenuecat_app_user_id?: string | null
          status?: string | null
          store_product_id?: string | null
          store_transaction_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["sub_tier"] | null
          trial_ending_email_at?: string | null
          trial_final_email_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          entitlement?: string | null
          environment?: string | null
          id?: string
          price_id?: string | null
          product_id?: string | null
          provider?: string | null
          revenuecat_app_user_id?: string | null
          status?: string | null
          store_product_id?: string | null
          store_transaction_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["sub_tier"] | null
          trial_ending_email_at?: string | null
          trial_final_email_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_compounds: {
        Row: {
          active: boolean | null
          compound_id: string | null
          created_at: string | null
          custom_category: Database["public"]["Enums"]["compound_cat"] | null
          custom_name: string | null
          cycle_off_days: number | null
          cycle_on_days: number | null
          days_of_week: number[] | null
          dose_amount: number | null
          dose_unit: Database["public"]["Enums"]["dose_unit_enum"] | null
          end_date: string | null
          frequency: Database["public"]["Enums"]["freq_enum"] | null
          id: string
          is_prescription: boolean | null
          notes: string | null
          post_workout: boolean | null
          rxcui: string | null
          start_date: string | null
          times_of_day: string[] | null
          user_id: string
          with_food: boolean | null
        }
        Insert: {
          active?: boolean | null
          compound_id?: string | null
          created_at?: string | null
          custom_category?: Database["public"]["Enums"]["compound_cat"] | null
          custom_name?: string | null
          cycle_off_days?: number | null
          cycle_on_days?: number | null
          days_of_week?: number[] | null
          dose_amount?: number | null
          dose_unit?: Database["public"]["Enums"]["dose_unit_enum"] | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["freq_enum"] | null
          id?: string
          is_prescription?: boolean | null
          notes?: string | null
          post_workout?: boolean | null
          rxcui?: string | null
          start_date?: string | null
          times_of_day?: string[] | null
          user_id: string
          with_food?: boolean | null
        }
        Update: {
          active?: boolean | null
          compound_id?: string | null
          created_at?: string | null
          custom_category?: Database["public"]["Enums"]["compound_cat"] | null
          custom_name?: string | null
          cycle_off_days?: number | null
          cycle_on_days?: number | null
          days_of_week?: number[] | null
          dose_amount?: number | null
          dose_unit?: Database["public"]["Enums"]["dose_unit_enum"] | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["freq_enum"] | null
          id?: string
          is_prescription?: boolean | null
          notes?: string | null
          post_workout?: boolean | null
          rxcui?: string | null
          start_date?: string | null
          times_of_day?: string[] | null
          user_id?: string
          with_food?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_compounds_compound_id_fkey"
            columns: ["compound_id"]
            isOneToOne: false
            referencedRelation: "compounds"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pair_notes: {
        Row: {
          compound_a_id: string
          compound_b_id: string
          created_at: string
          id: string
          note: string
          severity: string
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          compound_a_id: string
          compound_b_id: string
          created_at?: string
          id?: string
          note: string
          severity: string
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          compound_a_id?: string
          compound_b_id?: string
          created_at?: string
          id?: string
          note?: string
          severity?: string
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pair_notes_compound_a_id_fkey"
            columns: ["compound_a_id"]
            isOneToOne: false
            referencedRelation: "compounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pair_notes_compound_b_id_fkey"
            columns: ["compound_b_id"]
            isOneToOne: false
            referencedRelation: "compounds"
            referencedColumns: ["id"]
          },
        ]
      }
      vial_inventory: {
        Row: {
          cost_per_vial: number | null
          created_at: string
          currency: string
          doses_remaining: number
          id: string
          last_refilled_at: string | null
          low_threshold: number
          notes: string | null
          total_doses: number | null
          updated_at: string
          user_compound_id: string
        }
        Insert: {
          cost_per_vial?: number | null
          created_at?: string
          currency?: string
          doses_remaining?: number
          id?: string
          last_refilled_at?: string | null
          low_threshold?: number
          notes?: string | null
          total_doses?: number | null
          updated_at?: string
          user_compound_id: string
        }
        Update: {
          cost_per_vial?: number | null
          created_at?: string
          currency?: string
          doses_remaining?: number
          id?: string
          last_refilled_at?: string | null
          low_threshold?: number
          notes?: string | null
          total_doses?: number | null
          updated_at?: string
          user_compound_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vial_inventory_user_compound_id_fkey"
            columns: ["user_compound_id"]
            isOneToOne: true
            referencedRelation: "user_compounds"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          avg_hr: number | null
          avg_pace_s: number | null
          calories: number | null
          created_at: string
          distance_m: number | null
          duration_min: number | null
          id: string
          max_hr: number | null
          notes: string | null
          performed_on: string
          rpe: number | null
          scheduled_time: string | null
          sleep_quality: number | null
          status: string
          stress_level: number | null
          tags: string[]
          title: string | null
          updated_at: string
          user_id: string
          workout_type: string
        }
        Insert: {
          avg_hr?: number | null
          avg_pace_s?: number | null
          calories?: number | null
          created_at?: string
          distance_m?: number | null
          duration_min?: number | null
          id?: string
          max_hr?: number | null
          notes?: string | null
          performed_on: string
          rpe?: number | null
          scheduled_time?: string | null
          sleep_quality?: number | null
          status?: string
          stress_level?: number | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id: string
          workout_type?: string
        }
        Update: {
          avg_hr?: number | null
          avg_pace_s?: number | null
          calories?: number | null
          created_at?: string
          distance_m?: number | null
          duration_min?: number | null
          id?: string
          max_hr?: number | null
          notes?: string | null
          performed_on?: string
          rpe?: number | null
          scheduled_time?: string | null
          sleep_quality?: number | null
          status?: string
          stress_level?: number | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
          workout_type?: string
        }
        Relationships: []
      }
      workout_notification_log: {
        Row: {
          channel: string
          created_at: string
          id: string
          kind: string
          sent_at: string
          status: string | null
          user_id: string
          workout_log_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          kind: string
          sent_at?: string
          status?: string | null
          user_id: string
          workout_log_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          kind?: string
          sent_at?: string
          status?: string | null
          user_id?: string
          workout_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_notification_log_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_reminder_settings: {
        Row: {
          created_at: string
          enabled: boolean
          lead_minutes: number
          missed_check_hour: number
          missed_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          lead_minutes?: number
          missed_check_hour?: number
          missed_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          lead_minutes?: number
          missed_check_hour?: number
          missed_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          active: boolean | null
          anchor_date: string | null
          at_time_alert_on: boolean | null
          created_at: string | null
          days_of_week: number[] | null
          duration_min: number | null
          ended_at: string | null
          id: string
          interval_weeks: number
          kind: string | null
          label: string | null
          planned_time: string | null
          post_window_min: number | null
          pre_alert_on: boolean | null
          pre_lead_min: number | null
          repeat_until: string | null
          skipped_dates: string[]
          started_at: string | null
          template_id: string | null
          time_overrides: Json
          user_id: string
        }
        Insert: {
          active?: boolean | null
          anchor_date?: string | null
          at_time_alert_on?: boolean | null
          created_at?: string | null
          days_of_week?: number[] | null
          duration_min?: number | null
          ended_at?: string | null
          id?: string
          interval_weeks?: number
          kind?: string | null
          label?: string | null
          planned_time?: string | null
          post_window_min?: number | null
          pre_alert_on?: boolean | null
          pre_lead_min?: number | null
          repeat_until?: string | null
          skipped_dates?: string[]
          started_at?: string | null
          template_id?: string | null
          time_overrides?: Json
          user_id: string
        }
        Update: {
          active?: boolean | null
          anchor_date?: string | null
          at_time_alert_on?: boolean | null
          created_at?: string | null
          days_of_week?: number[] | null
          duration_min?: number | null
          ended_at?: string | null
          id?: string
          interval_weeks?: number
          kind?: string | null
          label?: string | null
          planned_time?: string | null
          post_window_min?: number | null
          pre_alert_on?: boolean | null
          pre_lead_min?: number | null
          repeat_until?: string | null
          skipped_dates?: string[]
          started_at?: string | null
          template_id?: string | null
          time_overrides?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          created_at: string
          exercise: string
          id: string
          reps: number | null
          set_index: number
          sets: number | null
          updated_at: string
          user_id: string
          weight_kg: number | null
          workout_log_id: string
        }
        Insert: {
          created_at?: string
          exercise: string
          id?: string
          reps?: number | null
          set_index?: number
          sets?: number | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
          workout_log_id: string
        }
        Update: {
          created_at?: string
          exercise?: string
          id?: string
          reps?: number | null
          set_index?: number
          sets?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
          workout_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_template_exercises: {
        Row: {
          created_at: string
          exercise: string
          id: string
          reps: number | null
          rest_seconds: number | null
          set_index: number
          sets: number | null
          template_id: string
          tempo: string | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          exercise: string
          id?: string
          reps?: number | null
          rest_seconds?: number | null
          set_index?: number
          sets?: number | null
          template_id: string
          tempo?: string | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          exercise?: string
          id?: string
          reps?: number | null
          rest_seconds?: number | null
          set_index?: number
          sets?: number | null
          template_id?: string
          tempo?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          calories: number | null
          created_at: string
          distance_m: number | null
          duration_min: number | null
          id: string
          last_used_at: string | null
          name: string
          notes: string | null
          rpe: number | null
          target_hr: number | null
          target_pace_s: number | null
          updated_at: string
          use_count: number
          user_id: string
          workout_type: string
        }
        Insert: {
          calories?: number | null
          created_at?: string
          distance_m?: number | null
          duration_min?: number | null
          id?: string
          last_used_at?: string | null
          name: string
          notes?: string | null
          rpe?: number | null
          target_hr?: number | null
          target_pace_s?: number | null
          updated_at?: string
          use_count?: number
          user_id: string
          workout_type?: string
        }
        Update: {
          calories?: number | null
          created_at?: string
          distance_m?: number | null
          duration_min?: number | null
          id?: string
          last_used_at?: string | null
          name?: string
          notes?: string | null
          rpe?: number | null
          target_hr?: number | null
          target_pace_s?: number | null
          updated_at?: string
          use_count?: number
          user_id?: string
          workout_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_overview: {
        Row: {
          onboarded_users: number | null
          plus_users: number | null
          pro_users: number | null
          signups_30d: number | null
          signups_7d: number | null
          total_users: number | null
        }
        Relationships: []
      }
      admin_signups_by_day: {
        Row: {
          day: string | null
          signups: number | null
        }
        Relationships: []
      }
      admin_tier_breakdown: {
        Row: {
          tier: string | null
          users: number | null
        }
        Relationships: []
      }
      admin_top_categories: {
        Row: {
          adds: number | null
          category: Database["public"]["Enums"]["compound_cat"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      barcode_miss_report: {
        Args: { _days?: number; _limit?: number }
        Returns: {
          cached_category: string
          cached_name: string
          cached_source: string
          code: string
          corrections: number
          last_seen: string
          misses: number
          resolved_later: boolean
          scan_sources: string[]
        }[]
      }
      barcode_scan_stats: { Args: { _days?: number }; Returns: Json }
      closed_testing_funnel_by_source: {
        Args: never
        Returns: {
          campaign: string
          converted: number
          first_signup: string
          installed: number
          invited: number
          last_signup: string
          medium: string
          retained_14d: number
          signups: number
          source: string
        }[]
      }
      compound_content_status: {
        Args: never
        Returns: {
          compound_id: string
          has_body_md: boolean
          has_meta_description: boolean
          has_meta_title: boolean
          lens: Json
          structure_image_url: string
          updated_at: string
        }[]
      }
      get_shared_protocol: {
        Args: { _token: string }
        Returns: {
          created_at: string
          snapshot: Json
          title: string
          token: string
        }[]
      }
      get_shared_routine: {
        Args: { _public_id: string }
        Returns: {
          created_at: string
          distance_m: number
          duration_min: number
          exercises: Json
          owner_name: string
          public_id: string
          routine_name: string
          rpe: number
          save_count: number
          target_hr: number
          target_pace_s: number
          view_count: number
          workout_type: string
        }[]
      }
      increment_routine_share_save: {
        Args: { _public_id: string }
        Returns: undefined
      }
      increment_routine_share_view: {
        Args: { _public_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      audience_tier: "optimizer" | "glp1" | "everyday"
      channel_enum: "push" | "email" | "sms"
      compound_cat:
        | "vitamin"
        | "mineral"
        | "supplement"
        | "peptide"
        | "hormone"
        | "glp1"
        | "medication"
      dose_unit_enum: "mg" | "mcg" | "iu" | "g" | "ml"
      event_status: "pending" | "taken" | "skipped" | "missed"
      food_rule_enum: "with_food" | "empty_stomach" | "either"
      freq_enum: "daily" | "weekly" | "custom"
      interaction_confidence:
        | "established"
        | "plausible"
        | "theoretical"
        | "disputed"
      severity_enum: "synergy" | "note" | "caution" | "avoid"
      sex_enum: "male" | "female" | "other" | "prefer_not"
      sub_tier: "free" | "plus" | "pro"
      timing_enum:
        | "morning"
        | "evening"
        | "pre_workout"
        | "with_meal"
        | "bedtime"
        | "any"
      unit_pref: "metric" | "imperial"
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
      audience_tier: ["optimizer", "glp1", "everyday"],
      channel_enum: ["push", "email", "sms"],
      compound_cat: [
        "vitamin",
        "mineral",
        "supplement",
        "peptide",
        "hormone",
        "glp1",
        "medication",
      ],
      dose_unit_enum: ["mg", "mcg", "iu", "g", "ml"],
      event_status: ["pending", "taken", "skipped", "missed"],
      food_rule_enum: ["with_food", "empty_stomach", "either"],
      freq_enum: ["daily", "weekly", "custom"],
      interaction_confidence: [
        "established",
        "plausible",
        "theoretical",
        "disputed",
      ],
      severity_enum: ["synergy", "note", "caution", "avoid"],
      sex_enum: ["male", "female", "other", "prefer_not"],
      sub_tier: ["free", "plus", "pro"],
      timing_enum: [
        "morning",
        "evening",
        "pre_workout",
        "with_meal",
        "bedtime",
        "any",
      ],
      unit_pref: ["metric", "imperial"],
    },
  },
} as const
