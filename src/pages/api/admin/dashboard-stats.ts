// src/pages/api/admin/dashboard-stats.ts
// UPDATED - Complete admin API with exclusion support

import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSupabaseClient } from '../../../utils/supabaseClient';

// Admin authentication check
function isAdminWallet(walletAddress: string): boolean {
  const adminWallets = [
    '8Dibf82AXq5zN44ZwgLGrn22LYvebbiqSBEVBPaffetX',
    // Add additional admin wallets here if needed
  ];
  return adminWallets.includes(walletAddress);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { adminWallet } = req.query;

    // Verify admin access
    if (!adminWallet || !isAdminWallet(adminWallet as string)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('📊 Admin dashboard stats requested by:', (adminWallet as string).slice(0, 8) + '...');

    const supabase = getAdminSupabaseClient();

    // EFFICIENT QUERY 1: Get current stats using database function
    console.log('🔄 Fetching current holder stats...');
    const { data: currentStats, error: statsError } = await supabase
      .rpc('get_current_holder_stats');

    if (statsError) {
      console.error('❌ Error fetching current stats:', statsError);
      return res.status(500).json({ error: 'Failed to fetch current stats' });
    }

    const stats = currentStats?.[0] || {
      total_holders: 0,
      eligible_holders: 0,
      total_entries: 0,
      total_usd_value: 0,
      active_vip_subscriptions: 0
    };

    // ENHANCED QUERY 2: Get eligible holders EXCLUDING excluded wallets
    console.log('🏆 Fetching top eligible holders (excluding excluded wallets)...');
    const { data: topHolders, error: holdersError } = await supabase
      .from('users')
      .select('wallet_address, usd_value, cached_entries, vip_tier, last_balance_check, excluded_from_draw')
      .eq('is_eligible', true)
      .eq('excluded_from_draw', false) // EXCLUDE excluded wallets
      .order('cached_entries', { ascending: false })
      .limit(10);

    if (holdersError) {
      console.error('❌ Error fetching top holders:', holdersError);
    }

    // NEW QUERY: Get exclusion stats
    console.log('🚫 Fetching exclusion stats...');
    const { data: exclusionStats, error: exclusionError } = await supabase
      .from('users')
      .select('wallet_address, token_balance, usd_value, exclusion_reason')
      .eq('excluded_from_draw', true);

    if (exclusionError) {
      console.error('❌ Error fetching exclusion stats:', exclusionError);
    }

    // NEW QUERY: Get draw-eligible count (excluding excluded wallets)
    const { data: drawEligible, error: drawEligibleError } = await supabase
      .from('users')
      .select('cached_entries')
      .eq('is_eligible', true)
      .eq('excluded_from_draw', false);

    const drawEligibleCount = drawEligible?.length || 0;
    const drawTotalEntries = drawEligible?.reduce((sum, w) => sum + w.cached_entries, 0) || 0;

    // EFFICIENT QUERY 3: Get recent activity (last 24 hours, limited)
    console.log('📈 Fetching recent activity...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentActivity, error: activityError } = await supabase
      .from('holder_activity_log')
      .select('wallet_address, activity_type, usd_change, entries_change, timestamp')
      .gte('timestamp', twentyFourHoursAgo)
      .order('timestamp', { ascending: false })
      .limit(50); // Limit for performance

    if (activityError) {
      console.error('❌ Error fetching recent activity:', activityError);
    }

    // EFFICIENT QUERY 4: Get daily trends (last 7 days)
    console.log('📊 Fetching weekly trends...');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data: dailyTrends, error: trendsError } = await supabase
      .from('daily_holder_stats')
      .select('stat_date, total_holders, total_entries_today, total_vip_subscribers, daily_vip_revenue')
      .gte('stat_date', sevenDaysAgo)
      .order('stat_date', { ascending: false })
      .limit(7);

    if (trendsError) {
      console.error('❌ Error fetching daily trends:', trendsError);
    }

    // Calculate today's activity metrics from recent activity
    const todayActivity = {
      newHolders: 0,
      increased: 0,
      reduced: 0,
      totalActivity: 0
    };

    if (recentActivity) {
      const today = new Date().toDateString();
      const todayActivities = recentActivity.filter(a => 
        a.timestamp && new Date(a.timestamp).toDateString() === today
      );

      todayActivity.totalActivity = todayActivities.length;
      todayActivity.newHolders = todayActivities.filter(a => a.activity_type === 'NEW_HOLDER').length;
      todayActivity.increased = todayActivities.filter(a => a.activity_type === 'INCREASED_HOLDINGS').length;
      todayActivity.reduced = todayActivities.filter(a => a.activity_type === 'REDUCED_HOLDINGS').length;
    }

    // VIP tier breakdown from top holders
    const vipTierCounts = {
      silver: 0,
      gold: 0,
      platinum: 0
    };

    if (topHolders) {
      topHolders.forEach(holder => {
        if (holder.vip_tier === 'Silver') vipTierCounts.silver++;
        else if (holder.vip_tier === 'Gold') vipTierCounts.gold++;
        else if (holder.vip_tier === 'Platinum') vipTierCounts.platinum++;
      });
    }

    // Growth metrics (compare to yesterday if available)
    const growthMetrics = {
      holderGrowth: 0,
      entriesGrowth: 0,
      vipGrowth: 0,
      valueGrowth: 0
    };

    if (dailyTrends && dailyTrends.length >= 2) {
      const today = dailyTrends[0];
      const yesterday = dailyTrends[1];
      
      if (today && yesterday) {
        growthMetrics.holderGrowth = (today.total_holders || 0) - (yesterday.total_holders || 0);
        growthMetrics.entriesGrowth = (today.total_entries_today || 0) - (yesterday.total_entries_today || 0);
        growthMetrics.vipGrowth = (today.total_vip_subscribers || 0) - (yesterday.total_vip_subscribers || 0);
        // Note: value growth would need to be calculated differently
      }
    }

    // NEW: Exclusion summary
    const exclusionSummary = {
      totalExcluded: exclusionStats?.length || 0,
      excludedValue: exclusionStats?.reduce((sum, wallet) => sum + (Number(wallet.usd_value) || 0), 0) || 0,
      excludedBalance: exclusionStats?.reduce((sum, wallet) => sum + (Number(wallet.token_balance) || 0), 0) || 0,
      reasons: exclusionStats?.reduce((acc, wallet) => {
        const reason = wallet.exclusion_reason || 'Unknown';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {}
    };

    // Format response data
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      realTimeStats: {
        totalHolders: Number(stats.total_holders) || 0,
        eligibleHolders: Number(stats.eligible_holders) || 0,
        totalEntries: Number(stats.total_entries) || 0,
        totalUsdValue: Number(stats.total_usd_value) || 0,
        activeVipSubscriptions: Number(stats.active_vip_subscriptions) || 0,
        totalVipRevenue: 0 // Would need separate calculation
      },
      // NEW: Draw-specific stats (excluding excluded wallets)
      drawStats: {
        eligibleForDraw: drawEligibleCount,
        drawTotalEntries: drawTotalEntries,
        readyForDraw: drawEligibleCount > 0
      },
      // NEW: Exclusion stats
      exclusionStats: exclusionSummary,
      todayActivity,
      vipBreakdown: vipTierCounts,
      growthMetrics,
      topHolders: (topHolders || []).map(holder => ({
        wallet: holder.wallet_address.slice(0, 8) + '...' + holder.wallet_address.slice(-4),
        usdValue: Number(holder.usd_value) || 0,
        entries: Number(holder.cached_entries) || 0,
        vipTier: holder.vip_tier || 'None',
        lastActive: holder.last_balance_check || new Date().toISOString(),
        excludedFromDraw: holder.excluded_from_draw || false
      })),
      recentActivitySample: (recentActivity || []).slice(0, 20).map(activity => ({
        wallet: activity.wallet_address.slice(0, 8) + '...',
        type: activity.activity_type,
        usdChange: Number(activity.usd_change) || 0,
        entriesChange: Number(activity.entries_change) || 0,
        timestamp: activity.timestamp
      })),
      weeklyTrends: (dailyTrends || []).map(trend => ({
        date: trend.stat_date,
        holders: Number(trend.total_holders) || 0,
        entries: Number(trend.total_entries_today) || 0,
        vipSubscribers: Number(trend.total_vip_subscribers) || 0,
        revenue: Number(trend.daily_vip_revenue) || 0
      }))
    };

    console.log('✅ Admin dashboard stats compiled:', {
      totalHolders: responseData.realTimeStats.totalHolders,
      eligibleHolders: responseData.realTimeStats.eligibleHolders,
      totalEntries: responseData.realTimeStats.totalEntries,
      drawEligible: responseData.drawStats.eligibleForDraw,
      excludedWallets: responseData.exclusionStats.totalExcluded,
      todayActivity: responseData.todayActivity.totalActivity
    });

    res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Admin dashboard API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}