// src/components/GiveawayStats.tsx - COMPLETED: Fixed incomplete logic and consistent display
// FIXED: useEffect dependency warning
import { FC, useState, useEffect, useCallback } from 'react';
import { useMembershipStore } from '../stores/useMembershipStore';

interface GiveawayStatsProps {
  giveaway: any;
  userEntries?: any;
  totalFreeEntries: number;
}

interface LiveStatsData {
  totalEntries: number;
  totalRevenue: number;
  estimatedParticipants: number;
}

interface EntryBreakdown {
  total: number;
  breakdown: string;
  autoEntries: number;
  purchasedEntries: number;
  vipMultiplier: number;
}

export const GiveawayStats: FC<GiveawayStatsProps> = ({
  giveaway,
  userEntries,
  totalFreeEntries
}) => {
  const [liveStats, setLiveStats] = useState<LiveStatsData>({
    totalEntries: giveaway?.total_entries || 0,
    totalRevenue: giveaway?.total_revenue || 0,
    estimatedParticipants: 0
  });
  const [loading, setLoading] = useState(false);

  // Get VIP data for fallback calculations
  const { vipMultiplier, usdValue } = useMembershipStore();

  // FIXED: Wrap fetchLiveStats in useCallback to avoid dependency warning
  const fetchLiveStats = useCallback(async () => {
    if (!giveaway?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch real data from existing API
      const response = await fetch('/api/promotional-giveaways');
      if (response.ok) {
        const data = await response.json();
        const currentGiveaway = data.giveaways?.find((g: any) => g.id === giveaway.id);
        
        if (currentGiveaway) {
          // Calculate estimated participants (avg 8 entries per participant)
          const estimatedParticipants = Math.max(1, Math.floor(currentGiveaway.total_entries / 8));
          
          setLiveStats({
            totalEntries: currentGiveaway.total_entries || 0,
            totalRevenue: currentGiveaway.total_revenue || 0,
            estimatedParticipants
          });
        }
      }
    } catch (error) {
      console.error('Error fetching live stats:', error);
    } finally {
      setLoading(false);
    }
  }, [giveaway?.id]);

  useEffect(() => {
    fetchLiveStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchLiveStats, 30000);
    return () => clearInterval(interval);
  }, [fetchLiveStats]);

  // 🎯 FIXED: Smart user entry calculation
  const getUserTotalEntries = () => {
    // Priority 1: Use database final_entries if available (already includes everything)
    if (userEntries?.final_entries) {
      return userEntries.final_entries;
    }
    
    // Priority 2: Use totalFreeEntries if no database data
    return totalFreeEntries || 0;
  };

  // 🎯 COMPLETED: Fixed the incomplete breakdown calculation
  const getUserEntryBreakdown = (): EntryBreakdown => {
    const totalEntries = getUserTotalEntries();
    
    if (userEntries?.final_entries) {
      // We have database data - calculate breakdown from database
      const baseEntries = userEntries.base_entries || 0;
      const purchasedEntries = userEntries.purchased_entries || 0;
      const userVipMultiplier = userEntries.vip_multiplier || vipMultiplier || 1;
      
      // Calculate auto entries (base entries already include VIP multiplication from database)
      const autoEntries = baseEntries;
      
      return {
        total: totalEntries,
        breakdown: purchasedEntries > 0 
          ? `${autoEntries} auto + ${purchasedEntries} purchased`
          : `${autoEntries} auto entries`,
        autoEntries,
        purchasedEntries,
        vipMultiplier: userVipMultiplier
      };
    } else {
      // No database data - use calculated data (dashboard scenario)
      const safeVipMultiplier = vipMultiplier || 1;
      const holdingsEntries = Math.floor((usdValue || 0) / 10);
      const autoEntries = holdingsEntries * safeVipMultiplier;
      
      // For dashboard, totalFreeEntries should be just auto entries (no purchases)
      return {
        total: totalEntries,
        breakdown: `${autoEntries} auto entries`,
        autoEntries,
        purchasedEntries: 0,
        vipMultiplier: safeVipMultiplier
      };
    }
  };

  // 🎯 ENHANCED: Better performance tier calculation
  const getUserPerformanceTier = () => {
    const userTotal = getUserTotalEntries();
    const totalPool = Math.max(liveStats.totalEntries, 1);
    const odds = (userTotal / totalPool) * 100;
    
    if (odds >= 10) return { 
      tier: 'Excellent', 
      color: 'text-green-400', 
      message: '🔥 Excellent position! You have outstanding chances to win!' 
    };
    if (odds >= 5) return { 
      tier: 'Good', 
      color: 'text-yellow-400', 
      message: '⚡ Good position! Consider buying more entries to boost your odds.' 
    };
    if (odds >= 1) return { 
      tier: 'Fair', 
      color: 'text-orange-400', 
      message: '💪 You\'re entered! Buy more entry packages to improve your chances.' 
    };
    return { 
      tier: 'Low', 
      color: 'text-gray-400', 
      message: '🎯 Connect wallet and hold ALPHA tokens to get automatic entries!' 
    };
  };

  const performance = getUserPerformanceTier();
  const entryBreakdown = getUserEntryBreakdown();

  return (
    <div className="max-w-6xl mx-auto">
      {/* User Performance Card */}
      {(totalFreeEntries > 0 || userEntries) && (
        <div className="bg-gradient-to-br from-gray-900/80 to-purple-900/20 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/30">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            🏆 Your Performance Dashboard
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            
            {/* Your Entries - COMPLETED */}
            <div className="bg-black/40 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-white mb-2">
                {entryBreakdown.total}
              </div>
              <div className="text-gray-300 font-semibold mb-2">Your Total Entries</div>
              <div className="text-sm text-gray-400">
                {entryBreakdown.breakdown}
              </div>
            </div>

            {/* Market Share - FIXED */}
            <div className="bg-black/40 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-purple-400 mb-2">
                {((entryBreakdown.total) / Math.max(liveStats.totalEntries, 1) * 100).toFixed(2)}%
              </div>
              <div className="text-gray-300 font-semibold mb-2">Market Share</div>
              <div className="text-sm text-gray-400">
                vs all participants
              </div>
            </div>

            {/* Winning Odds - FIXED */}
            <div className="bg-black/40 rounded-xl p-6 text-center">
              <div className={`text-2xl font-bold mb-2 ${performance.color}`}>
                1 in {Math.round(Math.max(liveStats.totalEntries, 1) / Math.max(entryBreakdown.total, 1))}
              </div>
              <div className="text-gray-300 font-semibold mb-2">Winning Odds</div>
              <div className="text-sm text-gray-400">
                Chance to win
              </div>
            </div>
          </div>

          {/* Performance Message */}
          <div className="text-center">
            <div className={`${performance.color} font-bold text-lg`}>
              {performance.message}
            </div>
          </div>

          {/* VIP Benefits Display - NEW */}
          {entryBreakdown.vipMultiplier > 1 && (
            <div className="mt-6 text-center">
              <div className="bg-gradient-to-r from-purple-800/40 to-pink-800/40 rounded-lg p-4 border border-purple-500/30">
                <div className="text-purple-300 text-sm">
                  🚀 VIP {entryBreakdown.vipMultiplier}x Multiplier Active
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  Your entries are multiplied by {entryBreakdown.vipMultiplier}x
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show message when user is not connected or has no entries */}
      {!totalFreeEntries && !userEntries && (
        <div className="bg-gradient-to-br from-gray-900/80 to-purple-900/20 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/30 text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-2xl font-bold text-white mb-4">
            Connect Your Wallet
          </h3>
          <p className="text-gray-300 mb-4">
            Connect your wallet and hold ALPHA tokens to see your performance dashboard and get automatic entries!
          </p>
          <div className="text-gray-400 text-sm">
            Hold $10+ worth of ALPHA tokens to automatically qualify for giveaways
          </div>
        </div>
      )}


    </div>
  );
};