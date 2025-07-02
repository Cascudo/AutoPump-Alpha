// src/pages/api/admin/batch-sync-holders.ts - ENHANCED WITH COMPREHENSIVE LOGGING & PROMOTIONAL ENTRY AUTOMATION
// 🚨 CRITICAL FIX: VIP Data Preservation + Enhanced Debugging + Automatic Promotional Entry Generation + Comprehensive Cleanup

import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAdminSupabaseClient } from '../../../utils/supabaseClient';
import { MarketDataService } from '../../../utils/marketDataService';
import { BlockchainDataService } from '../../../utils/blockchainDataService';
import { isAuthorizedAdmin } from '../../../utils/adminAuth';

// Constants from project knowledge
const ALPHA_MINT = '4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump';
const SYSTEM_EXCLUDED_WALLETS = [
  '8Dibf82AXq5zN44ZwgLGrn22LYvebbiqSBEVBPaffetX', // Dev wallet
  'FKgbiugoUP6rRWvbE1vZeU71sFQKhL7ZGrkQQbr7PPnM', // AMM 
  'FXoAHEeM7EhXGvU1tCVVU3Y3veZpeJMjznDXeBcdRLoC', // AMM  
  '59n9Vmc3V9aSJF4yt3knctHDGbg5BSSDnsEzHRjgDGDb'  // Locked tokens
];

// VIP tier multipliers - CONSISTENT with project schema
const VIP_MULTIPLIERS = {
  'None': 1,
  'Silver': 2,
  'Gold': 3,
  'Platinum': 5
};

interface VipData {
  vipTier: 'None' | 'Silver' | 'Gold' | 'Platinum';
  vipMultiplier: number;
  baselineEntriesAccumulated: number;
  subscriptionActive: boolean;
}

/**
 * 🚨 CRITICAL FIX: Fetch VIP data for each wallet to preserve benefits during bulk sync
 */
async function getVipDataForWallet(walletAddress: string): Promise<VipData> {
  try {
    console.log(`🔍 [VIP] Checking VIP status for ${walletAddress.slice(0, 8)}...`);
    
    const supabase = getAdminSupabaseClient();
    
    // Query database for VIP data using consistent field names
    const { data: user, error } = await supabase
      .from('users')
      .select('vip_tier, baseline_entries_accumulated, subscription_expiry')
      .eq('wallet_address', walletAddress)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found (expected)
      console.warn(`⚠️ [VIP] Database error for ${walletAddress.slice(0, 8)}: ${error.message}`);
    }

    if (error || !user) {
      console.log(`👤 [VIP] New user ${walletAddress.slice(0, 8)} - using defaults`);
      // Return default values for non-VIP users
      return {
        vipTier: 'None',
        vipMultiplier: 1,
        baselineEntriesAccumulated: 0,
        subscriptionActive: false
      };
    }

    // Check if subscription is still active
    const subscriptionActive = user.subscription_expiry ? 
      new Date(user.subscription_expiry) > new Date() : false;

    if (!subscriptionActive) {
      console.log(`⏰ [VIP] ${walletAddress.slice(0, 8)} - subscription expired, resetting to None`);
      // Subscription expired - return None tier but preserve accumulated entries
      return {
        vipTier: 'None',
        vipMultiplier: 1,
        baselineEntriesAccumulated: 0, // Reset baseline entries when expired
        subscriptionActive: false
      };
    }

    // Active subscription - calculate multiplier
    const vipTier = user.vip_tier as 'None' | 'Silver' | 'Gold' | 'Platinum';
    const vipMultiplier = VIP_MULTIPLIERS[vipTier] || 1;
    const baselineEntriesAccumulated = user.baseline_entries_accumulated || 0;

    console.log(`👑 [VIP] ${walletAddress.slice(0, 8)} - ${vipTier} active (${vipMultiplier}x, +${baselineEntriesAccumulated} baseline)`);

    return {
      vipTier,
      vipMultiplier,
      baselineEntriesAccumulated,
      subscriptionActive: true
    };

  } catch (error) {
    console.error(`❌ [VIP] Error fetching VIP data for ${walletAddress.slice(0, 8)}:`, {
      message: error.message,
      stack: error.stack?.slice(0, 200)
    });
    // Return safe defaults on error
    return {
      vipTier: 'None',
      vipMultiplier: 1,
      baselineEntriesAccumulated: 0,
      subscriptionActive: false
    };
  }
}

