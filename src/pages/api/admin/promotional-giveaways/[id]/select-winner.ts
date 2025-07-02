// ===============================================
// ADMIN API: SELECT GIVEAWAY WINNER
// src/pages/api/admin/promotional-giveaways/[id]/select-winner.ts
// ===============================================

import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSupabaseClient } from '../../../../../utils/supabaseClient';

function isAdminWallet(walletAddress: string): boolean {
  const adminWallets = [
    '8Dibf82AXq5zN44ZwgLGrn22LYvebbiqSBEVBPaffetX',
  ];
  return adminWallets.includes(walletAddress);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const { adminWallet } = req.query;

    if (!adminWallet || !isAdminWallet(adminWallet as string)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('🎲 Selecting winner for giveaway:', id, 'by admin:', (adminWallet as string).slice(0, 8) + '...');

    const adminClient = getAdminSupabaseClient();

    // 🎯 CRITICAL: Use the new v2 function name
    const { data: winnerWallet, error: drawError } = await adminClient
      .rpc('execute_promo_draw_v2', {
        giveaway_uuid: id,
        admin_wallet: adminWallet as string
      });

    if (drawError) {
      console.error('❌ Draw execution error:', drawError);
      return res.status(400).json({ 
        error: drawError.message || 'Failed to execute draw'
      });
    }

    // Get updated giveaway details
    const { data: updatedGiveaway, error: giveawayError } = await adminClient
      .from('promotional_giveaways')
      .select('*')
      .eq('id', id)
      .single();

    if (giveawayError) {
      console.error('❌ Error fetching updated giveaway:', giveawayError);
      return res.status(500).json({ error: 'Draw completed but failed to get updated giveaway' });
    }

    // Get final stats
    const { data: entries, error: entriesError } = await adminClient
      .from('promotional_giveaway_entries')
      .select('user_wallet, final_entries, purchased_entries')
      .eq('giveaway_id', id)
      .gt('final_entries', 0);

    if (entriesError) {
      console.error('❌ Error fetching entries for stats:', entriesError);
    }

    const stats = {
      total_participants: entries?.length || 0,
      total_entries: entries?.reduce((sum, e) => sum + e.final_entries, 0) || 0,
      free_only_participants: entries?.filter(e => e.purchased_entries === 0).length || 0,
      paid_participants: entries?.filter(e => e.purchased_entries > 0).length || 0
    };

    console.log('✅ Winner selected successfully:', {
      winner: winnerWallet,
      giveaway: updatedGiveaway.title,
      totalEntries: stats.total_entries,
      participants: stats.total_participants
    });

    res.status(200).json({
      success: true,
      winner: winnerWallet,
      message: `Winner selected: ${winnerWallet?.slice(0, 8)}...`,
      stats,
      giveaway: updatedGiveaway
    });

  } catch (error) {
    console.error('❌ Error selecting winner:', error);
    res.status(500).json({ 
      error: 'Failed to select winner',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}