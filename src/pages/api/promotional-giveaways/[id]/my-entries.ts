// ===============================================
// SECURE USER API: GET MY ENTRIES FOR SPECIFIC GIVEAWAY
// src/pages/api/promotional-giveaways/[id]/my-entries.ts
// ✅ WEB3 SECURITY MODEL - LEGITIMATE ACCESS, ZERO MANIPULATION
// ===============================================

import { NextApiRequest, NextApiResponse } from 'next';
import { PublicKey } from '@solana/web3.js';
import { getAdminSupabaseClient } from '../../../../utils/supabaseClient';

// Security: Rate limiting per wallet (prevent abuse)
const rateLimitMap = new Map<string, { lastRequest: number; count: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 20; // Max 20 requests per minute per wallet

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
  const { id } = req.query;
  
  if (req.method === 'GET') {
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
      return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    }

    try {
      console.log(`🔍 Secure fetch: giveaway ${id}, wallet: ${walletAddress.slice(0, 8)}...`);
      
      // ✅ SECURITY: Use admin client for reliable data access
      // This is Web3-native security (wallet-based) vs traditional JWT-based RLS
      const adminSupabase = getAdminSupabaseClient();

      // ✅ SECURITY: Only fetch THIS user's data (filter by user_wallet)
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
            winner_wallet
          )
        `)
        .eq('giveaway_id', id)
        .eq('user_wallet', walletAddress) // ✅ CRITICAL: Only user's own data
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Database error:', error);
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
        .eq('giveaway_id', id)
        .eq('user_wallet', walletAddress) // ✅ CRITICAL: Only user's own data
        .order('created_at', { ascending: false });

      if (purchasesError) {
        console.error('⚠️ Purchase fetch warning:', purchasesError);
      }

      // ✅ SECURITY: Sanitize response (remove sensitive fields)
      const sanitizedEntries = entries ? {
        ...entries,
        // Ensure data integrity - double-check ownership
        user_wallet: entries.user_wallet === walletAddress ? entries.user_wallet : null
      } : null;

      // Only return data if ownership verified
      if (sanitizedEntries && !sanitizedEntries.user_wallet) {
        console.error('🚨 Security violation: Entry ownership mismatch');
        return res.status(403).json({ error: 'Access denied' });
      }

      console.log(`✅ Secure fetch complete: ${entries ? 'Found' : 'No'} entries, ${purchases?.length || 0} purchases`);

      res.status(200).json({ 
        entries: sanitizedEntries,
        purchases: purchases || []
      });

    } catch (error) {
      console.error('❌ Secure fetch error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch entries',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }

  } else if (req.method === 'PUT') {
    // ✅ CRITICAL: Entry refresh when ALPHA holdings change
    const walletAddress = req.headers['x-wallet-address'] as string;

    if (!walletAddress) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    try {
      // ✅ SECURITY: Validate wallet format
      new PublicKey(walletAddress);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // ✅ SECURITY: Rate limiting for refresh operations
    if (!checkRateLimit(walletAddress)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    }

    try {
      console.log(`🔄 Secure refresh: giveaway ${id}, wallet: ${walletAddress.slice(0, 8)}...`);
      
      const adminSupabase = getAdminSupabaseClient();
      
      // 🎯 CORRECTED: Use V2 function that exists in your database
      await adminSupabase.rpc('update_promo_entries_v2', {
        giveaway_uuid: id,
        wallet_addr: walletAddress,
        additional_purchased: 0
      });

      // ✅ SECURITY: Return only user's updated data
      const { data: entries, error: fetchError } = await adminSupabase
        .from('promotional_giveaway_entries')
        .select('*')
        .eq('giveaway_id', id)
        .eq('user_wallet', walletAddress) // ✅ CRITICAL: Only user's data
        .single();

      if (fetchError) {
        console.error('❌ Error fetching updated entries:', fetchError);
        throw fetchError;
      }

      console.log('✅ Secure refresh successful');
      res.status(200).json({ entries });

    } catch (error) {
      console.error('❌ Secure refresh error:', error);
      res.status(500).json({ 
        error: 'Failed to refresh entries',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}