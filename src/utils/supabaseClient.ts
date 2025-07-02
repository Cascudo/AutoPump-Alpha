// src/utils/supabaseClient.ts
// UPDATED with promotional giveaway package pricing types - NO BREAKING CHANGES

import { createClient } from '@supabase/supabase-js';

// ===============================================
// UPDATED SUPABASE TYPES - PACKAGE PRICING
// ===============================================

// Entry package interface
export interface EntryPackage {
  id: number;
  name: string;
  price: number;
  entries: number;
  popular: boolean;
}

// Updated Database interface with promotional giveaway tables
export interface Database {
  public: {
    Tables: {
      // ===============================================
      // EXISTING TABLES (UNCHANGED)
      // ===============================================
      users: {
        Row: {
          id: string;
          wallet_address: string;
          instance_id: string | null;
          aud: string | null;
          role: string | null;
          email: string | null;
          encrypted_password: string | null;
          email_confirmed_at: string | null;
          invited_at: string | null;
          confirmation_token: string | null;
          confirmation_sent_at: string | null;
          recovery_token: string | null;
          recovery_sent_at: string | null;
          email_change_token_new: string | null;
          email_change: string | null;
          email_change_sent_at: string | null;
          last_sign_in_at: string | null;
          raw_app_meta_data: Record<string, any> | null;
          raw_user_meta_data: Record<string, any> | null;
          is_super_admin: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          phone: string | null;
          phone_confirmed_at: string | null;
          phone_change: string | null;
          phone_change_token: string | null;
          phone_change_sent_at: string | null;
          confirmed_at: string | null;
          email_change_token_current: string | null;
          email_change_confirm_status: number | null;
          banned_until: string | null;
          reauthentication_token: string | null;
          reauthentication_sent_at: string | null;
          is_sso_user: boolean;
          deleted_at: string | null;
          is_anonymous: boolean;
          vip_tier: string;
          token_balance: number;
          usd_value: number;
          cached_entries: number;
          balance_stale: boolean;
          priority_update: boolean;
          skip_blockchain_updates: boolean;
          is_eligible: boolean;
          excluded_from_draw: boolean;
          exclusion_reason: string | null;
          excluded_by: string | null;
          excluded_at: string | null;
          baseline_entries_accumulated: number;
          months_subscribed: number;
          last_baseline_award: string | null;
          subscription_start_date: string | null;
          subscription_expiry: string | null;
          last_balance_check: string;
        };
        Insert: {
          wallet_address: string;
          instance_id?: string | null;
          aud?: string | null;
          role?: string | null;
          email?: string | null;
          encrypted_password?: string | null;
          email_confirmed_at?: string | null;
          invited_at?: string | null;
          confirmation_token?: string | null;
          confirmation_sent_at?: string | null;
          recovery_token?: string | null;
          recovery_sent_at?: string | null;
          email_change_token_new?: string | null;
          email_change?: string | null;
          email_change_sent_at?: string | null;
          last_sign_in_at?: string | null;
          raw_app_meta_data?: Record<string, any> | null;
          raw_user_meta_data?: Record<string, any> | null;
          is_super_admin?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          phone?: string | null;
          phone_confirmed_at?: string | null;
          phone_change?: string | null;
          phone_change_token?: string | null;
          phone_change_sent_at?: string | null;
          confirmed_at?: string | null;
          email_change_token_current?: string | null;
          email_change_confirm_status?: number | null;
          banned_until?: string | null;
          reauthentication_token?: string | null;
          reauthentication_sent_at?: string | null;
          is_sso_user?: boolean;
          deleted_at?: string | null;
          is_anonymous?: boolean;
          vip_tier?: string;
          token_balance?: number;
          usd_value?: number;
          cached_entries?: number;
          balance_stale?: boolean;
          priority_update?: boolean;
          skip_blockchain_updates?: boolean;
          is_eligible?: boolean;
          excluded_from_draw?: boolean;
          exclusion_reason?: string | null;
          excluded_by?: string | null;
          excluded_at?: string | null;
          baseline_entries_accumulated?: number;
          months_subscribed?: number;
          last_baseline_award?: string | null;
          subscription_start_date?: string | null;
          subscription_expiry?: string | null;
          last_balance_check?: string;
        };
        Update: {
          wallet_address?: string;
          instance_id?: string | null;
          aud?: string | null;
          role?: string | null;
          email?: string | null;
          encrypted_password?: string | null;
          email_confirmed_at?: string | null;
          invited_at?: string | null;
          confirmation_token?: string | null;
          confirmation_sent_at?: string | null;
          recovery_token?: string | null;
          recovery_sent_at?: string | null;
          email_change_token_new?: string | null;
          email_change?: string | null;
          email_change_sent_at?: string | null;
          last_sign_in_at?: string | null;
          raw_app_meta_data?: Record<string, any> | null;
          raw_user_meta_data?: Record<string, any> | null;
          is_super_admin?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          phone?: string | null;
          phone_confirmed_at?: string | null;
          phone_change?: string | null;
          phone_change_token?: string | null;
          phone_change_sent_at?: string | null;
          confirmed_at?: string | null;
          email_change_token_current?: string | null;
          email_change_confirm_status?: number | null;
          banned_until?: string | null;
          reauthentication_token?: string | null;
          reauthentication_sent_at?: string | null;
          is_sso_user?: boolean;
          deleted_at?: string | null;
          is_anonymous?: boolean;
          vip_tier?: string;
          token_balance?: number;
          usd_value?: number;
          cached_entries?: number;
          balance_stale?: boolean;
          priority_update?: boolean;
          skip_blockchain_updates?: boolean;
          is_eligible?: boolean;
          excluded_from_draw?: boolean;
          exclusion_reason?: string | null;
          excluded_by?: string | null;
          excluded_at?: string | null;
          baseline_entries_accumulated?: number;
          months_subscribed?: number;
          last_baseline_award?: string | null;
          subscription_start_date?: string | null;
          subscription_expiry?: string | null;
          last_balance_check?: string;
        };
      };

      subscriptions: {
        Row: {
          id: string;
          user_wallet: string;
          tier: string;
          price: number;
          payment_tx: string;
          payment_currency: string;
          payment_status: string;
          expires_at: string;
          auto_renew: boolean;
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_wallet: string;
          tier: string;
          price: number;
          payment_tx: string;
          payment_currency: string;
          payment_status?: string;
          expires_at: string;
          auto_renew?: boolean;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_wallet?: string;
          tier?: string;
          price?: number;
          payment_tx?: string;
          payment_currency?: string;
          payment_status?: string;
          expires_at?: string;
          auto_renew?: boolean;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      daily_draws: {
        Row: {
          id: string;
          draw_date: string;
          total_pool: number;
          eligible_holders: number;
          total_entries: number;
          winner_wallet: string | null;
          winner_entries: number | null;
          payment_tx: string | null;
          payment_amount: number | null;
          payment_status: string;
          draw_status: string;
          entries_snapshot: Record<string, any> | null;
          creator_fee_amount: number;
          admin_initiated: boolean;
          initiated_by: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          draw_date: string;
          total_pool: number;
          eligible_holders: number;
          total_entries: number;
          winner_wallet?: string | null;
          winner_entries?: number | null;
          payment_tx?: string | null;
          payment_amount?: number | null;
          payment_status?: string;
          draw_status?: string;
          entries_snapshot?: Record<string, any> | null;
          creator_fee_amount: number;
          admin_initiated?: boolean;
          initiated_by?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          draw_date?: string;
          total_pool?: number;
          eligible_holders?: number;
          total_entries?: number;
          winner_wallet?: string | null;
          winner_entries?: number | null;
          payment_tx?: string | null;
          payment_amount?: number | null;
          payment_status?: string;
          draw_status?: string;
          entries_snapshot?: Record<string, any> | null;
          creator_fee_amount?: number;
          admin_initiated?: boolean;
          initiated_by?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };

      admin_awards: {
        Row: {
          id: string;
          awarded_wallet: string;
          award_type: string;
          entries_awarded: number;
          reason: string | null;
          notes: string | null;
          awarded_by: string;
          revoked: boolean;
          revoked_by: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          awarded_wallet: string;
          award_type: string;
          entries_awarded: number;
          reason?: string | null;
          notes?: string | null;
          awarded_by: string;
          revoked?: boolean;
          revoked_by?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          awarded_wallet?: string;
          award_type?: string;
          entries_awarded?: number;
          reason?: string | null;
          notes?: string | null;
          awarded_by?: string;
          revoked?: boolean;
          revoked_by?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
      };

      balance_cache: {
        Row: {
          wallet_address: string;
          token_balance: number;
          usd_value: number;
          entries: number;
          last_updated: string;
          is_stale: boolean;
        };
        Insert: {
          wallet_address: string;
          token_balance: number;
          usd_value: number;
          entries: number;
          last_updated?: string;
          is_stale?: boolean;
        };
        Update: {
          wallet_address?: string;
          token_balance?: number;
          usd_value?: number;
          entries?: number;
          last_updated?: string;
          is_stale?: boolean;
        };
      };

      holder_activity_log: {
        Row: {
          id: string;
          wallet_address: string;
          activity_type: string;
          old_balance: number | null;
          new_balance: number | null;
          old_entries: number | null;
          new_entries: number | null;
          transaction_signature: string | null;
          metadata: Record<string, any> | null;
          created_at: string;
        };
        Insert: {
          wallet_address: string;
          activity_type: string;
          old_balance?: number | null;
          new_balance?: number | null;
          old_entries?: number | null;
          new_entries?: number | null;
          transaction_signature?: string | null;
          metadata?: Record<string, any> | null;
          created_at?: string;
        };
        Update: {
          wallet_address?: string;
          activity_type?: string;
          old_balance?: number | null;
          new_balance?: number | null;
          old_entries?: number | null;
          new_entries?: number | null;
          transaction_signature?: string | null;
          metadata?: Record<string, any> | null;
          created_at?: string;
        };
      };

      daily_holder_stats: {
        Row: {
          id: string;
          stat_date: string;
          total_holders: number;
          eligible_holders: number;
          total_token_balance: number;
          total_usd_value: number;
          average_holding: number;
          median_holding: number;
          total_entries: number;
          vip_silver_count: number;
          vip_gold_count: number;
          vip_platinum_count: number;
          created_at: string;
        };
        Insert: {
          stat_date: string;
          total_holders: number;
          eligible_holders: number;
          total_token_balance: number;
          total_usd_value: number;
          average_holding: number;
          median_holding: number;
          total_entries: number;
          vip_silver_count?: number;
          vip_gold_count?: number;
          vip_platinum_count?: number;
          created_at?: string;
        };
        Update: {
          stat_date?: string;
          total_holders?: number;
          eligible_holders?: number;
          total_token_balance?: number;
          total_usd_value?: number;
          average_holding?: number;
          median_holding?: number;
          total_entries?: number;
          vip_silver_count?: number;
          vip_gold_count?: number;
          vip_platinum_count?: number;
          created_at?: string;
        };
      };

      admin_baseline_adjustments: {
        Row: {
          id: string;
          effective_date: string;
          baseline_entries: number;
          reason: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          effective_date: string;
          baseline_entries: number;
          reason?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          effective_date?: string;
          baseline_entries?: number;
          reason?: string | null;
          created_by?: string;
          created_at?: string;
        };
      };

      early_bird_promotions: {
        Row: {
          id: string;
          promo_name: string;
          description: string | null;
          start_date: string;
          end_date: string;
          discount_percent: number;
          max_uses: number | null;
          current_uses: number;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          promo_name: string;
          description?: string | null;
          start_date: string;
          end_date: string;
          discount_percent: number;
          max_uses?: number | null;
          current_uses?: number;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          promo_name?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string;
          discount_percent?: number;
          max_uses?: number | null;
          current_uses?: number;
          is_active?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };

      // ===============================================
      // UPDATED PROMOTIONAL GIVEAWAY TABLES - PACKAGE PRICING
      // ===============================================
      promotional_giveaways: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          prize_type: 'physical' | 'cash' | 'crypto';
          prize_value: number;
          prize_description: string;
          prize_image_url: string | null; // Keep for backward compatibility
          prize_images: string[]; // NEW: Array of up to 10 image URLs
          entry_packages: EntryPackage[]; // NEW: Package-based pricing
          entry_start_date: string;
          entry_end_date: string;
          draw_date: string;
          status: 'upcoming' | 'active' | 'ended' | 'drawn' | 'fulfilled' | 'cancelled';
          is_featured: boolean;
          winner_wallet: string | null;
          winner_selected_at: string | null;
          total_entries: number;
          total_revenue: number;
          created_by: string;
          created_at: string;
          updated_at: string;
          
          // DEPRECATED (keep for migration compatibility):
          min_entry_price?: number;
          max_entry_price?: number;
          entries_per_dollar?: number;
        };
        Insert: {
          title: string;
          description?: string | null;
          prize_type: 'physical' | 'cash' | 'crypto';
          prize_value: number;
          prize_description: string;
          prize_image_url?: string | null;
          prize_images?: string[];
          entry_packages?: EntryPackage[];
          entry_start_date: string;
          entry_end_date: string;
          draw_date: string;
          status?: 'upcoming' | 'active' | 'ended' | 'drawn' | 'fulfilled' | 'cancelled';
          is_featured?: boolean;
          winner_wallet?: string | null;
          winner_selected_at?: string | null;
          total_entries?: number;
          total_revenue?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          prize_type?: 'physical' | 'cash' | 'crypto';
          prize_value?: number;
          prize_description?: string;
          prize_image_url?: string | null;
          prize_images?: string[];
          entry_packages?: EntryPackage[];
          entry_start_date?: string;
          entry_end_date?: string;
          draw_date?: string;
          status?: 'upcoming' | 'active' | 'ended' | 'drawn' | 'fulfilled' | 'cancelled';
          is_featured?: boolean;
          winner_wallet?: string | null;
          winner_selected_at?: string | null;
          total_entries?: number;
          total_revenue?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };

      promotional_giveaway_entries: {
        Row: {
          id: string;
          giveaway_id: string;
          user_wallet: string;
          base_entries: number;
          purchased_entries: number;
          vip_multiplier: number;
          final_entries: number;
          total_spent: number;
          payment_transactions: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          giveaway_id: string;
          user_wallet: string;
          base_entries?: number;
          purchased_entries?: number;
          vip_multiplier?: number;
          final_entries?: number;
          total_spent?: number;
          payment_transactions?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          giveaway_id?: string;
          user_wallet?: string;
          base_entries?: number;
          purchased_entries?: number;
          vip_multiplier?: number;
          final_entries?: number;
          total_spent?: number;
          payment_transactions?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };

      promotional_entry_purchases: {
        Row: {
          id: string;
          giveaway_id: string;
          user_wallet: string;
          purchase_amount: number;
          entries_purchased: number;
          vip_multiplier: number;
          final_entries_awarded: number;
          payment_tx: string;
          payment_currency: 'SOL' | 'USDC' | 'ALPHA';
          payment_status: 'pending' | 'confirmed' | 'failed';
          created_at: string;
        };
        Insert: {
          giveaway_id: string;
          user_wallet: string;
          purchase_amount: number;
          entries_purchased: number;
          vip_multiplier?: number;
          final_entries_awarded: number;
          payment_tx: string;
          payment_currency: 'SOL' | 'USDC' | 'ALPHA';
          payment_status?: 'pending' | 'confirmed' | 'failed';
          created_at?: string;
        };
        Update: {
          giveaway_id?: string;
          user_wallet?: string;
          purchase_amount?: number;
          entries_purchased?: number;
          vip_multiplier?: number;
          final_entries_awarded?: number;
          payment_tx?: string;
          payment_currency?: 'SOL' | 'USDC' | 'ALPHA';
          payment_status?: 'pending' | 'confirmed' | 'failed';
          created_at?: string;
        };
      };

      promotional_giveaway_fulfillments: {
        Row: {
          id: string;
          giveaway_id: string;
          winner_wallet: string;
          fulfillment_type: 'physical' | 'cash' | 'crypto';
          shipping_address: Record<string, any> | null;
          tracking_number: string | null;
          fulfillment_status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
          fulfillment_notes: string | null;
          fulfilled_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          giveaway_id: string;
          winner_wallet: string;
          fulfillment_type: 'physical' | 'cash' | 'crypto';
          shipping_address?: Record<string, any> | null;
          tracking_number?: string | null;
          fulfillment_status?: 'pending' | 'shipped' | 'delivered' | 'cancelled';
          fulfillment_notes?: string | null;
          fulfilled_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          giveaway_id?: string;
          winner_wallet?: string;
          fulfillment_type?: 'physical' | 'cash' | 'crypto';
          shipping_address?: Record<string, any> | null;
          tracking_number?: string | null;
          fulfillment_status?: 'pending' | 'shipped' | 'delivered' | 'cancelled';
          fulfillment_notes?: string | null;
          fulfilled_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Initialize Supabase client (UNCHANGED)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Service role client for admin operations (UNCHANGED)
export const getAdminSupabaseClient = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
};

// Helper type exports (UPDATED with new promotional types)
export type User = Database['public']['Tables']['users']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type DailyDraw = Database['public']['Tables']['daily_draws']['Row'];
export type AdminAward = Database['public']['Tables']['admin_awards']['Row'];
export type BalanceCache = Database['public']['Tables']['balance_cache']['Row'];
export type HolderActivity = Database['public']['Tables']['holder_activity_log']['Row'];
export type DailyStats = Database['public']['Tables']['daily_holder_stats']['Row'];
export type AdminBaselineAdjustment = Database['public']['Tables']['admin_baseline_adjustments']['Row'];
export type EarlyBirdPromotion = Database['public']['Tables']['early_bird_promotions']['Row'];

// 🎯 UPDATED: Promotional giveaway type exports with package pricing
export type PromotionalGiveaway = Database['public']['Tables']['promotional_giveaways']['Row'];
export type PromotionalGiveawayEntry = Database['public']['Tables']['promotional_giveaway_entries']['Row'];
export type PromotionalEntryPurchase = Database['public']['Tables']['promotional_entry_purchases']['Row'];
export type PromotionalGiveawayFulfillment = Database['public']['Tables']['promotional_giveaway_fulfillments']['Row'];