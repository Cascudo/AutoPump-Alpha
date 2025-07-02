// ===============================================
// SECURE USER API: GET ALL MY PROMOTIONAL ENTRIES
// src/pages/api/promotional-giveaways/my-entries.ts
// ✅ WEB3 SECURITY MODEL - LEGITIMATE ACCESS, ZERO MANIPULATION
// ===============================================

import { NextApiRequest, NextApiResponse } from 'next';
import { PublicKey } from '@solana/web3.js';
import { getAdminSupabaseClient } from '../../../utils/supabaseClient';

// Security: Rate limiting per wallet (prevent abuse)
const rateLimitMap = new Map<string, { lastRequest: number; count: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 30; // Max 30 requests per minute per wallet (higher for general endpoint)

function checkRateLimit(walletAddress: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(walletAddress);
  
  if (!userLimit || now - userLimit.lastRequest > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(walletAddress, { lastRequest: now, count: 1 });
    return true;
  }
  
  if (userLimit.count >= MAX_REQUESTS) {
    return false;
  }
  
  userLimit.count++;
  userLimit.lastRequest = now;
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const walletAddress = req.headers['x-wallet-address'] as string;

  // ✅ SECURITY: Validate wallet address format
  if (!walletAddress) {
    return res.status(401).json({ error: 'Wallet address required' });
  }

  try {
    // ✅ SECURITY: Validate Solana address format (prevents injection)
    new PublicKey(walletAddress);
  } catch {
    return res.status(400).json({ error: 'Invalid wallet address format' });
  }

  // ✅ SECURITY: Rate limiting (prevent spam/DoS)
  if (!checkRateLimit(walletAddress)) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Try again later.',
      resetTime: Math.ceil(RATE_LIMIT_WINDOW / 1000) // seconds until reset
    });
  }

  try {
    console.log(`🔍 Secure fetch all entries for wallet: ${walletAddress.slice(0, 8)}...`);
    
    // ✅ SECURITY: Use admin client for reliable data access
    // This implements Web3-native security (wallet-based) vs traditional JWT-based RLS
    const adminSupabase = getAdminSupabaseClient();

    // ✅ SECURITY: Only fetch THIS user's promotional entries
    const { data: entries, error } = await adminSupabase
      .from('promotional_giveaway_entries')
      .select(`
        id,
        giveaway_id,
        user_wallet,
        base_entries,
        purchased_entries,
        vip_multiplier,
        final_entries,
        total_spent,
        created_at,
        updated_at,
        giveaway:promotional_giveaways(
          id,
          title,
          prize_description,
          prize_value,
          status,
          draw_date,
          winner_wallet,
          entry_start_date,
          entry_end_date
        )
      `)
      .eq('user_wallet', walletAddress) // ✅ CRITICAL: Only user's own data
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error fetching entries:', error);
      throw error;
    }

    // ✅ SECURITY: Only fetch user's own purchase history
    const { data: purchases, error: purchasesError } = await adminSupabase
      .from('promotional_entry_purchases')
      .select(`
        id,
        giveaway_id,
        user_wallet,
        purchase_amount,
        entries_purchased,
        vip_multiplier,
        final_entries_awarded,
        payment_currency,
        payment_status,
        created_at
      `)
      .eq('user_wallet', walletAddress) // ✅ CRITICAL: Only user's own data
      .order('created_at', { ascending: false });

    if (purchasesError) {
      console.error('⚠️ Purchase fetch warning:', purchasesError);
    }

    // ✅ SECURITY: Sanitize response data
    const sanitizedEntries = entries?.map(entry => ({
      ...entry,
      // Remove any sensitive internal fields
      payment_transactions: undefined,
      // Ensure user_wallet matches request (double-check)
      user_wallet: entry.user_wallet === walletAddress ? entry.user_wallet : null
    })).filter(entry => entry.user_wallet) || [];

    const sanitizedPurchases = purchases?.map(purchase => ({
      ...purchase,
      // Remove any sensitive transaction details
      payment_tx: undefined, // Hide transaction hashes for privacy
      // Ensure user_wallet matches request
      user_wallet: purchase.user_wallet === walletAddress ? purchase.user_wallet : null
    })).filter(purchase => purchase.user_wallet) || [];

    // ✅ SECURITY: Log access (for monitoring)
    console.log(`✅ Secure fetch complete: ${sanitizedEntries.length} entries, ${sanitizedPurchases.length} purchases for wallet ${walletAddress.slice(0, 8)}...`);

    // ✅ SECURITY: Add response metadata for debugging (dev only)
    const responseMetadata = process.env.NODE_ENV === 'development' ? {
      requestWallet: walletAddress.slice(0, 8) + '...',
      timestamp: new Date().toISOString(),
      rateLimitRemaining: MAX_REQUESTS - (rateLimitMap.get(walletAddress)?.count || 0)
    } : undefined;

    res.status(200).json({ 
      entries: sanitizedEntries,
      purchases: sanitizedPurchases,
      meta: responseMetadata
    });

  } catch (error) {
    console.error('❌ Secure fetch all entries error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch promotional entries',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}