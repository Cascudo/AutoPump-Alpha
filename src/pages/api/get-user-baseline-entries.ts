// src/pages/api/get-user-baseline-entries.ts - FIXED VERSION
// This fixes the "User not found" error and adds better debugging

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient';

interface BaselineEntriesResponse {
  success: boolean;
  baselineEntries: number;
  vipTier?: string;
  subscriptionActive?: boolean;
  error?: string;
  debug?: any; // Add debugging info
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaselineEntriesResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      baselineEntries: 0,
      error: 'Method not allowed' 
    });
  }

  const { walletAddress } = req.query;

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ 
      success: false, 
      baselineEntries: 0,
      error: 'Wallet address is required' 
    });
  }

  try {
    console.log('🔍 API: Fetching baseline entries for:', walletAddress.slice(0, 8) + '...');

    // 🎯 FIXED QUERY: Handle multiple or no rows properly
    const { data: users, error: userError, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('wallet_address', walletAddress);

    // Debug logging
    console.log('📊 Database query result:', {
      error: userError,
      count,
      usersFound: users?.length || 0,
      walletQueried: walletAddress
    });

    if (userError) {
      console.error('❌ Database error:', userError);
      return res.status(500).json({ 
        success: false, 
        baselineEntries: 0,
        error: 'Database query failed',
        debug: {
          databaseError: userError.message,
          code: userError.code,
          walletSearched: walletAddress
        }
      });
    }

    if (!users || users.length === 0) {
      console.log('ℹ️ No users found for wallet:', walletAddress);
      return res.status(404).json({ 
        success: false, 
        baselineEntries: 0,
        error: 'User not found',
        debug: {
          walletSearched: walletAddress,
          queryCount: count,
          usersFound: 0
        }
      });
    }

    if (users.length > 1) {
      console.warn('⚠️ Multiple users found for wallet:', walletAddress, 'Count:', users.length);
      // Use the most recent one
    }

    // Use first user (or most recent if multiple)
    const user = users[0];

    // Check if subscription is still active
    const subscriptionActive = user.subscription_expiry ? 
      new Date(user.subscription_expiry) > new Date() : false;

    // If subscription expired, baseline entries should be 0
    const baselineEntries = subscriptionActive ? 
      (user.baseline_entries_accumulated || 0) : 0;

    console.log('✅ User found - baseline entries result:', {
      wallet: walletAddress.slice(0, 8) + '...',
      baselineEntries,
      vipTier: user.vip_tier,
      subscriptionActive,
      subscriptionExpiry: user.subscription_expiry
    });

    return res.status(200).json({
      success: true,
      baselineEntries,
      vipTier: user.vip_tier || 'None',
      subscriptionActive,
      debug: {
        userFound: true,
        cachedEntries: user.cached_entries,
        isEligible: user.is_eligible,
        tokenBalance: user.token_balance,
        usdValue: user.usd_value
      }
    });

  } catch (error) {
    console.error('💥 API error in get-user-baseline-entries:', error);
    return res.status(500).json({ 
      success: false, 
      baselineEntries: 0,
      error: 'Internal server error',
      debug: {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        walletSearched: walletAddress
      }
    });
  }
}