// src/pages/api/update-user-balance.ts - ENHANCED WITH PROMOTIONAL ENTRY UPDATES
// Key Fix: Include VIP baseline entries in final calculation + Update promotional entries

import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getAdminSupabaseClient } from '../../utils/supabaseClient';
import { MarketDataService } from '../../utils/marketDataService';

// Constants
const ALPHA_MINT = new PublicKey('4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump');
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

// Rate limiting storage (per wallet)
const rateLimitMap = new Map<string, number>();

// 🎯 NEW: Promotional entry update result tracking
interface PromotionalUpdateResult {
  success: boolean;
  giveawaysUpdated: number;
  errors: string[];
  needsRetry: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      walletAddress, 
      tokenBalance, 
      usdValue, 
      tokenPriceUSD,
      vipMultiplier = 1,
      baselineEntries = 0, // CORRECTED: This is VIP baseline entries from database
      forceUpdate = false 
    } = req.body;

    console.log('🔍 Processing ENHANCED balance update:', {
      wallet: walletAddress?.slice(0, 8) + '...' || 'undefined',
      tokenBalance: tokenBalance,
      usdValue: usdValue?.toFixed(2),
      vipMultiplier: vipMultiplier,
      vipBaselineEntries: baselineEntries, // CORRECTED: This is VIP baseline from DB
      forceUpdate: forceUpdate
    });

    // Basic validation
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    if (typeof tokenBalance !== 'number' || tokenBalance < 0) {
      return res.status(400).json({ error: 'Invalid token balance' });
    }

    if (typeof usdValue !== 'number' || usdValue < 0) {
      return res.status(400).json({ error: 'Invalid USD value' });
    }

    if (typeof vipMultiplier !== 'number' || vipMultiplier < 1 || vipMultiplier > 10) {
      return res.status(400).json({ error: 'Invalid VIP multiplier' });
    }

    // Rate limiting check (respects same limits for all updates)
    const now = Date.now();
    const lastUpdate = rateLimitMap.get(walletAddress);
    const rateLimitWindow = 30000; // 30 seconds

    if (!forceUpdate && lastUpdate && (now - lastUpdate) < rateLimitWindow) {
      const timeLeft = Math.ceil((rateLimitWindow - (now - lastUpdate)) / 1000);
      return res.status(429).json({ 
        error: `Rate limited. Please wait ${timeLeft} seconds before updating again.`,
        rateLimited: true,
        timeLeft: timeLeft
      });
    }

    // Initialize Supabase client
    const supabase = getAdminSupabaseClient();

    // CORRECTED CALCULATION LOGIC (preserves existing logic)
    // 1. Calculate token baseline entries from USD value
    const tokenBaselineEntries = Math.floor(usdValue / 10);

    // 2. Get VIP baseline entries (passed from frontend - this is baseline_entries_accumulated from DB)
    const vipBaselineEntries = baselineEntries; // This comes from database baseline_entries_accumulated
    
    // 3. Total base entries = token baseline + VIP baseline
    const totalBaseEntries = tokenBaselineEntries + vipBaselineEntries;
    
    // 4. Apply VIP multiplier to get final entries for database
    const cachedEntries = totalBaseEntries * vipMultiplier;
    
    // 5. Calculate eligibility: Either token entries OR VIP entries
    const hasTokenEntries = tokenBaselineEntries > 0;
    const hasVipEntries = vipBaselineEntries > 0;
    const isEligible = hasTokenEntries || hasVipEntries;

    console.log('🔧 ENHANCED entry calculation:', {
      tokenBaselineEntries: tokenBaselineEntries, // From token holdings ÷ $10
      vipBaselineEntries: vipBaselineEntries, // From database baseline_entries_accumulated
      totalBaseEntries: totalBaseEntries, // Sum of both
      vipMultiplier: vipMultiplier, // VIP tier multiplier
      cachedEntries: cachedEntries, // Final result for database
      isEligible: isEligible,
      formula: `(${tokenBaselineEntries} + ${vipBaselineEntries}) × ${vipMultiplier} = ${cachedEntries}`
    });

    // Final bounds check
    if (cachedEntries > 50000) {
      return res.status(400).json({ 
        error: 'Calculated entries exceed maximum allowed (50,000)' 
      });
    }

    // Determine optimization flags
    const skipBlockchainUpdates = tokenBalance === 0 && vipMultiplier === 1;
    const priorityUpdate = usdValue > 1000;

    console.log('💾 Storing ENHANCED data in database:', {
      wallet: walletAddress.slice(0, 8) + '...',
      tokenBalance: tokenBalance.toFixed(2),
      usdValue: usdValue.toFixed(2),
      tokenBaselineEntries: tokenBaselineEntries,
      vipBaselineEntries: vipBaselineEntries,
      vipMultiplier: vipMultiplier,
      finalCachedEntries: cachedEntries,
      isEligible: isEligible
    });

    // MAIN USER UPDATE (preserves all existing logic)
    const { data: updatedUser, error } = await supabase
      .from('users')
      .upsert({
        wallet_address: walletAddress,
        token_balance: tokenBalance,
        usd_value: usdValue,
        cached_entries: cachedEntries, // CORRECTED: Now includes VIP baseline entries
        is_eligible: isEligible, // CORRECTED: Now considers VIP users
        last_balance_check: new Date().toISOString(),
        balance_stale: false,
        skip_blockchain_updates: skipBlockchainUpdates,
        priority_update: priorityUpdate
      })
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      return res.status(500).json({ error: 'Database update failed' });
    }

    // Update balance cache with corrected values (preserves existing logic)
    await supabase
      .from('balance_cache')
      .upsert({
        wallet: walletAddress,
        token_balance: tokenBalance,
        usd_value: usdValue,
        last_updated: new Date().toISOString(),
        entries_calculated: cachedEntries, // CORRECTED: Now includes VIP baseline
        needs_refresh: false,
        is_eligible: isEligible // CORRECTED: Now considers VIP users
      });

    // 🎯 EXISTING SYSTEM: UPDATE PROMOTIONAL ENTRIES (matches documentation pattern)
    const promotionalResult = await updatePromotionalEntries(walletAddress, supabase);

    // Update rate limiting (preserves existing logic)
    rateLimitMap.set(walletAddress, Date.now());

    console.log('✅ ENHANCED UPDATE COMPLETE - Main balance + promotional entries updated');

    // Return success with enhanced data including promotional status
    res.status(200).json({
      success: true,
      validated: true,
      enhanced: true, // Indicator that promotional entries are also updated
      data: {
        tokenBalance,
        usdValue,
        tokenBaselineEntries, // From token holdings
        vipBaselineEntries, // From VIP subscription (database)
        vipMultiplier,
        totalDailyEntries: cachedEntries, // Final result stored in database
        isEligible,
        lastUpdated: new Date().toISOString(),
        rateLimited: false,
        calculation: {
          formula: `(${tokenBaselineEntries} + ${vipBaselineEntries}) × ${vipMultiplier} = ${cachedEntries}`,
          breakdown: {
            tokenEntries: tokenBaselineEntries,
            vipEntries: vipBaselineEntries,
            multiplier: vipMultiplier,
            total: cachedEntries
          }
        },
        // 🎯 NEW: Promotional update status
        promotionalEntries: {
          updateSuccess: promotionalResult.success,
          giveawaysUpdated: promotionalResult.giveawaysUpdated,
          needsRetry: promotionalResult.needsRetry,
          retryAfter: promotionalResult.needsRetry ? 30 : null // 30 seconds retry interval
        }
      }
    });

  } catch (error) {
    console.error('ENHANCED API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 🎯 EXISTING SYSTEM: Individual promotional entry refresh (documented pattern)
// This matches the manual trigger system already in place: update_promo_entries_v2
async function updatePromotionalEntries(
  walletAddress: string, 
  supabase: any
): Promise<PromotionalUpdateResult> {
  const result: PromotionalUpdateResult = {
    success: true,
    giveawaysUpdated: 0,
    errors: [],
    needsRetry: false
  };

  try {
    console.log('🎮 Refreshing promotional entries using existing system:', walletAddress.slice(0, 8) + '...');

    // Get all active promotional giveaways (matches batch sync pattern)
    const { data: activeGiveaways, error: giveawayError } = await supabase
      .from('promotional_giveaways')
      .select('id, title, status')
      .in('status', ['active', 'upcoming'])
      .order('created_at', { ascending: false });

    if (giveawayError) {
      console.error('❌ Error fetching active giveaways:', giveawayError);
      result.success = false;
      result.errors.push(`Failed to fetch giveaways: ${giveawayError.message}`);
      result.needsRetry = true;
      return result;
    }

    if (!activeGiveaways || activeGiveaways.length === 0) {
      console.log('ℹ️ No active promotional giveaways found - skipping promotional updates');
      return result; // Success with 0 updates
    }

    console.log(`🎯 Found ${activeGiveaways.length} active giveaways to update`);

    // Update entries for each active giveaway using EXISTING V2 function
    for (const giveaway of activeGiveaways) {
      try {
        console.log(`  📝 Updating entries for: ${giveaway.title} (${giveaway.id.slice(0, 8)}...)`);

        // Use the V2 function (confirmed exists in database)
        const { error: updateError } = await supabase.rpc('update_promo_entries_v2', {
          giveaway_uuid: giveaway.id,
          wallet_addr: walletAddress,
          additional_purchased: 0 // No additional purchased entries, just refresh base calculation
        });

        if (updateError) {
          console.error(`  ❌ Failed to update giveaway ${giveaway.id}:`, updateError);
          result.errors.push(`Giveaway ${giveaway.title}: ${updateError.message}`);
          result.needsRetry = true;
        } else {
          console.log(`  ✅ Successfully updated: ${giveaway.title}`);
          result.giveawaysUpdated++;
        }

      } catch (giveawayUpdateError) {
        console.error(`  💥 Exception updating giveaway ${giveaway.id}:`, giveawayUpdateError);
        result.errors.push(`Giveaway ${giveaway.title}: ${giveawayUpdateError instanceof Error ? giveawayUpdateError.message : 'Unknown error'}`);
        result.needsRetry = true;
      }
    }

    // Determine overall success
    if (result.errors.length > 0) {
      result.success = false;
      console.log(`⚠️ Promotional updates completed with ${result.errors.length} errors`);
    } else {
      console.log(`✅ All promotional entries updated successfully (${result.giveawaysUpdated} giveaways)`);
    }

  } catch (error) {
    console.error('💥 Critical error in updatePromotionalEntries:', error);
    result.success = false;
    result.errors.push(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.needsRetry = true;
  }

  return result;
}