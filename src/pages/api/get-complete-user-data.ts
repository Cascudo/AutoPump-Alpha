// src/pages/api/get-complete-user-data.ts
// UNIFIED API: Gets all user data in one server-side call

import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, getAdminSupabaseClient } from '../../utils/supabaseClient';

interface CompleteUserData {
  // User data
  walletAddress: string;
  tokenBalance: number;
  usdValue: number;
  
  // Membership data
  membershipTier: 'None' | 'Bronze' | 'Silver' | 'Gold';
  isEligible: boolean;
  
  // Entry calculation
  tokenEntries: number;
  vipBaselineEntries: number;
  vipMultiplier: number;
  totalDailyEntries: number;
  
  // VIP subscription
  vipTier: 'None' | 'Silver' | 'Gold' | 'Platinum';
  vipActive: boolean;
  vipExpiresAt: string | null;
  
  // Exclusion status
  excludedFromDraw: boolean;
  exclusionReason: string | null;
}

interface ApiResponse {
  success: boolean;
  data?: CompleteUserData;
  error?: string;
  debug?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  const { walletAddress } = req.query;

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ 
      success: false, 
      error: 'Wallet address is required' 
    });
  }

  try {
    console.log('🔍 Fetching complete user data for:', walletAddress.slice(0, 8) + '...');

    // Use admin client for server-side access (bypasses RLS)
    const adminClient = getAdminSupabaseClient();

    // Single query to get all user data
    const { data: user, error: userError } = await adminClient
      .from('users')
      .select(`
        wallet_address,
        token_balance,
        usd_value,
        cached_entries,
        is_eligible,
        vip_tier,
        baseline_entries_accumulated,
        subscription_expiry,
        excluded_from_draw,
        exclusion_reason,
        created_at,
        updated_at
      `)
      .eq('wallet_address', walletAddress)
      .single();

    if (userError) {
      console.error('❌ User query error:', userError);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        debug: {
          databaseError: userError.message,
          code: userError.code,
          walletSearched: walletAddress
        }
      });
    }

    if (!user) {
      console.log('ℹ️ No user found for wallet:', walletAddress);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        debug: { walletSearched: walletAddress }
      });
    }

    // Get active subscription data
    const { data: subscription, error: subError } = await adminClient
      .from('subscriptions')
      .select('*')
      .eq('user_wallet', walletAddress)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.warn('⚠️ Subscription query error:', subError);
    }

    // Calculate membership tier based on USD value
    const calculateMembershipTier = (usdValue: number) => {
      if (usdValue >= 1000) return 'Gold';
      if (usdValue >= 100) return 'Silver';  
      if (usdValue >= 10) return 'Bronze';
      return 'None';
    };

    // Calculate VIP multiplier
    const getVipMultiplier = (vipTier: string) => {
      switch (vipTier) {
        case 'Silver': return 2;
        case 'Gold': return 3;
        case 'Platinum': return 5;
        default: return 1;
      }
    };

    // Calculate entry breakdown
    const tokenEntries = Math.floor((user.usd_value || 0) / 10);
    const vipBaselineEntries = user.baseline_entries_accumulated || 0;
    const vipMultiplier = getVipMultiplier(user.vip_tier);
    const totalDailyEntries = (tokenEntries + vipBaselineEntries) * vipMultiplier;

    // Check if subscription is active
    const vipActive = subscription ? new Date(subscription.end_date) > new Date() : false;
    const vipExpiresAt = subscription?.end_date || null;

    // Eligibility: Either has token entries OR VIP baseline entries
    const isEligible = tokenEntries > 0 || (vipBaselineEntries > 0 && vipActive);

    const completeUserData: CompleteUserData = {
      walletAddress: user.wallet_address,
      tokenBalance: user.token_balance || 0,
      usdValue: user.usd_value || 0,
      
      membershipTier: calculateMembershipTier(user.usd_value || 0),
      isEligible,
      
      tokenEntries,
      vipBaselineEntries,
      vipMultiplier,
      totalDailyEntries,
      
      vipTier: user.vip_tier || 'None',
      vipActive,
      vipExpiresAt,
      
      excludedFromDraw: user.excluded_from_draw || false,
      exclusionReason: user.exclusion_reason || null
    };

    console.log('✅ Complete user data calculated:', {
      wallet: walletAddress.slice(0, 8) + '...',
      tokenEntries,
      vipBaselineEntries,
      vipMultiplier,
      totalDailyEntries,
      vipTier: user.vip_tier,
      vipActive,
      isEligible
    });

    return res.status(200).json({
      success: true,
      data: completeUserData
    });

  } catch (error) {
    console.error('💥 Complete user data API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      debug: {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}