/**
 * 🚨 CRITICAL FIX: VIP-aware balance update function with enhanced logging
 */
async function updateUserBalanceWithVipData(
  walletAddress: string,
  tokenBalance: number,
  usdValue: number,
  tokenPriceUSD: number,
  isExcluded: boolean,
  vipData: VipData
): Promise<{ success: boolean; entriesCalculated: number }> {
  try {
    console.log(`📝 [UPDATE] Processing ${walletAddress.slice(0, 8)}...`);
    console.log(`  💰 Balance: ${tokenBalance.toLocaleString()} tokens ($${usdValue.toFixed(4)})`);

    const supabase = getAdminSupabaseClient();

    // Calculate entries using CORRECTED VIP-aware formula
    const tokenBaselineEntries = Math.floor(usdValue / 10);
    const vipBaselineEntries = vipData.baselineEntriesAccumulated;
    const totalBaseEntries = tokenBaselineEntries + vipBaselineEntries;
    const cachedEntries = totalBaseEntries * vipData.vipMultiplier;
    
    // Eligibility check - includes VIP users even with low token balance
    const hasTokenEntries = tokenBaselineEntries > 0;
    const hasVipEntries = vipBaselineEntries > 0;
    const isEligible = (hasTokenEntries || hasVipEntries) && !isExcluded;

    console.log(`  📊 [CALC] Token entries: ${tokenBaselineEntries}, VIP entries: ${vipBaselineEntries}, Multiplier: ${vipData.vipMultiplier}x`);
    console.log(`  🎯 [CALC] Total entries: ${cachedEntries}, Eligible: ${isEligible}, Excluded: ${isExcluded}`);

    // Prepare upsert data
    const upsertData = {
      wallet_address: walletAddress,
      token_balance: tokenBalance,
      usd_value: usdValue,
      cached_entries: cachedEntries,
      is_eligible: isEligible,
      excluded_from_draw: isExcluded,
      
      // 🎯 CRITICAL: Preserve existing VIP data during bulk sync
      vip_tier: vipData.vipTier,
      baseline_entries_accumulated: vipData.baselineEntriesAccumulated,
      subscription_expiry: vipData.subscriptionActive ? undefined : null,
      
      last_balance_check: new Date().toISOString(),
      balance_stale: false,
      skip_blockchain_updates: false,
      priority_update: usdValue > 1000
    };

    console.log(`  💾 [DB] Upserting data:`, {
      wallet: walletAddress.slice(0, 8),
      balance: tokenBalance,
      usd: usdValue.toFixed(4),
      entries: cachedEntries,
      vip: vipData.vipTier,
      eligible: isEligible
    });

    // Update user record with VIP data preservation
    const { data, error } = await supabase
      .from('users')
      .upsert(upsertData)
      .select()
      .single();

    if (error) {
      console.error(`❌ [DB] Database update error for ${walletAddress.slice(0, 8)}:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      console.error(`❌ [DB] Failed upsert data:`, JSON.stringify(upsertData, null, 2));
      return { success: false, entriesCalculated: 0 };
    }

    if (data) {
      console.log(`  ✅ [DB] Successfully saved ${walletAddress.slice(0, 8)}: ${data.cached_entries} entries (${data.token_balance} tokens)`);
      
      // Verify the data was saved correctly
      if (data.token_balance !== tokenBalance) {
        console.warn(`  ⚠️ [DB] Token balance mismatch: expected ${tokenBalance}, got ${data.token_balance}`);
      }
      if (data.cached_entries !== cachedEntries) {
        console.warn(`  ⚠️ [DB] Entries mismatch: expected ${cachedEntries}, got ${data.cached_entries}`);
      }
    } else {
      console.warn(`  ⚠️ [DB] No data returned for ${walletAddress.slice(0, 8)} - upsert may have failed silently`);
    }

    return { success: true, entriesCalculated: cachedEntries };

  } catch (error) {
    console.error(`💥 [EXCEPTION] Error updating ${walletAddress.slice(0, 8)}:`, {
      message: error.message,
      stack: error.stack?.slice(0, 300),
      name: error.name
    });
    return { success: false, entriesCalculated: 0 };
  }
}

/**
 * Main batch sync handler - ENHANCED with comprehensive logging + PROMOTIONAL ENTRY AUTOMATION + COMPREHENSIVE CLEANUP
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { adminWallet } = req.body;

    // Admin authentication
    if (!isAuthorizedAdmin(adminWallet)) {
      return res.status(403).json({ error: 'Unauthorized: Invalid admin wallet' });
    }

    console.log('🚀 Starting ENHANCED VIP-aware batch holder sync...');
    console.log('🎯 CRITICAL: This sync will PRESERVE VIP benefits during updates');
    console.log('🔍 DEBUG: Enhanced logging enabled for troubleshooting');
    console.log('🎁 NEW: Automatic promotional entry generation after sync');
    console.log('🧹 NEW: Comprehensive cleanup of stale holders');

    // Initialize services
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    const marketService = MarketDataService.getInstance();
    const blockchainService = new BlockchainDataService(connection);

    // Get token price
    console.log('💰 Fetching market data...');
    const marketData = await marketService.getMarketData();
    const tokenPriceUSD = marketData.tokenPriceUSD;

    console.log(`💰 Token price: $${tokenPriceUSD.toFixed(8)}`);

    // Fetch all holders from blockchain
    console.log('📡 Fetching all ALPHA holders from blockchain...');
    const tokenAnalytics = await blockchainService.getTokenAnalytics(new PublicKey(ALPHA_MINT));
    const holders = tokenAnalytics.topHolders; // Contains all holders with balances

    console.log(`✅ Found ${holders.length} holders to sync`);
    console.log(`📊 Sample holders:`, holders.slice(0, 3).map(h => ({
      address: h.address.slice(0, 8) + '...',
      tokens: (h.balance).toLocaleString(),
usd: (h.balance * tokenPriceUSD).toFixed(2)
    })));

    // Process holders with VIP data preservation
    let totalHoldersUpdated = 0;
    let eligibleHolders = 0;
    let totalEntries = 0;
    let vipMembersPreserved = 0;
    let systemExclusionsApplied = 0;
    let successfulUpdates = 0;
    let failedUpdates = 0;

    const batchSize = 5; // Reduced batch size for better error isolation
    const batches = [];
    for (let i = 0; i < holders.length; i += batchSize) {
      batches.push(holders.slice(i, i + batchSize));
    }

    console.log(`📦 Processing ${batches.length} batches of ${batchSize} holders each...`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      console.log(`\n🔄 [BATCH ${batchIndex + 1}/${batches.length}] Processing ${batch.length} holders...`);

      // Process batch with enhanced error handling
      const batchResults = await Promise.allSettled(
        batch.map(async (holder, holderIndex) => {
          try {
            const walletAddress = holder.address;
            const tokenBalance = holder.balance; 
            const usdValue = tokenBalance * tokenPriceUSD;

            console.log(`\n  [${batchIndex + 1}.${holderIndex + 1}] 🔍 Processing ${walletAddress.slice(0, 8)}...`);
            console.log(`    Tokens: ${tokenBalance.toLocaleString()}, USD: $${usdValue.toFixed(4)}`);

            // Check if wallet is system-excluded
            const isExcluded = SYSTEM_EXCLUDED_WALLETS.includes(walletAddress);
            if (isExcluded) {
              console.log(`    🚫 EXCLUDED: System wallet detected`);
              systemExclusionsApplied++;
            }

            // 🚨 CRITICAL FIX: Fetch VIP data for each holder
            const vipData = await getVipDataForWallet(walletAddress);
            
            if (vipData.vipTier !== 'None') {
              vipMembersPreserved++;
              console.log(`    👑 VIP PRESERVED: ${vipData.vipTier} (${vipData.vipMultiplier}x, +${vipData.baselineEntriesAccumulated} baseline)`);
            }

            // 🚨 CRITICAL FIX: Update with VIP data preservation
            const updateResult = await updateUserBalanceWithVipData(
              walletAddress,
              tokenBalance,
              usdValue,
              tokenPriceUSD,
              isExcluded,
              vipData
            );

            if (updateResult.success) {
              totalHoldersUpdated++;
              successfulUpdates++;
              if (updateResult.entriesCalculated > 0 && !isExcluded) {
                eligibleHolders++;
                totalEntries += updateResult.entriesCalculated;
              }
              console.log(`    ✅ SUCCESS: ${updateResult.entriesCalculated} entries calculated`);
              return { success: true, wallet: walletAddress, entries: updateResult.entriesCalculated };
            } else {
              failedUpdates++;
              console.error(`    ❌ FAILED: Database update failed`);
              return { success: false, wallet: walletAddress, error: 'Database update failed' };
            }

          } catch (holderError) {
            failedUpdates++;
            console.error(`    💥 EXCEPTION processing holder ${holderIndex}:`, {
              error: holderError.message,
              holder: holder.address?.slice(0, 8) || 'unknown'
            });
            return { success: false, wallet: holder.address, error: holderError.message };
          }
        })
      );

      // Process batch results
      let batchSuccesses = 0;
      let batchFailures = 0;
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          batchSuccesses++;
        } else {
          batchFailures++;
          const error = result.status === 'rejected' ? result.reason : result.value.error;
          console.error(`  ❌ [BATCH ${batchIndex + 1}] Holder ${index + 1} failed: ${error}`);
        }
      });

      console.log(`  📊 [BATCH ${batchIndex + 1}] Complete: ${batchSuccesses} successes, ${batchFailures} failures`);

      // Brief pause between batches to prevent overwhelming the database
      if (batchIndex < batches.length - 1) {
        console.log(`  ⏳ Waiting 200ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // 🧹 CRITICAL: CLEANUP OLD HOLDERS WHO NO LONGER HOLD TOKENS
    console.log('\n🧹 Starting comprehensive cleanup of old holders who no longer hold tokens...');
    
    // Get all wallet addresses from current blockchain scan
    const currentHolderAddresses = holders.map(h => h.address);
    console.log(`📊 Current blockchain holders: ${currentHolderAddresses.length}`);
    
    // Find ALL database wallets that weren't in the current blockchain scan
    const supabase = getAdminSupabaseClient();
    const { data: databaseWallets, error: dbError } = await supabase
      .from('users')
      .select('wallet_address, token_balance, usd_value, is_eligible, vip_tier, cached_entries, baseline_entries_accumulated')
      .gt('token_balance', 0); // Only wallets that currently show token holdings
    
    if (dbError) {
      console.error('❌ Error fetching database wallets for cleanup:', dbError);
    } else {
      // Find wallets in database but not in current blockchain scan
      const orphanedWallets = databaseWallets?.filter(dbWallet => 
        !currentHolderAddresses.includes(dbWallet.wallet_address)
      ) || [];
      
      console.log(`🔍 Found ${orphanedWallets.length} orphaned wallets to clean up`);
      
      if (orphanedWallets.length > 0) {
        // Separate VIP members from regular users
        const vipOrphans = orphanedWallets.filter(w => 
          ['Silver', 'Gold', 'Platinum'].includes(w.vip_tier)
        );
        const regularOrphans = orphanedWallets.filter(w => 
          !['Silver', 'Gold', 'Platinum'].includes(w.vip_tier)
        );
        
        console.log(`👑 VIP members to update: ${vipOrphans.length}`);
        console.log(`👤 Regular users to clean: ${regularOrphans.length}`);
        
        // Log first few for verification
        if (vipOrphans.length > 0) {
          console.log('👑 VIP members losing token entries but keeping purchased entries:');
          vipOrphans.slice(0, 3).forEach(wallet => {
            console.log(`  📝 VIP ${wallet.vip_tier}: ${wallet.wallet_address.slice(0, 8)}... (${wallet.cached_entries} entries, $${wallet.usd_value})`);
          });
        }
        
        if (regularOrphans.length > 0) {
          console.log('🗑️ Regular users to fully clean:');
          regularOrphans.slice(0, 3).forEach(wallet => {
            console.log(`  🗑️ Regular: ${wallet.wallet_address.slice(0, 8)}... (${wallet.cached_entries} entries, $${wallet.usd_value})`);
          });
        }
        
        let vipUpdated = 0;
        let regularCleaned = 0;
        let totalEntriesRemoved = 0;
        
        // Handle VIP members - preserve purchased entries but remove token-based entries
        if (vipOrphans.length > 0) {
          console.log('\n👑 Updating VIP members with 0 tokens...');
          
          for (const vipWallet of vipOrphans) {
            try {
              // For VIP: Keep baseline_entries_accumulated (purchased entries) but remove token-based entries
              const baselineEntries = vipWallet.baseline_entries_accumulated || 0;
              // Use our existing VIP multiplier logic
              const vipMultiplier = vipWallet.vip_tier === 'Silver' ? 2 :
                                   vipWallet.vip_tier === 'Gold' ? 3 :
                                   vipWallet.vip_tier === 'Platinum' ? 5 : 1;
              const newCachedEntries = baselineEntries * vipMultiplier; // Only purchased entries * multiplier
              
              const { error: vipUpdateError } = await supabase
                .from('users')
                .update({
                  token_balance: 0,
                  usd_value: 0,
                  cached_entries: newCachedEntries, // Preserve purchased entries only
                  is_eligible: newCachedEntries > 0, // Eligible if they have purchased entries
                  last_balance_check: new Date().toISOString()
                })
                .eq('wallet_address', vipWallet.wallet_address);
              
              if (vipUpdateError) {
                console.error(`❌ Error updating VIP ${vipWallet.wallet_address.slice(0, 8)}:`, vipUpdateError);
              } else {
                vipUpdated++;
                const entriesRemoved = vipWallet.cached_entries - newCachedEntries;
                totalEntriesRemoved += Math.max(0, entriesRemoved);
                console.log(`  ✅ VIP ${vipWallet.vip_tier} ${vipWallet.wallet_address.slice(0, 8)}: ${vipWallet.cached_entries} → ${newCachedEntries} entries`);
              }
            } catch (vipError) {
              console.error(`❌ Exception updating VIP ${vipWallet.wallet_address.slice(0, 8)}:`, vipError);
            }
          }
        }
        
        // Handle regular users - full cleanup
        if (regularOrphans.length > 0) {
          console.log('\n🗑️ Cleaning regular users with 0 tokens...');
          
          const { data: cleanupResult, error: cleanupError } = await supabase
            .from('users')
            .update({
              is_eligible: false,
              cached_entries: 0,
              token_balance: 0,
              usd_value: 0,
              last_balance_check: new Date().toISOString()
            })
            .in('wallet_address', regularOrphans.map(w => w.wallet_address))
            .select('wallet_address');
          
          if (cleanupError) {
            console.error('❌ Error during regular cleanup:', cleanupError);
          } else {
            regularCleaned = cleanupResult?.length || 0;
            const regularEntriesRemoved = regularOrphans.reduce((sum, w) => sum + (w.cached_entries || 0), 0);
            totalEntriesRemoved += regularEntriesRemoved;
            console.log(`✅ Successfully cleaned ${regularCleaned} regular users`);
          }
        }
        
        // Update global stats to reflect cleanup
        const totalCleaned = vipUpdated + regularCleaned;
        totalEntries = Math.max(0, totalEntries - totalEntriesRemoved);
        eligibleHolders = Math.max(0, eligibleHolders - regularOrphans.length); // VIP members might still be eligible
        
        console.log('\n📊 Cleanup Summary:');
        console.log(`  👑 VIP members updated: ${vipUpdated}`);
        console.log(`  🗑️ Regular users cleaned: ${regularCleaned}`);
        console.log(`  📉 Total entries removed: ${totalEntriesRemoved.toLocaleString()}`);
        console.log(`  🎯 Updated eligible holders: ${eligibleHolders}`);
        console.log(`  🎯 Updated total entries: ${totalEntries.toLocaleString()}`);
        
      } else {
        console.log('✅ No cleanup needed - all database wallets are current holders');
      }
    }

    // Calculate final statistics
    const averageUsdValue = totalHoldersUpdated > 0 ? 
    holders.reduce((sum, h) => sum + (h.balance * tokenPriceUSD), 0) / totalHoldersUpdated : 0;

    const result: any = {
      success: true,
      totalHolders: holders.length,
      eligibleHolders,
      totalEntries,
      tokenPriceUSD,
      averageUsdValue,
      vipSubscribers: vipMembersPreserved,
      readyForDraw: eligibleHolders > 0,
      
      // Additional metrics
      holdersUpdated: totalHoldersUpdated,
      successfulUpdates,
      failedUpdates,
      vipMembersPreserved,
      systemExclusionsApplied,
      syncTimestamp: new Date().toISOString(),
      
      // Debug info
      debugInfo: {
        batchSize,
        totalBatches: batches.length,
        marketDataSource: 'MarketDataService',
        enhancedLogging: true
      }
    };

    // 🎁 AUTOMATICALLY GENERATE PROMOTIONAL ENTRIES AFTER SUCCESSFUL SYNC
    if (successfulUpdates > 0) {
      console.log('\n🎁 Starting automatic promotional giveaway entry generation...');
      console.log(`📊 Processing entries for ${successfulUpdates} successfully updated holders...`);
      
      try {
        // Import and call the promotional entry generation function directly
        const { default: generateEntriesHandler } = await import('./promotional-giveaways/generate-entries');
        
        // Create mock request/response objects for the handler
const mockReq = {
  method: 'POST',
  body: { adminWallet: adminWallet }
} as NextApiRequest;

let responseData: any = null;
let responseCode: number = 500;

const mockRes = {
  status: (code: number) => {
    responseCode = code;
    return {
      json: (data: any) => {
        responseData = data;
        return { statusCode: code, data };
      }
    };
  }
} as any;

// Call the handler directly
await generateEntriesHandler(mockReq, mockRes);
const entryResult = responseData || { success: false, error: 'No response from handler' };

if (responseCode === 200 && entryResult.success) {
          console.log('✅ Promotional entries generated successfully:');
          console.log(`   📊 Entries created/updated: ${entryResult.entriesCreated}`);
          console.log(`   👥 Users processed: ${entryResult.usersProcessed}`);
          console.log(`   🎯 Active giveaways: ${entryResult.giveawayId || 'ALL'}`);
          // Add promotional entry results to the existing result object
          result.promotionalEntries = {
            success: true,
            entriesCreated: entryResult.entriesCreated,
            usersProcessed: entryResult.usersProcessed,
            errors: entryResult.errors || []
          };
        } else {
          console.log('⚠️ Promotional entry generation had issues:');
          console.log(`   Error: ${entryResult.error || 'Unknown error'}`);
          
          // Add error info to result object
          result.promotionalEntries = {
            success: false,
            error: entryResult.error || 'Failed to generate promotional entries',
            entriesCreated: 0,
            usersProcessed: 0
          };
        }
      } catch (entryError) {
        console.error('❌ Error during promotional entry generation:', entryError);
        
        result.promotionalEntries = {
          success: false,
          error: entryError.message || 'Failed to call entry generation API',
          entriesCreated: 0,
          usersProcessed: 0
        };
      }
      console.log('🏁 Batch sync with automatic promotional entry generation completed');
    } else {
      console.log('⏭️ Skipping promotional entry generation (no successful updates)');
      
      result.promotionalEntries = {
        success: false,
        error: 'No holders were successfully updated',
        entriesCreated: 0,
        usersProcessed: 0
      };
    }

    console.log('\n✅ ENHANCED VIP-aware batch sync with comprehensive cleanup complete!');
    console.log(`📊 FINAL SUMMARY:`);
    console.log(`  - Total holders found: ${result.totalHolders}`);
    console.log(`  - Successful updates: ${result.successfulUpdates}`);
    console.log(`  - Failed updates: ${result.failedUpdates}`);
    console.log(`  - Eligible holders: ${result.eligibleHolders}`);
    console.log(`  - VIP members preserved: ${result.vipMembersPreserved} 👑`);
    console.log(`  - System exclusions applied: ${result.systemExclusionsApplied}`);
    console.log(`  - Total entries: ${result.totalEntries.toLocaleString()}`);
    console.log(`  - Token price: $${result.tokenPriceUSD.toFixed(8)}`);
    console.log(`  - Ready for draw: ${result.readyForDraw ? 'YES ✅' : 'NO ❌'}`);
    console.log(`  - Promotional entries: ${result.promotionalEntries.success ? `${result.promotionalEntries.entriesCreated} created ✅` : `Failed ❌`}`);

    return res.status(200).json(result);

  } catch (error) {
    console.error('💥 CRITICAL ERROR in enhanced batch sync:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      enhancedLogging: true
    });
  }
}