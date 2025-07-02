// ===============================================
// ENHANCED MEMBER DASHBOARD SECTION WITH GIVEAWAY STATS TEST
// src/components/MemberDashboardSection.tsx
// FIXED: useEffect dependency warning
// ===============================================

import { FC, useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMembershipStore } from '../stores/useMembershipStore';
import { GiveawayStats } from './GiveawayStats'; // 🆕 Added import

interface PromotionalSummary {
  totalGiveaways: number;
  totalEntries: number;
  totalSpent: number;
  activeEntries: number;
}

export const MemberDashboardSection: FC = () => {
  const { publicKey } = useWallet();
  const [promotionalSummary, setPromotionalSummary] = useState<PromotionalSummary | null>(null);
  const [loadingPromo, setLoadingPromo] = useState(false);
  
  // 🆕 Added test states
  const [testGiveaway, setTestGiveaway] = useState<any>(null);
  const [showGiveawayTest, setShowGiveawayTest] = useState(false);

  // Get membership data from store
  const {
    walletAddress,
    tokenBalance,
    usdValue,
    vipTier,
    isEligible,
    tokenEntries,
    vipBaselineEntries,
    vipMultiplier,
    totalDailyEntries,
    vipActive,
    membershipDisplayTier
  } = useMembershipStore();

  // FIXED: Wrap fetchPromotionalSummary in useCallback
  const fetchPromotionalSummary = useCallback(async () => {
    if (!publicKey) return;
    
    setLoadingPromo(true);
    try {
      const response = await fetch('/api/promotional-giveaways/my-entries', {
        headers: { 'x-wallet-address': publicKey.toString() }
      });
      const data = await response.json();
      
      if (data.entries) {
        const activeEntries = data.entries.filter((e: any) => 
          e.giveaway && ['active', 'upcoming'].includes(e.giveaway.status)
        );
        
        const summary: PromotionalSummary = {
          totalGiveaways: data.entries.length,
          totalEntries: data.entries.reduce((sum: number, e: any) => sum + (e.final_entries || 0), 0),
          totalSpent: data.purchases ? data.purchases.reduce((sum: number, p: any) => sum + (p.purchase_amount || 0), 0) : 0,
          activeEntries: activeEntries.reduce((sum: number, e: any) => sum + (e.final_entries || 0), 0)
        };
        
        setPromotionalSummary(summary);
      }
    } catch (error) {
      console.error('Error fetching promotional summary:', error);
    } finally {
      setLoadingPromo(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (publicKey) {
      fetchPromotionalSummary();
      fetchTestGiveaway(); // 🆕 Added test giveaway fetch
    }
  }, [publicKey, fetchPromotionalSummary]);

  // 🆕 Added function to fetch real giveaway data for testing
  const fetchTestGiveaway = async () => {
    try {
      const response = await fetch('/api/promotional-giveaways');
      const data = await response.json();
      
      // Get your first active giveaway or any giveaway for testing
      const giveaway = data.giveaways?.find((g: any) => g.status === 'active') || data.giveaways?.[0];
      
      if (giveaway) {
        setTestGiveaway(giveaway);
        console.log('🎯 Test giveaway loaded:', giveaway);
      } else {
        console.log('No giveaways found for testing');
      }
    } catch (error) {
      console.error('Error fetching test giveaway:', error);
    }
  };

  const getVipMultiplier = (tier: string): number => {
    switch (tier) {
      case 'Silver': return 2;
      case 'Gold': return 3;
      case 'Platinum': return 5;
      default: return 1;
    }
  };
  
  const getNextDrawTime = () => {
    const now = new Date();
    const nextDraw = new Date();
    nextDraw.setUTCHours(11, 0, 0, 0);
    if (nextDraw.getTime() <= now.getTime()) {
      nextDraw.setDate(nextDraw.getDate() + 1);
    }
    return nextDraw;
  };

  const getTimeUntilDraw = () => {
    const nextDraw = getNextDrawTime();
    const now = new Date();
    const diff = nextDraw.getTime() - now.getTime();
    
    if (diff <= 0) return '00:00:00';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // FIXED: Handle undefined usdValue
  const safeUsdValue = usdValue || 0;
  const safeTokenBalance = tokenBalance || 0;
  const safeVipMultiplier = vipMultiplier || 1;
  const safeVipBaselineEntries = vipBaselineEntries || 0;
  const safeTotalDailyEntries = totalDailyEntries || 0;

  if (!publicKey) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-3xl p-8 border border-gray-600/20 text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h3 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h3>
          <p className="text-gray-300">Connect your wallet to view your membership status and giveaway entries.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-4">
          Welcome back, ALPHA Member! 🎯
        </h2>
        <p className="text-xl text-gray-300">
          Your personalized dashboard with rewards and giveaway status
        </p>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid lg:grid-cols-3 gap-8 mb-12">
        
        {/* Holdings & Status */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 rounded-3xl p-6 border border-teal-500/20 h-full">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              💎 Your Holdings
            </h3>
            
            <div className="space-y-4">
              <div className="bg-black/40 rounded-xl p-4">
                <div className="text-sm text-gray-300 mb-1">Token Balance</div>
                <div className="text-2xl font-bold text-teal-400">
                  {safeTokenBalance.toLocaleString()} $ALPHA
                </div>
              </div>
              
              <div className="bg-black/40 rounded-xl p-4">
                <div className="text-sm text-gray-300 mb-1">USD Value</div>
                <div className="text-2xl font-bold text-green-400">
                  ${safeUsdValue.toFixed(2)}
                </div>
              </div>
              
              <div className="bg-black/40 rounded-xl p-4">
                <div className="text-sm text-gray-300 mb-1">Membership Tier</div>
                <div className="text-lg font-bold text-purple-400">
                  {membershipDisplayTier || 'None'}
                </div>
                {!isEligible && safeUsdValue < 10 && (
                  <div className="text-xs text-gray-400 mt-2">
                    Need $10+ to be eligible for rewards
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Daily Rewards */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 rounded-3xl p-6 border border-blue-500/20 h-full">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              🎯 Daily SOL Rewards
            </h3>
            
            <div className="space-y-4">
              <div className="bg-black/40 rounded-xl p-4">
                <div className="text-sm text-gray-300 mb-1">Your Daily Entries</div>
                <div className="text-3xl font-bold text-blue-400">
                  {safeTotalDailyEntries}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {Math.floor(safeUsdValue / 10)} base + {safeVipBaselineEntries} VIP × {safeVipMultiplier}x
                </div>
              </div>
              
              <div className="bg-black/40 rounded-xl p-4">
                <div className="text-sm text-gray-300 mb-1">Next Draw</div>
                <div className="text-lg font-mono font-bold text-yellow-400">
                  {getTimeUntilDraw()}
                </div>
                <div className="text-xs text-gray-400">Daily at 11:00 UTC</div>
              </div>
              
              {/* VIP Status */}
              <div className="bg-black/40 rounded-xl p-4">
                <div className="text-sm text-gray-300 mb-1">VIP Status</div>
                {vipTier !== 'None' ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">
                      {vipTier === 'Silver' && '🥈'}
                      {vipTier === 'Gold' && '🥇'}
                      {vipTier === 'Platinum' && '💎'}
                    </span>
                    <div>
                      <div className="text-lg font-bold text-purple-400">{vipTier}</div>
                      <div className="text-xs text-gray-400">{safeVipMultiplier}x multiplier active</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-lg text-gray-400">Standard Member</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Promotional Giveaways */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-3xl p-6 border border-purple-500/20 h-full">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              🎁 Promotional Giveaways
              {loadingPromo && <span className="ml-2 text-sm animate-spin">⟳</span>}
            </h3>

            {promotionalSummary ? (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/40 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {promotionalSummary.activeEntries}
                    </div>
                    <div className="text-xs text-gray-300">Active Entries</div>
                  </div>
                  
                  <div className="bg-black/40 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {promotionalSummary.totalGiveaways}
                    </div>
                    <div className="text-xs text-gray-300">Giveaways</div>
                  </div>
                </div>

                {/* Spending Summary */}
                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-sm text-gray-300 mb-1">Total Spent</div>
                  <div className="text-xl font-bold text-yellow-400">
                    ${promotionalSummary.totalSpent.toFixed(2)}
                  </div>
                </div>

                {/* Auto Entries Info */}
                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-sm text-gray-300 mb-2">Auto Entries per Giveaway</div>
                  <div className="text-xl font-bold text-teal-400">
                    {Math.floor(safeUsdValue / 10) * getVipMultiplier(vipTier)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {Math.floor(safeUsdValue / 10)} from holdings × {getVipMultiplier(vipTier)}x VIP
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <a 
                    href="#giveaways"
                    className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-4 rounded-xl font-bold text-center transition-all text-sm"
                  >
                    🎁 View All Giveaways
                  </a>
                  
                  <button
                    onClick={fetchPromotionalSummary}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-xl font-medium transition-all text-sm"
                  >
                    🔄 Refresh Status
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* No giveaways yet */}
                <div className="bg-black/40 rounded-xl p-4 text-center">
                  <div className="text-4xl mb-2">🎁</div>
                  <div className="text-sm text-gray-300 mb-2">No giveaway entries yet</div>
                  <div className="text-xs text-gray-400">
                    You automatically enter all giveaways with your holdings!
                  </div>
                </div>

                {/* Potential Entries */}
                {safeUsdValue >= 10 && (
                  <div className="bg-black/40 rounded-xl p-4">
                    <div className="text-sm text-gray-300 mb-2">Auto entries per giveaway:</div>
                    <div className="text-2xl font-bold text-green-400">
                      {Math.floor(safeUsdValue / 10) * getVipMultiplier(vipTier)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {Math.floor(safeUsdValue / 10)} from holdings × {getVipMultiplier(vipTier)}x VIP
                    </div>
                  </div>
                )}

                {/* Ineligible message */}
                {safeUsdValue < 10 && (
                  <div className="bg-yellow-900/30 rounded-xl p-4 border border-yellow-500/30">
                    <div className="text-yellow-400 font-bold text-sm mb-2">
                      🎯 Almost Ready for Giveaways!
                    </div>
                    <div className="text-xs text-gray-300 mb-2">
                      Hold $10+ worth of $ALPHA to automatically enter all giveaways
                    </div>
                    <div className="text-xs text-gray-400">
                      Current: ${safeUsdValue.toFixed(2)} USD<br/>
                      Need: $10.00 USD minimum
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <a 
                    href="#giveaways"
                    className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-4 rounded-xl font-bold text-center transition-all text-sm"
                  >
                    🎁 Explore Giveaways
                  </a>
                  
                  <button
                    onClick={fetchPromotionalSummary}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-xl font-medium transition-all text-sm"
                  >
                    🔄 Check for Giveaways
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🆕 GIVEAWAY STATS TEST SECTION */}
      {testGiveaway && (
        <div className="mb-12">
          <div className="bg-gradient-to-br from-orange-900/30 to-yellow-900/30 rounded-3xl p-6 border border-orange-500/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                🧪 GiveawayStats Component Test
                <span className="ml-2 text-sm bg-orange-600 text-white px-2 py-1 rounded">TESTING</span>
              </h3>
              <button
                onClick={() => setShowGiveawayTest(!showGiveawayTest)}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  showGiveawayTest 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {showGiveawayTest ? 'Hide Test' : 'Show Test'}
              </button>
            </div>

            {showGiveawayTest && (
              <div className="space-y-6">
                
                {/* Test Info */}
                <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-4">
                  <div className="text-green-400 font-bold mb-2">✅ Testing with Real Giveaway Data</div>
                  <div className="text-sm text-gray-300 mb-2">
                    <strong>Giveaway:</strong> {testGiveaway.title}
                  </div>
                  <div className="text-sm text-gray-300 mb-2">
                    <strong>Prize Value:</strong> ${testGiveaway.prize_value?.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-300 mb-2">
                    <strong>Status:</strong> {testGiveaway.status}
                  </div>
                  <div className="text-xs text-gray-400">
                    Your Auto Entries: {Math.floor(safeUsdValue / 10) * safeVipMultiplier} 
                    ({Math.floor(safeUsdValue / 10)} holdings × {safeVipMultiplier}x VIP)
                  </div>
                </div>

                {/* GiveawayStats Component */}
                <div className="bg-black/40 rounded-xl p-6 border border-gray-600/30">
                  <div className="text-white font-bold mb-4 text-center">
                    📊 Live GiveawayStats Component
                  </div>
                  <GiveawayStats 
                    giveaway={testGiveaway}
                    userEntries={null}
                    totalFreeEntries={Math.floor(safeUsdValue / 10) * safeVipMultiplier}
                  />
                </div>

                {/* Test Controls */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={fetchTestGiveaway}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl transition-all"
                  >
                    🔄 Refresh Test Data
                  </button>
                  <button
                    onClick={() => window.open(`/giveaway/${testGiveaway.id}`, '_blank')}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-xl transition-all"
                  >
                    🚀 Open Landing Page
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Member Benefits (Original Section) */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Membership Benefits */}
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-3xl p-6 border border-gray-600/20">
          <h4 className="text-xl font-bold text-white mb-4 flex items-center">
            ⭐ Your Benefits
          </h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
              <span className="text-gray-300">Daily SOL rewards</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
              <span className="text-gray-300">{safeTotalDailyEntries} daily {safeTotalDailyEntries === 1 ? 'entry' : 'entries'}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
              <span className="text-gray-300">Auto-enter all giveaways</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
              <span className="text-gray-300">Member support</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
              <span className="text-gray-300">Exclusive announcements</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
              <span className="text-gray-300">Early access features</span>
            </div>
          </div>
        </div>

        {/* VIP Status Display */}
        <div className="bg-gradient-to-br from-purple-800/30 to-purple-900/30 rounded-3xl p-6 border border-purple-600/20">
          <h4 className="text-xl font-bold text-white mb-4 flex items-center">
            💎 VIP Status
          </h4>
          {vipTier !== 'None' ? (
            <div className="text-center">
              <div className="text-3xl mb-2">
                {vipTier === 'Silver' && '🥈'}
                {vipTier === 'Gold' && '🥇'}
                {vipTier === 'Platinum' && '💎'}
              </div>
              <div className="text-lg font-bold text-purple-400 mb-1">
                {vipTier} VIP
              </div>
              <div className="text-sm text-gray-300">
                {getVipMultiplier(vipTier)}x Entry Multiplier
              </div>
              {safeVipBaselineEntries > 0 && (
                <div className="text-xs text-purple-300 mt-2">
                  +{safeVipBaselineEntries} Baseline Entries
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="text-3xl mb-2">⚪</div>
              <div className="text-lg font-bold text-gray-400 mb-1">
                Standard Member
              </div>
              <div className="text-sm text-gray-300 mb-4">
                1x Entry Multiplier
              </div>
              <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2 px-4 rounded-xl font-bold text-sm transition-all">
                Upgrade to VIP
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-indigo-800/30 to-blue-900/30 rounded-3xl p-6 border border-indigo-600/20">
          <h4 className="text-xl font-bold text-white mb-4 flex items-center">
            ⚡ Quick Actions
          </h4>
          <div className="space-y-3">
            <a 
              href="#giveaways"
              className="block w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-xl font-medium text-center transition-all text-sm"
            >
              🎁 View Giveaways
            </a>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl font-medium transition-all text-sm">
              📊 View Stats
            </button>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-xl font-medium transition-all text-sm">
              🔥 View Burns
            </button>
            <button 
              onClick={fetchPromotionalSummary}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-xl font-medium transition-all text-sm"
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};