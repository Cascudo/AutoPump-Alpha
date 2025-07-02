// src/pages/dashboard.tsx - MINIMAL FIX: Only prevent navigation accumulation bug
import type { NextPage } from "next";
import Head from "next/head";
import { FC, useState, useEffect, useMemo, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useMembershipStore } from '../stores/useMembershipStore';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { VipUpgradeFlow } from '../components/VipUpgradeFlow';
import { VipBenefitsDisplay } from '../components/VipBenefitsDisplay';
import { GiveawayStats } from '../components/GiveawayStats';
import { PromotionalGiveaway, PromotionalGiveawayEntry } from '../utils/supabaseClient';
import { googleSheetsService, type StatsData } from '../utils/googleSheetsService';
import Link from 'next/link';
import Image from 'next/image';

interface DashboardData {
  totalSolAwarded: number;
  availableRewards: number;
  recentWinners: Array<{
    wallet: string;
    amount: number;
    date: string;
    prizeTx: string;
  }>;
  recentBurns: Array<{
    amount: number;
    date: string;
    burnTx: string;
  }>;
  totalMembers: number;
  nextDrawTime: string;
}

interface PromotionalSummary {
  totalGiveaways: number;
  totalEntries: number;
  totalSpent: number;
  activeEntries: number;
  activeGiveaways: PromotionalGiveaway[];
  // ADDED: Additional breakdown for purchased vs auto entries
  activePurchasedEntries?: number;
  activeAutoEntries?: number;
  // 🚨 NEW: Flag to track if values are already VIP-multiplied
  purchaseEntriesAreVipMultiplied?: boolean;
}

