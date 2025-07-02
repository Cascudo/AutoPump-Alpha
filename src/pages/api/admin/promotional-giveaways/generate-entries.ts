// src/pages/api/admin/promotional-giveaways/generate-entries.ts
// Auto-generate promotional giveaway entries for all eligible holders
// ✅ SAFE: Uses existing database functions confirmed in your schema

import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSupabaseClient } from '../../../../utils/supabaseClient';
import { isAuthorizedAdmin } from '../../../../utils/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { adminWallet, giveawayId } = req.body;

    // Admin authentication
    if (!isAuthorizedAdmin(adminWallet)) {
      return res.status(403).json({ error: 'Unauthorized: Invalid admin wallet' });
    }

    console.log('🎁 Starting automatic promotional giveaway entry generation...');
    console.log('🎯 Giveaway ID:', giveawayId || 'ALL ACTIVE');

    const supabase = getAdminSupabaseClient();

    // Get target giveaways (specific ID or all active)
    let giveaways;
    if (giveawayId) {
      const { data, error } = await supabase
        .from('promotional_giveaways')
        .select('*')
        .eq('id', giveawayId)
        .single();
      
      if (error || !data) {
        return res.status(404).json({ error: 'Giveaway not found' });
      }
      giveaways = [data];
    } else {
      // Get all active giveaways
      const { data, error } = await supabase
        .from('promotional_giveaways')
        .select('*')
        .eq('status', 'active');
      
      if (error) {
        console.error('Error fetching active giveaways:', error);
        return res.status(500).json({ error: 'Failed to fetch giveaways' });
      }
      giveaways = data || [];
    }

    if (giveaways.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active giveaways found',
        giveawaysProcessed: 0,
        totalUsersProcessed: 0,
        totalEntriesCreated: 0,
        giveaways: []
      });
    }

    console.log(`✅ Found ${giveaways.length} active giveaway(s) to process`);

    // Get all eligible users (includes VIP users with purchased entries)
    const { data: eligibleUsers, error: usersError } = await supabase
      .from('users')
      .select('wallet_address, usd_value, vip_tier, baseline_entries_accumulated')
      .eq('is_eligible', true)
      .eq('excluded_from_draw', false)
      .or('usd_value.gte.10,baseline_entries_accumulated.gt.0'); // Include VIP users with purchased entries

    if (usersError) {
      console.error('Error fetching eligible users:', usersError);
      return res.status(500).json({ error: 'Failed to fetch eligible users' });
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No eligible users found (need $10+ ALPHA or VIP baseline entries)',
        giveawaysProcessed: giveaways.length,
        totalUsersProcessed: 0,
        totalEntriesCreated: 0,
        giveaways: []
      });
    }

    console.log(`✅ Found ${eligibleUsers.length} eligible users to process`);

    // Process each giveaway
    let totalEntriesCreated = 0;
    let totalUsersProcessed = 0;
    const giveawayResults = [];

    for (const giveaway of giveaways) {
      console.log(`\n🎯 Processing giveaway: ${giveaway.title}`);
      
      let giveawayEntriesCreated = 0;
      let giveawayUsersProcessed = 0;
      const userResults = [];

      // Process users in batches to prevent database overload
      const batchSize = 10;
      for (let i = 0; i < eligibleUsers.length; i += batchSize) {
        const userBatch = eligibleUsers.slice(i, i + batchSize);
        
        // Process batch with error isolation
        const batchResults = await Promise.allSettled(
          userBatch.map(async (user) => {
            try {
              console.log(`  🔍 Processing user ${user.wallet_address.slice(0, 8)}...`);

              // Check if user already has entries for this giveaway
              const { data: existingEntry, error: existingError } = await supabase
                .from('promotional_giveaway_entries')
                .select('*')
                .eq('giveaway_id', giveaway.id)
                .eq('user_wallet', user.wallet_address)
                .single();

              if (existingEntry && !existingError) {
                console.log(`  ⏭️  ${user.wallet_address.slice(0, 8)}... already has entry (${existingEntry.final_entries} entries)`);
                return {
                  wallet: user.wallet_address,
                  status: 'existing',
                  entries: existingEntry.final_entries
                };
              }

              // 🎯 OPTIMAL: Use V2 comprehensive calculation function
              console.log(`  🎯 Calculating entries for ${user.wallet_address.slice(0, 8)}...`);
              
              // Method: Use the V2 calculation function (returns complete breakdown)
              const { data: entryCalculation, error: calcError } = await supabase
                .rpc('calc_promo_entries_v2', {
                  giveaway_uuid: giveaway.id,
                  wallet_addr: user.wallet_address
                });

              if (calcError) {
                console.error(`  ❌ V2 calc error for ${user.wallet_address.slice(0, 8)}:`, calcError);
                return {
                  wallet: user.wallet_address,
                  status: 'calc_error',
                  error: calcError.message
                };
              }

              // V2 returns array of calculation results
              const calculationResult = entryCalculation && entryCalculation.length > 0 ? entryCalculation[0] : null;
              
              if (!calculationResult) {
                console.log(`  ⚠️  ${user.wallet_address.slice(0, 8)}... no calculation result (not eligible)`);
                return {
                  wallet: user.wallet_address,
                  status: 'not_eligible',
                  entries: 0
                };
              }

              const finalEntries = calculationResult.final_entries || 0;

              console.log(`  📊 ${user.wallet_address.slice(0, 8)}: ${calculationResult.alpha_entries} ALPHA + ${calculationResult.vip_baseline_entries} VIP + ${calculationResult.purchased_entries} purchased = ${calculationResult.total_base_entries} base × ${calculationResult.vip_multiplier}x = ${finalEntries} final`);

              if (finalEntries <= 0) {
                console.log(`  ⚠️  ${user.wallet_address.slice(0, 8)}... calculated 0 entries (not eligible)`);
                return {
                  wallet: user.wallet_address,
                  status: 'zero_entries',
                  entries: 0
                };
              }

              // ✅ OPTIMAL: Use the V2 update function instead of manual insert
              const { error: updateError } = await supabase.rpc('update_promo_entries_v2', {
                giveaway_uuid: giveaway.id,
                wallet_addr: user.wallet_address,
                additional_purchased: 0
              });

              if (updateError) {
                console.error(`  ❌ Update error for ${user.wallet_address.slice(0, 8)}:`, updateError);
                return {
                  wallet: user.wallet_address,
                  status: 'update_error',
                  error: updateError.message
                };
              }

              console.log(`  ✅ Created/updated entry for ${user.wallet_address.slice(0, 8)}: ${finalEntries} entries`);
              
              return {
                wallet: user.wallet_address,
                status: 'created',
                entries: finalEntries,
                baseEntries: calculationResult.total_base_entries,
                vipMultiplier: calculationResult.vip_multiplier,
                breakdown: {
                  alphaEntries: calculationResult.alpha_entries,
                  vipBaselineEntries: calculationResult.vip_baseline_entries,
                  purchasedEntries: calculationResult.purchased_entries
                }
              };

            } catch (userError) {
              console.error(`  💥 Error processing user ${user.wallet_address.slice(0, 8)}:`, userError);
              return {
                wallet: user.wallet_address,
                status: 'error',
                error: userError.message
              };
            }
          })
        );

        // Process batch results
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            const userResult = result.value;
            userResults.push(userResult);
            
            if (userResult.status === 'created') {
              giveawayEntriesCreated += userResult.entries;
              giveawayUsersProcessed++;
              totalEntriesCreated += userResult.entries;
              totalUsersProcessed++;
            }
          } else {
            console.error(`  ❌ Batch processing error:`, result.reason);
            userResults.push({
              wallet: 'unknown',
              status: 'batch_error',
              error: result.reason?.message || 'Unknown batch error'
            });
          }
        });

        // Brief pause between batches
        if (i + batchSize < eligibleUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Update giveaway totals
      try {
        const { data: totalStats } = await supabase
          .from('promotional_giveaway_entries')
          .select('final_entries')
          .eq('giveaway_id', giveaway.id);

        const totalEntries = totalStats?.reduce((sum, entry) => sum + (entry.final_entries || 0), 0) || 0;
        const totalParticipants = totalStats?.length || 0;

        await supabase
          .from('promotional_giveaways')
          .update({
            total_entries: totalEntries,
            updated_at: new Date().toISOString()
          })
          .eq('id', giveaway.id);

        console.log(`  📊 Updated giveaway totals: ${totalEntries} entries, ${totalParticipants} participants`);

        giveawayResults.push({
          giveawayId: giveaway.id,
          title: giveaway.title,
          entriesCreated: giveawayEntriesCreated,
          usersProcessed: giveawayUsersProcessed,
          totalEntries: totalEntries,
          totalParticipants: totalParticipants,
          successfulEntries: userResults.filter(r => r.status === 'created').length,
          existingEntries: userResults.filter(r => r.status === 'existing').length,
          errors: userResults.filter(r => r.status.includes('error')).length,
          userResults: userResults.slice(0, 5) // Limit to first 5 for response size
        });

      } catch (updateError) {
        console.error(`  ❌ Error updating giveaway totals:`, updateError);
        giveawayResults.push({
          giveawayId: giveaway.id,
          title: giveaway.title,
          entriesCreated: giveawayEntriesCreated,
          usersProcessed: giveawayUsersProcessed,
          totalEntries: 0,
          totalParticipants: 0,
          error: 'Failed to update totals'
        });
      }
    }

    const result = {
      success: true,
      message: 'Promotional giveaway entries generated successfully',
      summary: {
        giveawaysProcessed: giveaways.length,
        totalUsersProcessed,
        totalEntriesCreated,
        eligibleHolders: eligibleUsers.length,
        functionsUsed: {
          calculation: 'calc_promo_entries_v2', // V2 comprehensive calculation
          update: 'update_promo_entries_v2'     // V2 entry updates
        }
      },
      giveaways: giveawayResults,
      timestamp: new Date().toISOString()
    };

    console.log('\n✅ Promotional entry generation complete!');
    console.log(`📊 SUMMARY:`);
    console.log(`  - Giveaways processed: ${result.summary.giveawaysProcessed}`);
    console.log(`  - Users processed: ${result.summary.totalUsersProcessed}`);
    console.log(`  - Total entries created: ${result.summary.totalEntriesCreated}`);
    console.log(`  - Eligible holders: ${result.summary.eligibleHolders}`);
    console.log(`  - Functions used: ${result.summary.functionsUsed.calculation} + ${result.summary.functionsUsed.update}`);

    return res.status(200).json(result);

  } catch (error) {
    console.error('💥 Error in promotional entry generation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate promotional entries',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}