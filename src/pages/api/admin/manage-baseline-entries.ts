// src/pages/api/admin/manage-baseline-entries.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, getAdminSupabaseClient } from '../../../utils/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Admin authentication check
  const adminClient = getAdminSupabaseClient();
  if (!adminClient) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  if (req.method === 'POST') {
    return handleBaselineAdjustment(req, res, adminClient);
  } else if (req.method === 'GET') {
    return getBaselineStats(req, res, adminClient);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Handle admin baseline entry adjustments
async function handleBaselineAdjustment(req: NextApiRequest, res: NextApiResponse, adminClient: any) {
  try {
    const { targetWallet, adjustmentAmount, adminWallet, reason } = req.body;

    if (!targetWallet || adjustmentAmount === undefined || !adminWallet) {
      return res.status(400).json({ 
        error: 'Missing required fields: targetWallet, adjustmentAmount, adminWallet' 
      });
    }

    console.log('🔧 Admin baseline adjustment:', {
      target: targetWallet.slice(0, 8) + '...',
      adjustment: adjustmentAmount,
      admin: adminWallet.slice(0, 8) + '...',
      reason
    });

    // Call the secure database function
    const { data, error } = await adminClient.rpc('admin_adjust_baseline_entries', {
      target_wallet: targetWallet,
      adjustment_amount: adjustmentAmount,
      admin_wallet: adminWallet,
      reason: reason || 'Manual adjustment'
    });

    if (error) {
      console.error('❌ Baseline adjustment error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Baseline entries adjusted successfully');

    return res.status(200).json({
      success: true,
      message: `Baseline entries adjusted by ${adjustmentAmount} for ${targetWallet.slice(0, 8)}...`
    });

  } catch (error) {
    console.error('❌ Baseline adjustment API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Get baseline entry statistics
async function getBaselineStats(req: NextApiRequest, res: NextApiResponse, adminClient: any) {
  try {
    // Get all users with baseline entries
    const { data: usersWithBaseline, error: usersError } = await adminClient
      .from('users')
      .select(`
        wallet_address,
        vip_tier,
        baseline_entries_accumulated,
        months_subscribed,
        last_baseline_award,
        subscription_start_date,
        subscription_expiry
      `)
      .gt('baseline_entries_accumulated', 0)
      .order('baseline_entries_accumulated', { ascending: false });

    if (usersError) {
      throw usersError;
    }

    // Get recent admin adjustments
    const { data: recentAdjustments, error: adjustmentsError } = await adminClient
      .from('admin_baseline_adjustments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (adjustmentsError) {
      throw adjustmentsError;
    }

    // Calculate summary stats
    const totalBaseline = usersWithBaseline?.reduce((sum, user) => sum + user.baseline_entries_accumulated, 0) || 0;
    const usersByTier = usersWithBaseline?.reduce((acc, user) => {
      acc[user.vip_tier] = (acc[user.vip_tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return res.status(200).json({
      success: true,
      data: {
        usersWithBaseline,
        recentAdjustments,
        summary: {
          totalUsers: usersWithBaseline?.length || 0,
          totalBaselineEntries: totalBaseline,
          usersByTier
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching baseline stats:', error);
    return res.status(500).json({
      error: 'Failed to fetch baseline statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}