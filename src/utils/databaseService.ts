// src/utils/databaseService.ts - ENHANCED with VIP baseline support
import { supabase, getAdminSupabaseClient, User, Subscription, DailyDraw, BalanceCache } from './supabaseClient';

export class DatabaseService {
  
  /**
   * USER MANAGEMENT
   */
  
  // Get or create user record (UPDATED with VIP baseline fields)
  static async getOrCreateUser(walletAddress: string): Promise<User> {
    try {
      // First try to get existing user with VIP baseline fields
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (existingUser && !fetchError) {
        return existingUser;
      }

      // Create new user if doesn't exist (UPDATED with VIP baseline defaults)
      const newUser = {
        wallet_address: walletAddress,
        vip_tier: 'None' as const,
        token_balance: 0,
        usd_value: 0,
        cached_entries: 0,
        balance_stale: true,
        priority_update: false,
        skip_blockchain_updates: false,
        is_eligible: false,
        excluded_from_draw: false,
        
        // 🎯 ADDED: VIP baseline defaults
        baseline_entries_accumulated: 0,
        months_subscribed: 0,
        last_baseline_award: null,
        subscription_start_date: null,
        
        // 🎯 ADDED: Exclusion defaults
        exclusion_reason: null,
        excluded_by: null,
        excluded_at: null
      };

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }

      console.log('✅ New user created:', walletAddress.slice(0, 8) + '...');
      return createdUser;

    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      throw error;
    }
  }

  // 🎯 NEW: Get user with VIP baseline entries
  static async getUserWithVipBaseline(walletAddress: string): Promise<{
    user: User | null;
    vipBaselineEntries: number;
    vipTier: string;
    subscriptionActive: boolean;
  }> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*, baseline_entries_accumulated, vip_tier, subscription_expiry')
        .eq('wallet_address', walletAddress)
        .single();

      if (error) {
        console.error('Error fetching user with VIP baseline:', error);
        return {
          user: null,
          vipBaselineEntries: 0,
          vipTier: 'None',
          subscriptionActive: false
        };
      }

      // Check if subscription is still active
      const subscriptionActive = user.subscription_expiry ? 
        new Date(user.subscription_expiry) > new Date() : false;

      // If subscription expired, baseline entries should be 0
      const vipBaselineEntries = subscriptionActive ? 
        (user.baseline_entries_accumulated || 0) : 0;

      return {
        user,
        vipBaselineEntries,
        vipTier: user.vip_tier || 'None',
        subscriptionActive
      };

    } catch (error) {
      console.error('Error in getUserWithVipBaseline:', error);
      return {
        user: null,
        vipBaselineEntries: 0,
        vipTier: 'None',
        subscriptionActive: false
      };
    }
  }

  // Update user balance and entries (CORRECTED with VIP baseline support)
  static async updateUserBalance(
    walletAddress: string, 
    tokenBalance: number, 
    usdValue: number, 
    tokenPriceUSD: number,
    vipMultiplier: number = 1,
    vipBaselineEntries: number = 0 // 🎯 ADDED: VIP baseline parameter
  ): Promise<{ success: boolean; cachedEntries: number; rateLimited?: boolean }> {
    try {
      // Check rate limiting (30 seconds minimum between updates)
      const { data: user } = await supabase
        .from('users')
        .select('last_balance_check')
        .eq('wallet_address', walletAddress)
        .single();

      if (user?.last_balance_check) {
        const lastCheck = new Date(user.last_balance_check);
        const now = new Date();
        const diffSeconds = (now.getTime() - lastCheck.getTime()) / 1000;
        
        if (diffSeconds < 30) {
          console.log('⏱️ Rate limited - last update was', diffSeconds.toFixed(0), 'seconds ago');
          return { 
            success: false, 
            cachedEntries: 0, 
            rateLimited: true 
          };
        }
      }

      // 🎯 CORRECTED: Calculate entries with VIP baseline support
      const tokenBaselineEntries = Math.floor(usdValue / 10); // From token holdings
      const totalBaseEntries = tokenBaselineEntries + vipBaselineEntries; // Include VIP baseline
      const cachedEntries = totalBaseEntries * vipMultiplier; // Apply multiplier

      // 🎯 CORRECTED: Eligibility includes VIP users
      const hasTokenEntries = tokenBaselineEntries > 0;
      const hasVipEntries = vipBaselineEntries > 0;
      const isEligible = hasTokenEntries || hasVipEntries;

      // Determine if blockchain updates should be skipped
      const skipBlockchainUpdates = tokenBalance === 0 && vipMultiplier === 1;

      console.log('🔧 DatabaseService: CORRECTED entry calculation:', {
        wallet: walletAddress.slice(0, 8) + '...',
        tokenBaselineEntries,
        vipBaselineEntries,
        totalBaseEntries,
        vipMultiplier,
        cachedEntries,
        isEligible,
        formula: `(${tokenBaselineEntries} + ${vipBaselineEntries}) × ${vipMultiplier} = ${cachedEntries}`
      });

      // Update user record with CORRECTED calculation
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
          token_balance: tokenBalance,
          usd_value: usdValue,
          cached_entries: cachedEntries, // 🎯 CORRECTED: Now includes VIP baseline
          is_eligible: isEligible, // 🎯 CORRECTED: Now considers VIP users
          last_balance_check: new Date().toISOString(),
          balance_stale: false,
          skip_blockchain_updates: skipBlockchainUpdates,
          priority_update: usdValue > 1000 // Priority for large holders
        })
        .eq('wallet_address', walletAddress)
        .select()
        .single();

      if (error) {
        console.error('Error updating user balance:', error);
        throw error;
      }

      // Update balance cache with corrected values
      await this.updateBalanceCache(walletAddress, tokenBalance, usdValue, cachedEntries, isEligible);

      console.log('✅ CORRECTED User balance updated:', {
        wallet: walletAddress.slice(0, 8) + '...',
        usdValue: usdValue.toFixed(2),
        vipBaselineEntries,
        finalEntries: cachedEntries,
        eligible: isEligible
      });

      return { success: true, cachedEntries };

    } catch (error) {
      console.error('Error in updateUserBalance:', error);
      return { success: false, cachedEntries: 0 };
    }
  }

  // Update balance cache (UPDATED with eligibility)
  static async updateBalanceCache(
    walletAddress: string, 
    tokenBalance: number, 
    usdValue: number, 
    entriesCalculated: number,
    isEligible: boolean = false // 🎯 ADDED: Eligibility parameter
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('balance_cache')
        .upsert({
          wallet: walletAddress,
          token_balance: tokenBalance,
          usd_value: usdValue,
          last_updated: new Date().toISOString(),
          entries_calculated: entriesCalculated,
          needs_refresh: false,
          is_eligible: isEligible // 🎯 ADDED: Store eligibility in cache
        });

      if (error) {
        console.error('Error updating balance cache:', error);
      }
    } catch (error) {
      console.error('Error in updateBalanceCache:', error);
    }
  }

  /**
   * 🎯 NEW: VIP BASELINE ENTRY MANAGEMENT
   */

  // Get user's VIP baseline entries
  static async getVipBaselineEntries(walletAddress: string): Promise<{
    baselineEntries: number;
    vipTier: string;
    subscriptionActive: boolean;
  }> {
    try {
      const result = await this.getUserWithVipBaseline(walletAddress);
      return {
        baselineEntries: result.vipBaselineEntries,
        vipTier: result.vipTier,
        subscriptionActive: result.subscriptionActive
      };
    } catch (error) {
      console.error('Error in getVipBaselineEntries:', error);
      return {
        baselineEntries: 0,
        vipTier: 'None',
        subscriptionActive: false
      };
    }
  }

  // Award monthly VIP baseline entries (admin function)
  static async awardMonthlyVipBaseline(
    walletAddress: string,
    tier: 'Silver' | 'Gold' | 'Platinum'
  ): Promise<boolean> {
    try {
      const adminClient = getAdminSupabaseClient();
      
      // Determine baseline entries per tier
      const baselinePerTier = {
        'Silver': 2,
        'Gold': 3,
        'Platinum': 5
      };
      
      const entriesToAdd = baselinePerTier[tier];
      
      // Use database function to safely award baseline entries
      const { data, error } = await adminClient
        .rpc('award_monthly_baseline_entries', {
          wallet_address: walletAddress,
          entries_to_add: entriesToAdd
        });

      if (error) {
        console.error('Error awarding monthly VIP baseline:', error);
        return false;
      }

      console.log(`✅ Awarded ${entriesToAdd} VIP baseline entries to ${walletAddress.slice(0, 8)}...`);
      return true;

    } catch (error) {
      console.error('Error in awardMonthlyVipBaseline:', error);
      return false;
    }
  }

  /**
   * VIP SUBSCRIPTION MANAGEMENT (UPDATED)
   */

  // Get active VIP subscription (same as before)
  static async getActiveSubscription(walletAddress: string): Promise<Subscription | null> {
    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_wallet', walletAddress)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching subscription:', error);
        return null;
      }

      return subscription;
    } catch (error) {
      console.error('Error in getActiveSubscription:', error);
      return null;
    }
  }

  // Create new VIP subscription (UPDATED with baseline entry initialization)
  static async createSubscription(
    walletAddress: string,
    tier: 'Silver' | 'Gold' | 'Platinum',
    paymentTx: string | null,
    paymentAmount: number,
    paymentCurrency: string,
    durationDays: number = 30
  ): Promise<Subscription | null> {
    try {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + (durationDays * 24 * 60 * 60 * 1000));

      // Determine initial baseline entries
      const initialBaselineEntries = {
        'Silver': 2,
        'Gold': 3,
        'Platinum': 5
      }[tier];

      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert({
          user_wallet: walletAddress,
          tier,
          payment_tx: paymentTx,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          payment_amount: paymentAmount,
          payment_currency: paymentCurrency,
          auto_renew: false,
          status: 'active',
          early_bird_bonus: false,
          baseline_entries_granted: initialBaselineEntries
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating subscription:', error);
        return null;
      }

      // 🎯 UPDATED: Update user's VIP tier AND baseline entries
      await supabase
        .from('users')
        .update({
          vip_tier: tier,
          subscription_expiry: endDate.toISOString(),
          subscription_start_date: startDate.toISOString(),
          baseline_entries_accumulated: initialBaselineEntries, // 🎯 ADDED: Initialize baseline
          months_subscribed: 1, // 🎯 ADDED: Track subscription duration
          last_baseline_award: startDate.toISOString().split('T')[0] // 🎯 ADDED: Track last award
        })
        .eq('wallet_address', walletAddress);

      console.log('✅ VIP subscription created with baseline entries:', {
        wallet: walletAddress.slice(0, 8) + '...',
        tier,
        baselineEntries: initialBaselineEntries,
        expires: endDate.toLocaleDateString()
      });

      return subscription;
    } catch (error) {
      console.error('Error in createSubscription:', error);
      return null;
    }
  }

  /**
   * ADMIN OPERATIONS (UPDATED)
   */

  // Get total eligible entries (CORRECTED to exclude excluded wallets)
  static async getTotalEligibleEntries(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('cached_entries')
        .eq('is_eligible', true)
        .eq('excluded_from_draw', false); // 🎯 ADDED: Exclude excluded wallets

      if (error) {
        console.error('Error getting total entries:', error);
        return 0;
      }

      return data?.reduce((sum, user) => sum + user.cached_entries, 0) || 0;
    } catch (error) {
      console.error('Error in getTotalEligibleEntries:', error);
      return 0;
    }
  }

  // 🎯 NEW: Get eligible holders for draw (excluding excluded wallets)
  static async getEligibleHoldersForDraw(): Promise<Array<{
    wallet: string;
    entries: number;
    vipTier: string;
    tokenBalance: number;
    usdValue: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('wallet_address, cached_entries, vip_tier, token_balance, usd_value')
        .eq('is_eligible', true)
        .eq('excluded_from_draw', false)
        .gt('cached_entries', 0);

      if (error) {
        console.error('Error getting eligible holders:', error);
        return [];
      }

      return (data || []).map(user => ({
        wallet: user.wallet_address,
        entries: user.cached_entries,
        vipTier: user.vip_tier,
        tokenBalance: user.token_balance,
        usdValue: user.usd_value
      }));

    } catch (error) {
      console.error('Error in getEligibleHoldersForDraw:', error);
      return [];
    }
  }

  /**
   * LEGACY METHODS (keeping for backward compatibility)
   */

  // Get users needing balance updates (for admin batch processing)
  static async getUsersForBatchUpdate(limit: number = 100): Promise<User[]> {
    try {
      const adminClient = getAdminSupabaseClient();
      
      const { data: users, error } = await adminClient
        .from('users')
        .select('*')
        .eq('skip_blockchain_updates', false)
        .or('balance_stale.eq.true,priority_update.eq.true')
        .order('priority_update', { ascending: false })
        .order('last_balance_check', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching users for batch update:', error);
        return [];
      }

      return users || [];
    } catch (error) {
      console.error('Error in getUsersForBatchUpdate:', error);
      return [];
    }
  }

  // Batch update multiple users (admin operation)
  static async batchUpdateUsers(updates: Array<{
    wallet_address: string;
    token_balance: number;
    usd_value: number;
    cached_entries: number;
  }>): Promise<{ success: boolean; updatedCount: number }> {
    try {
      const adminClient = getAdminSupabaseClient();
      
      // Prepare bulk update
      const userUpdates = updates.map(update => ({
        wallet_address: update.wallet_address,
        token_balance: update.token_balance,
        usd_value: update.usd_value,
        cached_entries: update.cached_entries,
        last_balance_check: new Date().toISOString(),
        balance_stale: false
      }));

      const { error } = await adminClient
        .from('users')
        .upsert(userUpdates);

      if (error) {
        console.error('Error in batch update:', error);
        return { success: false, updatedCount: 0 };
      }

      console.log('✅ Batch updated', updates.length, 'users');
      return { success: true, updatedCount: updates.length };

    } catch (error) {
      console.error('Error in batchUpdateUsers:', error);
      return { success: false, updatedCount: 0 };
    }
  }

  /**
   * DAILY DRAW MANAGEMENT (same as before)
   */

  // Create daily draw snapshot
  static async createDailyDraw(totalEntries: number, entriesSnapshot: any): Promise<DailyDraw | null> {
    try {
      const adminClient = getAdminSupabaseClient();
      
      const { data: draw, error } = await adminClient
        .from('daily_draws')
        .insert({
          draw_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          total_eligible_entries: totalEntries,
          entries_snapshot: entriesSnapshot
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating daily draw:', error);
        return null;
      }

      return draw;
    } catch (error) {
      console.error('Error in createDailyDraw:', error);
      return null;
    }
  }

  // Update draw with winner
  static async updateDrawWinner(
    drawId: string, 
    winnerWallet: string, 
    prizeAmount: number, 
    drawTx: string
  ): Promise<boolean> {
    try {
      const adminClient = getAdminSupabaseClient();
      
      const { error } = await adminClient
        .from('daily_draws')
        .update({
          winner_wallet: winnerWallet,
          prize_amount: prizeAmount,
          draw_tx: drawTx,
          draw_completed_at: new Date().toISOString()
        })
        .eq('id', drawId);

      if (error) {
        console.error('Error updating draw winner:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateDrawWinner:', error);
      return false;
    }
  }

  // Mark all users as stale (for daily refresh)
  static async markAllUsersStale(): Promise<boolean> {
    try {
      const adminClient = getAdminSupabaseClient();
      
      const { error } = await adminClient
        .from('users')
        .update({ balance_stale: true })
        .neq('wallet_address', '');

      if (error) {
        console.error('Error marking users stale:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAllUsersStale:', error);
      return false;
    }
  }
}