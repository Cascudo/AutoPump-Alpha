// src/pages/api/admin/manage-exclusions.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSupabaseClient } from '../../../utils/supabaseClient';
import { isAuthorizedAdmin } from '../../../utils/adminAuth'; // 🔧 FIXED: Use consistent auth

// Predefined exclusions for critical wallets
const SYSTEM_EXCLUDED_WALLETS = [
  {
    address: '8Dibf82AXq5zN44ZwgLGrn22LYvebbiqSBEVBPaffetX',
    reason: 'Dev Wallet',
    type: 'SYSTEM'
  },
  {
    address: 'FKgbiugoUP6rRWvbE1vZeU71sFQKhL7ZGrkQQbr7PPnM',
    reason: 'Bonding Curve AMM',
    type: 'SYSTEM'
  },
  {
    address: '59n9Vmc3V9aSJF4yt3knctHDGbg5BSSDnsEzHRjgDGDb',
    reason: 'Locked Tokens Account',
    type: 'SYSTEM'
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle both GET and POST requests
  if (req.method === 'GET') {
    // GET request for fetching exclusions
    const { adminWallet } = req.query;
    
    if (!adminWallet || !isAuthorizedAdmin(adminWallet as string)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    try {
      const supabase = getAdminSupabaseClient();
      
      // Get all excluded wallets
      const { data: exclusions, error: listError } = await supabase
        .from('users')
        .select(`
          wallet_address,
          token_balance,
          usd_value,
          cached_entries,
          excluded_from_draw,
          exclusion_reason,
          excluded_by,
          excluded_at
        `)
        .eq('excluded_from_draw', true)
        .order('token_balance', { ascending: false });

      if (listError) {
        return res.status(500).json({ error: 'Failed to fetch exclusions', details: listError.message });
      }

      return res.status(200).json({
        success: true,
        exclusions: exclusions || [],
        count: exclusions?.length || 0,
        systemExclusions: SYSTEM_EXCLUDED_WALLETS
      });

    } catch (error) {
      console.error('❌ GET exclusions error:', error);
      return res.status(500).json({ error: 'Failed to fetch exclusions' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, adminWallet, walletAddress, reason } = req.body;

    // 🔧 FIXED: Use consistent admin validation
    if (!adminWallet || !isAuthorizedAdmin(adminWallet)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const supabase = getAdminSupabaseClient();

    if (action === 'exclude') {
      if (!walletAddress || !reason) {
        return res.status(400).json({ error: 'Missing required fields: walletAddress, reason' });
      }

      console.log(`🚫 Admin ${adminWallet.slice(0, 8)}... excluding ${walletAddress.slice(0, 8)}... (${reason})`);
      
      const { error: excludeError } = await supabase
        .from('users')
        .update({
          excluded_from_draw: true,
          exclusion_reason: reason,
          excluded_by: adminWallet,
          excluded_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);

      if (excludeError) {
        console.error('❌ Exclusion failed:', excludeError);
        return res.status(500).json({ error: 'Failed to exclude wallet', details: excludeError.message });
      }

      console.log(`✅ Wallet ${walletAddress.slice(0, 8)}... excluded successfully`);

      return res.status(200).json({
        success: true,
        message: 'Wallet excluded from draws',
        action: 'exclude',
        walletAddress: walletAddress.slice(0, 8) + '...',
        reason,
        excludedBy: adminWallet.slice(0, 8) + '...',
        timestamp: new Date().toISOString()
      });

    } else if (action === 'include') {
      if (!walletAddress) {
        return res.status(400).json({ error: 'Missing required field: walletAddress' });
      }

      // Check if it's a system-excluded wallet
      const isSystemExcluded = SYSTEM_EXCLUDED_WALLETS.some(w => w.address === walletAddress);
      if (isSystemExcluded) {
        return res.status(400).json({ 
          error: 'Cannot include system-excluded wallet',
          details: 'This wallet is permanently excluded for security reasons'
        });
      }

      console.log(`✅ Admin ${adminWallet.slice(0, 8)}... including ${walletAddress.slice(0, 8)}... back in draws`);
      
      const { error: includeError } = await supabase
        .from('users')
        .update({
          excluded_from_draw: false,
          exclusion_reason: null,
          excluded_by: null,
          excluded_at: null
        })
        .eq('wallet_address', walletAddress);

      if (includeError) {
        console.error('❌ Inclusion failed:', includeError);
        return res.status(500).json({ error: 'Failed to include wallet', details: includeError.message });
      }

      console.log(`✅ Wallet ${walletAddress.slice(0, 8)}... included back in draws`);

      return res.status(200).json({
        success: true,
        message: 'Wallet included back in draws',
        action: 'include',
        walletAddress: walletAddress.slice(0, 8) + '...',
        includedBy: adminWallet.slice(0, 8) + '...',
        timestamp: new Date().toISOString()
      });

    } else if (action === 'apply-system-exclusions') {
      console.log('🔄 Applying system exclusions to existing wallets...');
      
      let updatedCount = 0;
      for (const excludedWallet of SYSTEM_EXCLUDED_WALLETS) {
        const { error } = await supabase
          .from('users')
          .update({
            excluded_from_draw: true,
            exclusion_reason: excludedWallet.reason,
            excluded_by: 'SYSTEM',
            excluded_at: new Date().toISOString()
          })
          .eq('wallet_address', excludedWallet.address);

        if (!error) {
          updatedCount++;
          console.log(`✅ System excluded: ${excludedWallet.address.slice(0, 8)}... (${excludedWallet.reason})`);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'System exclusions applied',
        updatedCount,
        systemExclusions: SYSTEM_EXCLUDED_WALLETS.map(w => ({
          wallet: w.address.slice(0, 8) + '...',
          reason: w.reason
        }))
      });

    } else if (action === 'list') {
      // Get all excluded wallets
      const { data: exclusions, error: listError } = await supabase
        .from('users')
        .select(`
          wallet_address,
          token_balance,
          usd_value,
          cached_entries,
          excluded_from_draw,
          exclusion_reason,
          excluded_by,
          excluded_at
        `)
        .eq('excluded_from_draw', true)
        .order('token_balance', { ascending: false });

      if (listError) {
        return res.status(500).json({ error: 'Failed to fetch exclusions', details: listError.message });
      }

      return res.status(200).json({
        success: true,
        exclusions: exclusions || [],
        count: exclusions?.length || 0,
        systemExclusions: SYSTEM_EXCLUDED_WALLETS
      });

    } else if (action === 'top-holders') {
      // Get top holders for admin review
      const { data: topHolders, error: topError } = await supabase
        .from('users')
        .select(`
          wallet_address,
          token_balance,
          usd_value,
          cached_entries,
          is_eligible,
          excluded_from_draw,
          exclusion_reason
        `)
        .order('token_balance', { ascending: false })
        .limit(50);
      if (topError) {
        return res.status(500).json({ error: 'Failed to fetch top holders', details: topError.message });
      }
      return res.status(200).json({
        success: true,
        topHolders: topHolders || [],
        count: topHolders?.length || 0,
        systemExclusions: SYSTEM_EXCLUDED_WALLETS
      });
    } else if (action === 'eligible') {
      // Get ALL eligible wallets for daily draw (no limit - all holders with >$10)
      console.log('🎯 Fetching ALL eligible wallets for daily draw...');
      
      const { data: eligibleWallets, error: eligibleError } = await supabase
        .from('users')
        .select(`
          wallet_address,
          token_balance,
          usd_value,
          cached_entries,
          is_eligible,
          excluded_from_draw,
          vip_tier
        `)
        .eq('is_eligible', true)           // Must be eligible (≥$10 USD)
        .eq('excluded_from_draw', false)   // Must not be excluded
        .gt('cached_entries', 0)           // Must have entries (double-check >$10)
        .order('cached_entries', { ascending: false });
      if (eligibleError) {
        console.error('❌ Error fetching eligible wallets for draw:', eligibleError);
        return res.status(500).json({ 
          error: 'Failed to fetch eligible wallets', 
          details: eligibleError.message 
        });
      }
      console.log(`✅ Found ${eligibleWallets?.length || 0} eligible wallets for daily draw`);
      return res.status(200).json({
        success: true,
        eligibleWallets: eligibleWallets || [],
        count: eligibleWallets?.length || 0,
        action: 'eligible'
      });
    } else {
      return res.status(400).json({ 
        error: 'Invalid action. Use: exclude, include, list, top-holders, eligible, or apply-system-exclusions' 
      });
    }

  } catch (error) {
    console.error('❌ Exclusion management error:', error);
    res.status(500).json({ 
      error: 'Exclusion management failed', 
      details: error.message 
    });
  }
}

// 🎯 WHAT THIS FIXES:
// 1. Uses the same admin authentication as other admin APIs
// 2. Supports both GET and POST requests for the frontend  
// 3. Handles all the exclusion actions consistently
// 4. Provides proper error handling and logging
// 5. Returns consistent response formats