const DashboardView: FC = () => {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [showVipFlow, setShowVipFlow] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'vip-benefits' | 'giveaways'>('overview');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [promotionalSummary, setPromotionalSummary] = useState<PromotionalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [promoLoading, setPromoLoading] = useState(false);

  // Get membership data
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
    isLoading: membershipLoading,
    getMembershipStatus 
  } = useMembershipStore();

  // =============================================
  // 🎯 MINIMAL FIX: Only prevent navigation accumulation
  // =============================================
  const smartEntryLogic = useMemo(() => {
    // Base calculations (consistent across all contexts)
    const holdingsEntries = Math.floor((usdValue || 0) / 10);
    const baselineEntries = vipBaselineEntries || 0;
    const autoEntries = (holdingsEntries + baselineEntries) * vipMultiplier;
    
    // Context flags
    const hasActiveGiveaways = promotionalSummary?.activeGiveaways?.length > 0;
    const hasPurchases = (promotionalSummary?.activePurchasedEntries || 0) > 0;
    const totalGiveawayEntries = promotionalSummary?.activeEntries || 0;
    
    // Smart display logic for Overview tab
    const getOverviewDisplay = () => {
      if (!hasActiveGiveaways) {
        // No active giveaways - show daily draw entries
        return {
          value: totalDailyEntries || autoEntries,
          label: "Daily Entries",
          description: "For daily SOL draws"
        };
      }
      
      if (hasPurchases) {
        // Has purchases - show total including purchases
        return {
          value: totalGiveawayEntries,
          label: "Total Entries", 
          description: "Auto + Purchased"
        };
      }
      
      // Has active giveaways but no purchases
      return {
        value: autoEntries,
        label: "Auto Entries",
        description: "From holdings + VIP"
      };
    };
    
    // 🚨 MINIMAL FIX: Check if values are already VIP-multiplied to prevent accumulation
    const rawPurchasedEntries = promotionalSummary?.activePurchasedEntries || 0;
    const purchasedEntriesDisplay = promotionalSummary?.purchaseEntriesAreVipMultiplied 
      ? rawPurchasedEntries  // Already multiplied, use as-is
      : Math.floor(rawPurchasedEntries * vipMultiplier);  // Multiply if needed
    
    return {
      // Raw values
      holdingsEntries,
      baselineEntries,
      autoEntries,
      vipMultiplier,
      
      // Context flags
      hasActiveGiveaways,
      hasPurchases,
      totalGiveawayEntries,
      
      // Display logic
      overview: getOverviewDisplay(),
      
      // Breakdown for giveaway performance
      breakdown: {
        auto: autoEntries,
        purchased: purchasedEntriesDisplay,
        total: totalGiveawayEntries || autoEntries,
        basePurchasedEntries: rawPurchasedEntries
      },
      
      // Validation
      isConsistent: Math.abs((autoEntries + purchasedEntriesDisplay) - totalGiveawayEntries) <= 1
    };
  }, [usdValue, vipBaselineEntries, vipMultiplier, totalDailyEntries, promotionalSummary]);

  // =============================================
  // 🔍 MERGED: VALIDATION LOGIC
  // =============================================
  useEffect(() => {
    // Validation: Warn if calculations seem inconsistent
    if (smartEntryLogic.hasActiveGiveaways && !smartEntryLogic.hasPurchases) {
      const frontendCalc = smartEntryLogic.autoEntries;
      const databaseValue = smartEntryLogic.totalGiveawayEntries;
      
      if (Math.abs(frontendCalc - databaseValue) > 1) {
        console.warn('⚠️ Entry calculation mismatch detected:', {
          frontend: frontendCalc,
          database: databaseValue,
          user: walletAddress?.slice(0, 8) + '...',
          holdings: smartEntryLogic.holdingsEntries,
          baseline: smartEntryLogic.baselineEntries,
          vipMultiplier
        });
      }
    }
  }, [smartEntryLogic, walletAddress, vipMultiplier]);

  const loadDashboardData = useCallback(async () => {
    if (!publicKey) return;
    
    setIsLoading(true);
    try {
      await getMembershipStatus(publicKey, connection);
      
      // Load stats data
      const statsData = await googleSheetsService.getStatsData();
      if (statsData) {
        setDashboardData({
          totalSolAwarded: statsData.totalHolderPrizes || 0,
          availableRewards: 0, // Not available in StatsData
          recentWinners: statsData.recentWinners,
          recentBurns: statsData.recentBurns,
          totalMembers: statsData.totalMembers,
          nextDrawTime: '24 hours' // Default value since not in StatsData
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection, getMembershipStatus]);

  const loadPromotionalData = useCallback(async () => {
    if (!publicKey) return;
    
    setPromoLoading(true);
    try {
      // Fetch user's promotional entries
      const entriesResponse = await fetch('/api/promotional-giveaways/my-entries', {
        headers: { 'x-wallet-address': publicKey.toString() }
      });
      
      // Fetch active giveaways
      const giveawaysResponse = await fetch('/api/promotional-giveaways');
      
      if (entriesResponse.ok && giveawaysResponse.ok) {
        const entriesData = await entriesResponse.json();
        const giveawaysData = await giveawaysResponse.json();
        
        const giveaways = Array.isArray(giveawaysData) ? giveawaysData : (giveawaysData.giveaways || []);
        const activeGiveaways = giveaways.filter((g: PromotionalGiveaway) => g.status === 'active');
        
        // KEEP EXISTING WORKING LOGIC - just add flag to prevent accumulation
        const activeEntries = entriesData.entries?.filter((e: any) => 
          e.giveaway && ['active', 'upcoming'].includes(e.giveaway.status)
        ) || [];
        
        const rawPurchasedEntries = activeEntries.reduce((sum: number, e: any) => sum + (e.purchased_entries || 0), 0) || 0;
        const displayPurchasedEntries = Math.floor(rawPurchasedEntries * vipMultiplier);
        
        const summary: PromotionalSummary = {
          totalGiveaways: entriesData.entries?.length || 0,
          totalEntries: entriesData.entries?.reduce((sum: number, e: any) => sum + (e.final_entries || 0), 0) || 0,
          totalSpent: entriesData.purchases?.reduce((sum: number, p: any) => sum + (p.amount_usd || 0), 0) || 0,
          activeEntries: activeEntries.reduce((sum: number, e: any) => sum + (e.final_entries || 0), 0) || 0,
          activeGiveaways: activeGiveaways,
          // 🚨 MINIMAL FIX: Store VIP-multiplied value with flag to prevent re-multiplication
          activePurchasedEntries: displayPurchasedEntries,
          activeAutoEntries: activeEntries.reduce((sum: number, e: any) => sum + (e.base_entries || 0), 0) || 0,
          purchaseEntriesAreVipMultiplied: true  // Flag to prevent re-multiplication
        };
        
        setPromotionalSummary(summary);
      }
    } catch (error) {
      console.error('Error loading promotional data:', error);
    } finally {
      setPromoLoading(false);
    }
  }, [publicKey, vipMultiplier]);

  useEffect(() => {
    if (publicKey && connected) {
      loadDashboardData();
      loadPromotionalData();
    }
  }, [publicKey, connected, loadDashboardData, loadPromotionalData]);

  // FIXED: Force refresh membership data when VIP status might have changed
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    
    if (publicKey && connected) {
      // Refresh every 30 seconds to catch VIP status changes
      refreshInterval = setInterval(() => {
        console.log('🔄 Auto-refreshing membership data...');
        getMembershipStatus(publicKey, connection);
      }, 120000);
    }
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [publicKey, connected, connection, getMembershipStatus]);

  // FIXED: Manual refresh function for immediate updates
  const handleManualRefresh = async () => {
    if (!publicKey) return;
    
    console.log('🔄 Manual refresh triggered...');
    setIsLoading(true);
    
    try {
      // Force refresh membership data
      await getMembershipStatus(publicKey, connection);
      // Reload promotional data
      await loadPromotionalData();
    } catch (error) {
      console.error('Error during manual refresh:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getVipMultiplier = (tier: string) => {
    switch (tier) {
      case 'Silver': return 2;
      case 'Gold': return 3;
      case 'Platinum': return 5;
      default: return 1;
    }
  };

  const getVipColor = (tier: string) => {
    switch (tier) {
      case 'Silver': return 'text-gray-400';
      case 'Gold': return 'text-yellow-400';
      case 'Platinum': return 'text-purple-400';
      default: return 'text-gray-300';
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-6">Welcome to Your Dashboard</h1>
          <p className="text-xl text-gray-300 mb-8">Connect your wallet to access your ALPHA Club membership</p>
          <button
            onClick={() => setVisible(true)}
            className="cta-button-primary text-lg px-8 py-4 rounded-xl font-bold"
          >
            Connect Wallet 🚀
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || membershipLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - ALPHA Club</title>
        <meta name="description" content="Your ALPHA Club member dashboard" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Welcome Header with Manual Refresh */}
          <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-4 mb-4">
              <h1 className="text-4xl font-bold text-white">
                👋 Welcome Back, ALPHA Member
              </h1>
              <button
                onClick={handleManualRefresh}
                disabled={isLoading}
                className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm"
              >
                {isLoading ? '⏳' : '🔄'} Refresh
              </button>
            </div>
            <p className="text-xl text-gray-300">
              Your personalized dashboard with real-time stats and opportunities
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-2 border border-gray-700">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    activeTab === 'overview'
                      ? 'bg-teal-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  📊 Overview
                </button>
                <button
                  onClick={() => setActiveTab('giveaways')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    activeTab === 'giveaways'
                      ? 'bg-teal-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  🎁 Giveaways
                </button>
                <button
                  onClick={() => setActiveTab('vip-benefits')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    activeTab === 'vip-benefits'
                      ? 'bg-teal-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  👑 VIP Benefits
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              
              {/* Member Stats Grid */}
              <div className="grid md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 rounded-2xl p-6 border border-teal-500/20">
                  <div className="text-center">
                    <div className="text-3xl mb-2">💰</div>
                    <div className="text-2xl font-bold text-white mb-1">
                      ${(usdValue || 0).toLocaleString()}
                    </div>
                    <div className="text-teal-400 font-medium">ALPHA Holdings</div>
                    <div className="text-gray-400 text-sm mt-1">
                      {(tokenBalance || 0).toLocaleString()} tokens
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl p-6 border border-purple-500/20">
                  <div className="text-center">
                    <div className="text-3xl mb-2">👑</div>
                    <div className={`text-2xl font-bold mb-1 ${getVipColor(vipTier)}`}>
                      {vipTier}
                    </div>
                    <div className="text-purple-400 font-medium">VIP Status</div>
                    <div className="text-gray-400 text-sm mt-1">
                      {vipMultiplier}x multiplier
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-500/20">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🎯</div>
                    <div className="text-2xl font-bold text-white mb-1">
                      {totalDailyEntries || 0}
                    </div>
                    <div className="text-green-400 font-medium">Daily Entries</div>
                    <div className="text-gray-400 text-sm mt-1">
                      Next draw in {dashboardData?.nextDrawTime || 'calculating...'}
                    </div>
                  </div>
                </div>

                {/* 🎯 MERGED: Smart Entry Logic Applied */}
                <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-2xl p-6 border border-yellow-500/20">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🏆</div>
                    <div className="text-2xl font-bold text-white mb-1">
                      {smartEntryLogic.overview.value}
                    </div>
                    <div className="text-yellow-400 font-medium">{smartEntryLogic.overview.label}</div>
                    <div className="text-gray-400 text-sm mt-1">
                      {smartEntryLogic.overview.description}
                    </div>
                  </div>
                </div>
              </div>

              {/* VIP Upgrade CTA */}
              {vipTier === 'None' && (
                <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-3xl p-8 border border-purple-500/20 text-center">
                  <h3 className="text-3xl font-bold text-white mb-4">🚀 Multiply Your Rewards</h3>
                  <p className="text-xl text-gray-300 mb-6">
                    Upgrade to VIP and get up to 5x more entries in all draws and giveaways
                  </p>
                  <button
                    onClick={() => setShowVipFlow(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all"
                  >
                    Upgrade to VIP 👑
                  </button>
                </div>
              )}

              {/* Recent Activity */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-4">🏆 Recent Winners</h3>
                  <div className="space-y-3">
                    {dashboardData?.recentWinners?.slice(0, 5).map((winner, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-black/40 rounded-lg">
                        <div>
                          <div className="font-mono text-sm text-gray-300">
                            {winner.wallet.slice(0, 8)}...{winner.wallet.slice(-4)}
                          </div>
                          <div className="text-xs text-gray-400">{winner.date}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-yellow-400 font-bold">{winner.amount} SOL</div>
                          <div className="text-xs text-gray-400">Daily Draw</div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center text-gray-400 py-8">
                        No recent winners data available
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-4">🔥 Recent Burns</h3>
                  <div className="space-y-3">
                    {dashboardData?.recentBurns?.slice(0, 5).map((burn, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-black/40 rounded-lg">
                        <div>
                          <div className="text-sm text-gray-300">Token Burn</div>
                          <div className="text-xs text-gray-400">{burn.date}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-orange-400 font-bold">{burn.amount.toLocaleString()}</div>
                          <div className="text-xs text-gray-400">ALPHA burned</div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center text-gray-400 py-8">
                        No recent burns data available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'giveaways' && (
            <div className="space-y-8">
              {/* 🎯 MERGED: Updated Component Call */}
              <PromotionalGiveawaysDashboard 
                promotionalSummary={promotionalSummary}
                isLoading={promoLoading}
                onRefresh={loadPromotionalData}
                smartEntryLogic={smartEntryLogic}
                vipTier={vipTier}
                onUpgradeVip={() => setShowVipFlow(true)}
              />
            </div>
          )}

          {activeTab === 'vip-benefits' && (
            <div className="space-y-8">
              {vipActive && vipTier !== 'None' ? (
                // Show VIP Benefits Content for existing VIP users
                <VipBenefitsDisplay
                  vipTier={vipTier as 'Silver' | 'Gold' | 'Platinum'}
                  vipActive={vipActive}
                  onUpgrade={() => setShowVipFlow(true)}
                />
              ) : (
                // Show upgrade CTA for non-VIP users
                <div className="max-w-4xl mx-auto text-center space-y-8">
                  <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-3xl p-12 border border-purple-500/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 animate-pulse"></div>
                    <div className="relative z-10">
                      <div className="text-6xl mb-6">👑</div>
                      <h2 className="text-4xl font-bold text-white mb-4">Unlock VIP Benefits</h2>
                      <p className="text-xl text-purple-200 mb-8 max-w-2xl mx-auto">
                        Join our exclusive VIP club to access premium benefits, enhanced rewards, 
                        and special offers from top partners.
                      </p>
                      <button
                        onClick={() => setShowVipFlow(true)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all transform hover:scale-105"
                      >
                        Become VIP Member 🚀
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* VIP Upgrade Flow Modal */}
        {showVipFlow && (
          <VipUpgradeFlow 
            onClose={() => setShowVipFlow(false)}
          />
        )}
      </div>
    </>
  );
};

// =============================================
// 🎯 MINIMAL FIX: Keep existing component working
// =============================================

interface PromotionalGiveawaysDashboardProps {
  promotionalSummary: PromotionalSummary | null;
  isLoading: boolean;
  onRefresh: () => void;
  smartEntryLogic: {
    holdingsEntries: number;
    baselineEntries: number;
    autoEntries: number;
    vipMultiplier: number;
    hasActiveGiveaways: boolean;
    hasPurchases: boolean;
    totalGiveawayEntries: number;
    breakdown: {
      auto: number;
      purchased: number;
      total: number;
      basePurchasedEntries: number;
    };
    isConsistent: boolean;
  };
  vipTier: string;
  onUpgradeVip: () => void;
}

const PromotionalGiveawaysDashboard: FC<PromotionalGiveawaysDashboardProps> = ({
  promotionalSummary,
  isLoading,
  onRefresh,
  smartEntryLogic,
  vipTier,
  onUpgradeVip
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 🎯 MERGED: Summary Stats with Smart Logic */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl p-6 border border-purple-500/20 text-center">
          <div className="text-3xl mb-2">🎁</div>
          <div className="text-2xl font-bold text-white mb-1">
            {promotionalSummary?.activeGiveaways?.length || 0}
          </div>
          <div className="text-purple-400 font-medium">Active Giveaways</div>
        </div>

        <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 rounded-2xl p-6 border border-teal-500/20 text-center">
          <div className="text-3xl mb-2">🔄</div>
          <div className="text-2xl font-bold text-white mb-1">
            {smartEntryLogic.breakdown.auto}
          </div>
          <div className="text-teal-400 font-medium">Auto Entries</div>
          <div className="text-gray-400 text-xs mt-1">From holdings + VIP</div>
        </div>

        <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-2xl p-6 border border-orange-500/20 text-center">
          <div className="text-3xl mb-2">💰</div>
          <div className="text-2xl font-bold text-white mb-1">
            {smartEntryLogic.breakdown.purchased}
          </div>
          <div className="text-orange-400 font-medium">Purchased</div>
          <div className="text-gray-400 text-xs mt-1">VIP benefit applied ({smartEntryLogic.vipMultiplier}x)</div>
        </div>

        <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-500/20 text-center">
          <div className="text-3xl mb-2">🏆</div>
          <div className="text-2xl font-bold text-white mb-1">
            {smartEntryLogic.breakdown.total}
          </div>
          <div className="text-green-400 font-medium">Total Entries</div>
          <div className="text-gray-400 text-xs mt-1">All active giveaways</div>
        </div>
      </div>

      {/* 🎯 MERGED: Complete Entry Breakdown */}
      <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">🎯 Your Complete Entry Breakdown</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-black/40 rounded-xl p-4 text-center">
            <div className="text-teal-400 font-bold text-lg">{smartEntryLogic.breakdown.auto}</div>
            <div className="text-gray-300 text-sm">Auto Entries</div>
            <div className="text-gray-400 text-xs">From holdings + VIP</div>
          </div>
          <div className="bg-black/40 rounded-xl p-4 text-center">
            <div className="text-orange-400 font-bold text-lg">{smartEntryLogic.breakdown.purchased}</div>
            <div className="text-gray-300 text-sm">Purchased</div>
            <div className="text-gray-400 text-xs">VIP multiplied</div>
          </div>
          <div className="bg-black/40 rounded-xl p-4 text-center">
            <div className="text-green-400 font-bold text-lg">{smartEntryLogic.breakdown.total}</div>
            <div className="text-gray-300 text-sm">Grand Total</div>
            <div className="text-gray-400 text-xs">All active giveaways</div>
          </div>
          <div className="bg-black/40 rounded-xl p-4 text-center">
            <button
              onClick={onRefresh}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        
        {/* 🎯 MERGED: Complete Formula Display */}
        <div className="mt-4 text-center bg-black/20 rounded-lg p-3">
          <div className="text-gray-400 text-sm">Complete Formula:</div>
          <div className="text-white font-mono text-sm">
            Auto: ({smartEntryLogic.holdingsEntries} + {smartEntryLogic.baselineEntries}) × {smartEntryLogic.vipMultiplier} = {smartEntryLogic.breakdown.auto}
          </div>
          <div className="text-white font-mono text-sm">
            Total: {smartEntryLogic.breakdown.auto} (auto) + {smartEntryLogic.breakdown.purchased} (purchased) = {smartEntryLogic.breakdown.total}
          </div>
          
        </div>
      </div>

      {/* 🎯 MERGED: Active Giveaways with Smart Logic */}
      {promotionalSummary?.activeGiveaways && promotionalSummary.activeGiveaways.length > 0 ? (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-white flex items-center">
            🔥 Active Giveaways
          </h3>
          
          <div className="bg-gradient-to-br from-gray-900/80 to-purple-900/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
            <h4 className="text-xl font-bold text-white mb-4 text-center">
              🏆 Your Giveaway Performance
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-black/40 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-teal-400 mb-1">{smartEntryLogic.breakdown.auto}</div>
                <div className="text-gray-300 text-sm">Auto Entries</div>
                <div className="text-gray-400 text-xs">Per giveaway</div>
              </div>
              <div className="bg-black/40 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-orange-400 mb-1">{smartEntryLogic.breakdown.purchased}</div>
                <div className="text-gray-300 text-sm">Purchased Entries</div>
                <div className="text-gray-400 text-xs">VIP multiplied</div>
              </div>
              <div className="bg-black/40 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">{smartEntryLogic.breakdown.total}</div>
                <div className="text-gray-300 text-sm">Grand Total</div>
                <div className="text-gray-400 text-xs">All entries</div>
              </div>
            </div>
          </div>
          
          <div className="grid gap-6">
            {promotionalSummary.activeGiveaways.map((giveaway) => {
              const userSpecificEntries = {
                final_entries: smartEntryLogic.breakdown.total,
                base_entries: smartEntryLogic.breakdown.auto,  
                purchased_entries: smartEntryLogic.breakdown.basePurchasedEntries,
                };
              
              return (
                <div key={giveaway.id} className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-600/40">
                  <div className="flex flex-col lg:flex-row gap-6">
                    
                    {/* Hero Image */}
                    {giveaway.prize_image_url && (
                      <div className="lg:w-1/3">
                        <Image 
                          src={giveaway.prize_image_url} 
                          alt={giveaway.title}
                          width={400}
                          height={300}
                          className="w-full h-48 lg:h-full object-cover rounded-xl"
                        />
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className="lg:w-2/3 space-y-4">
                      <div>
                        <h4 className="text-2xl font-bold text-white mb-2">{giveaway.title}</h4>
                        <p className="text-gray-300">{giveaway.prize_description}</p>
                        <div className="text-yellow-400 font-bold text-xl mt-2">
                          Prize Value: ${giveaway.prize_value.toLocaleString()}
                        </div>
                      </div>
                      
                      {/* Draw Date */}
                      <div className="bg-black/40 rounded-xl p-4">
                        <div className="text-red-400 font-bold text-sm">⏰ Draw Date</div>
                        <div className="text-white font-mono text-lg">
                          {giveaway.draw_date ? 
                            new Date(giveaway.draw_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZoneName: 'short'
                            })
                            : 'Date TBA'
                          }
                        </div>
                      </div>
                      
                      {/* GiveawayStats Component */}
                      <div className="bg-black/20 rounded-xl p-4">
                        <GiveawayStats 
                          giveaway={giveaway}
                          userEntries={userSpecificEntries}
                          totalFreeEntries={smartEntryLogic.breakdown.auto}
                        />
                      </div>
                      
                      {/* Entry Link */}
                      <Link href={`/giveaway/${giveaway.id}`}>
                        <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-xl transition-all">
                          🎯 View & Buy More Entries
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎁</div>
          <h3 className="text-2xl font-bold text-white mb-4">No Active Giveaways</h3>
          <p className="text-gray-400 mb-6">Check back soon for exciting new prizes!</p>
        </div>
      )}

      {/* VIP Upgrade CTA */}
      {vipTier === 'None' && (
        <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-2xl p-8 border border-purple-500/30 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">🚀 Multiply Your Entries</h3>
          <p className="text-purple-200 mb-6">
            Upgrade to VIP and get up to 5x more entries in all giveaways
          </p>
          <button
            onClick={onUpgradeVip}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all"
          >
            Upgrade to VIP 👑
          </button>
        </div>
      )}
    </div>
  );
};

const Dashboard: NextPage = () => {
  return <DashboardView />;
};

export default Dashboard;