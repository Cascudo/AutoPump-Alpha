// src/pages/dashboard.tsx
import type { NextPage } from "next";
import Head from "next/head";
import { FC, useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useAlphaTokenStore } from '../stores/useAlphaTokenStore';
import { useMembershipStore } from '../stores/useMembershipStore';
import { useVipSubscriptionStore, VipTier } from '../stores/useVipSubscriptionStore';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PremiumSubscription } from '../components/PremiumSubscription';
import { MarketDataService } from '../utils/marketDataService';
import { DailyRewardsSection } from '../components/DailyRewardsSection';
import Link from 'next/link';

interface MarketData {
  tokenPriceUSD: number;
  marketCapUSD: number;
  volume24h: number;
  priceChange24h: number;
  dataSource: string;
}

const DashboardView: FC = () => {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [isLoading, setIsLoading] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [countdown, setCountdown] = useState('');

  const { 
    tokenBalance, 
    usdValue, 
    pricePerToken,
    solPrice,
    holderRank,
    percentageOfSupply,
    getAlphaTokenBalance,
    getHolderStats
  } = useAlphaTokenStore();
  
  const { 
    membershipTier, 
    isEligible, 
    baseDailyEntries,
    vipTier,
    vipMultiplier,
    totalDailyEntries,
    getMembershipStatus
  } = useMembershipStore();

  const {
    currentSubscription,
    initiateSubscription
  } = useVipSubscriptionStore();

  // Calculate daily entries based on $10 per entry rule
  const calculateDailyEntries = (tokenBalance: number, tokenPriceUSD: number, vipMultiplier: number = 1) => {
    const usdValue = tokenBalance * tokenPriceUSD;
    const baseDailyEntries = Math.floor(usdValue / 10); // 1 entry per $10 USD
    const totalDailyEntries = baseDailyEntries * vipMultiplier;
    
    return {
      usdValue,
      baseDailyEntries,
      totalDailyEntries
    };
  };

  // Countdown timer for next draw
  useEffect(() => {
    const updateCountdown = () => {
      const nextDraw = new Date();
      nextDraw.setUTCHours(11, 0, 0, 0);
      if (nextDraw.getTime() <= Date.now()) {
        nextDraw.setDate(nextDraw.getDate() + 1);
      }
      
      const now = new Date();
      const diff = nextDraw.getTime() - now.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (publicKey && connected) {
      fetchAllData();
    }
  }, [publicKey, connected, connection]);

  const fetchAllData = async () => {
    if (!publicKey) return;
    
    setIsLoading(true);
    try {
      // Fetch market data first
      const marketService = MarketDataService.getInstance();
      const market = await marketService.getMarketData();
      setMarketData(market);

      // Fetch token balance and holder stats
      await Promise.all([
        getAlphaTokenBalance(publicKey, connection),
        getHolderStats(publicKey, connection)
      ]);

      // Calculate membership status with correct entries calculation
      await getMembershipStatus(publicKey, connection);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVipUpgrade = async (tier: VipTier) => {
    try {
      const success = await initiateSubscription(tier);
      if (success) {
        await getMembershipStatus(publicKey!, connection);
        setShowVipModal(false);
      }
    } catch (error) {
      console.error('Error upgrading to VIP:', error);
    }
  };

  // Calculate real-time entries using current market data
  const currentEntries = marketData ? calculateDailyEntries(tokenBalance, marketData.tokenPriceUSD, vipMultiplier) : null;

  // Calculate upgrade recommendations locally
  const getLocalUpgradeRecommendation = () => {
    const currentUsdValue = currentEntries?.usdValue || usdValue;
    let tokenUpgrade = null;
    let vipUpgrade = null;

    // Token upgrade recommendations
    if (currentUsdValue < 10) {
      const usdNeeded = 10 - currentUsdValue;
      const tokensNeeded = marketData ? Math.ceil(usdNeeded / marketData.tokenPriceUSD) : 0;
      tokenUpgrade = {
        tier: 'Bronze',
        usdNeeded,
        tokensNeeded
      };
    } else if (currentUsdValue < 100) {
      const usdNeeded = 100 - currentUsdValue;
      const tokensNeeded = marketData ? Math.ceil(usdNeeded / marketData.tokenPriceUSD) : 0;
      tokenUpgrade = {
        tier: 'Silver',
        usdNeeded,
        tokensNeeded
      };
    } else if (currentUsdValue < 1000) {
      const usdNeeded = 1000 - currentUsdValue;
      const tokensNeeded = marketData ? Math.ceil(usdNeeded / marketData.tokenPriceUSD) : 0;
      tokenUpgrade = {
        tier: 'Gold',
        usdNeeded,
        tokensNeeded
      };
    }

    // VIP upgrade recommendation (only if not already VIP and eligible)
    if (vipTier === 'None' && currentUsdValue >= 10) {
      const currentEntryCount = currentEntries?.baseDailyEntries || 0;
      vipUpgrade = {
        tier: 'VIP',
        price: 'Coming Soon',
        description: `Multiply your ${currentEntryCount} daily entries by 2x-5x while subscribed`,
        paymentMethods: 'SOL, ALPHA, or USDC via Solana Pay',
        multiplierIncrease: 'Up to 5x'
      };
    }

    return { tokenUpgrade, vipUpgrade };
  };

  const recommendation = getLocalUpgradeRecommendation();

  // Get benefits based on membership tier and VIP status
  const getLocalTotalBenefits = () => {
    const benefits = [];
    
    // Base membership benefits
    if (membershipTier === 'Bronze' || membershipTier === 'Silver' || membershipTier === 'Gold') {
      benefits.push('Daily reward draw eligibility');
      benefits.push('Community access');
      benefits.push('Partner discounts');
    }
    
    if (membershipTier === 'Silver' || membershipTier === 'Gold') {
      benefits.push('Higher win chances');
      benefits.push('Priority support');
    }
    
    if (membershipTier === 'Gold') {
      benefits.push('Exclusive Gold benefits');
      benefits.push('Early access to features');
    }
    
    // VIP benefits
    if (vipTier !== 'None') {
      benefits.push(`${vipMultiplier}x entry multiplier`);
      benefits.push('VIP-only rewards');
      benefits.push('Exclusive VIP events');
    }
    
    // If no benefits, show basic info
    if (benefits.length === 0) {
      benefits.push('Hold $10+ worth of $ALPHA to unlock benefits');
    }
    
    return benefits;
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-8">🔐</div>
          <h1 className="text-3xl font-bold text-white mb-4">Member Dashboard</h1>
          <p className="text-gray-300 mb-8">
            Connect your wallet to access your personalized ALPHA Club dashboard
          </p>
          <button
            onClick={() => setVisible(true)}
            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105"
          >
            🚀 Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center">
              Welcome back!
              {membershipTier !== 'None' && (
                <span className="ml-3 text-teal-400">
                  {membershipTier === 'Gold' && '👑'}
                  {membershipTier === 'Silver' && '🥈'}
                  {membershipTier === 'Bronze' && '🥉'}
                </span>
              )}
              {vipTier !== 'None' && (
                <span className="ml-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {vipTier}
                </span>
              )}
            </h1>
            <p className="text-gray-300 text-lg">
              {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <div className="text-right">
              <div className="text-sm text-gray-400">Last Updated</div>
              <div className="text-white font-semibold">{new Date().toLocaleTimeString()}</div>
            </div>
            <button 
              onClick={fetchAllData}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Market Data Banner - Moved below the fold */}
        {marketData && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl p-6 border border-blue-500/20">
              <h2 className="text-xl font-bold text-white mb-4">ALPHA Market Data</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    ${marketData.tokenPriceUSD.toFixed(8)}
                  </div>
                  <div className="text-gray-400 text-sm">Token Price</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    ${marketData.marketCapUSD.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-sm">Market Cap</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">
                    ${marketData.volume24h.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-sm">24h Volume</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${marketData.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {marketData.priceChange24h >= 0 ? '+' : ''}{marketData.priceChange24h.toFixed(2)}%
                  </div>
                  <div className="text-gray-400 text-sm">24h Change</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIP Status Banner */}
        {vipTier !== 'None' && currentSubscription?.isActive && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">💎</div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{vipTier} Active</h3>
                    <p className="text-purple-400">
                      {vipMultiplier}x multiplier active • Expires {currentSubscription.expiresAt?.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {currentEntries?.totalDailyEntries || totalDailyEntries}
                  </div>
                  <div className="text-sm text-gray-400">Total Daily Chances</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column - Membership Status FIRST */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Enhanced Membership Status - MOVED TO TOP */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6">Your Membership Status</h2>
              
              {/* Daily Entries Calculation Breakdown */}
              {currentEntries && (
                <div className="bg-gradient-to-r from-teal-900/20 to-cyan-900/20 rounded-2xl p-6 border border-teal-500/20 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">📊 Your Daily Entries</h3>
                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-gray-400">Holdings</div>
                      <div className="text-xl font-bold text-white">{tokenBalance.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">$ALPHA tokens</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400">USD Value</div>
                      <div className="text-xl font-bold text-white">${currentEntries.usdValue.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">Current value</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400">Base Entries</div>
                      <div className="text-xl font-bold text-teal-400">{currentEntries.baseDailyEntries}</div>
                      <div className="text-xs text-gray-500">$10 per entry</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400">VIP Boost</div>
                      <div className="text-xl font-bold text-purple-400">{vipMultiplier}x</div>
                      <div className="text-xs text-gray-500">Multiplier</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Base Membership */}
                <div className={`rounded-2xl p-6 border ${
                  isEligible 
                    ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/20'
                    : 'bg-gradient-to-r from-red-900/30 to-orange-900/30 border-red-500/20'
                }`}>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Base Membership: {membershipTier}
                  </h3>
                  <div className="text-2xl font-bold mb-2">
                    <span className="text-teal-400">{currentEntries?.baseDailyEntries || baseDailyEntries}</span>
                    <span className="text-gray-400 text-sm ml-2">base entries</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    1 entry per $10 USD held
                  </div>
                </div>

                {/* VIP Status */}
                <div className={`rounded-2xl p-6 border ${
                  vipTier !== 'None' 
                    ? 'bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/20'
                    : 'bg-gradient-to-r from-gray-800/30 to-gray-900/30 border-gray-600/20'
                }`}>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    VIP Status: {vipTier === 'None' ? 'Standard' : vipTier}
                  </h3>
                  <div className="text-2xl font-bold mb-2">
                    <span className="text-purple-400">{vipMultiplier}x</span>
                    <span className="text-gray-400 text-sm ml-2">multiplier</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    {vipTier === 'None' ? 'No active subscription' : 'Active subscription'}
                  </div>
                </div>
              </div>

              {/* Total Daily Chances */}
              <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 rounded-2xl p-6 border border-teal-500/20 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Total Daily Chances</h3>
                <div className="text-4xl font-bold text-teal-400 mb-2">
                  {currentEntries?.totalDailyEntries || totalDailyEntries}
                </div>
                <div className="text-gray-300 text-sm">
                  {currentEntries?.baseDailyEntries || baseDailyEntries} base × {vipMultiplier} VIP = {currentEntries?.totalDailyEntries || totalDailyEntries} total entries
                </div>
              </div>
            </div>

            {/* Holdings Overview - MOVED TO SECOND */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6">Your ALPHA Holdings</h2>
              
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="bg-black/40 rounded-2xl p-6 text-center">
                  <div className="text-sm text-gray-400 mb-2">Token Balance</div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {tokenBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-teal-400 text-sm">$ALPHA</div>
                </div>
                
                <div className="bg-black/40 rounded-2xl p-6 text-center">
                  <div className="text-sm text-gray-400 mb-2">USD Value</div>
                  <div className="text-2xl font-bold text-white mb-1">
                    ${currentEntries?.usdValue.toFixed(2) || usdValue.toFixed(2)}
                  </div>
                  <div className="text-cyan-400 text-sm">Current Value</div>
                </div>
                
                <div className="bg-black/40 rounded-2xl p-6 text-center">
                  <div className="text-sm text-gray-400 mb-2">Your Rank</div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {holderRank ? `#${holderRank}` : '--'}
                  </div>
                  <div className="text-emerald-400 text-sm">Holder Rank</div>
                </div>
              </div>

              {/* Detailed Portfolio Stats */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-black/40 rounded-2xl p-4">
                  <div className="text-gray-400 text-sm mb-2">Token Price</div>
                  <div className="text-lg font-bold text-white">
                    ${marketData ? marketData.tokenPriceUSD.toFixed(8) : (pricePerToken * solPrice).toFixed(8)}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {pricePerToken.toFixed(8)} SOL
                  </div>
                </div>
                
                <div className="bg-black/40 rounded-2xl p-4">
                  <div className="text-gray-400 text-sm mb-2">% of Supply</div>
                  <div className="text-lg font-bold text-white">
                    {percentageOfSupply ? `${percentageOfSupply.toFixed(4)}%` : '--'}
                  </div>
                  <div className="text-gray-500 text-xs">
                    Your ownership
                  </div>
                </div>
              </div>
            </div>

            {/* Upgrade Recommendations */}
            {(recommendation.tokenUpgrade || recommendation.vipUpgrade) && (
              <div className="bg-gradient-to-br from-orange-900/30 to-yellow-900/30 rounded-3xl p-8 border border-orange-500/20">
                <h2 className="text-2xl font-bold text-white mb-6">Upgrade Opportunities</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Token Upgrade */}
                  {recommendation.tokenUpgrade && (
                    <div className="bg-black/40 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        🚀 Upgrade to {recommendation.tokenUpgrade.tier}
                      </h3>
                      <div className="text-orange-400 font-bold mb-2">
                        Need ${recommendation.tokenUpgrade.usdNeeded.toFixed(2)} more
                      </div>
                      <div className="text-gray-300 text-sm mb-4">
                        Buy {recommendation.tokenUpgrade.tokensNeeded.toLocaleString()} more tokens
                      </div>
                      <a 
                        href="https://pump.fun/coin/4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-all text-center"
                      >
                        Buy More $ALPHA
                      </a>
                    </div>
                  )}

                  {/* VIP Upgrade */}
                  {recommendation.vipUpgrade && (
                    <div className="bg-black/40 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        💎 {recommendation.vipUpgrade.tier} Subscription
                      </h3>
                      <div className="text-purple-400 font-bold mb-2">
                        {recommendation.vipUpgrade.price}
                      </div>
                      <div className="text-gray-300 text-sm mb-3">
                        {recommendation.vipUpgrade.description}
                      </div>
                      <div className="text-xs text-gray-400 mb-4">
                        Payment: {recommendation.vipUpgrade.paymentMethods}
                      </div>
                      <button 
                        onClick={() => setShowVipModal(true)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-all"
                      >
                        Learn More
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Market Data - MOVED HERE (below the fold) */}
            {marketData && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-6">ALPHA Market Data</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      ${marketData.tokenPriceUSD.toFixed(8)}
                    </div>
                    <div className="text-gray-400 text-sm">Token Price</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      ${marketData.marketCapUSD.toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-sm">Market Cap</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                      ${marketData.volume24h.toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-sm">24h Volume</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${marketData.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {marketData.priceChange24h >= 0 ? '+' : ''}{marketData.priceChange24h.toFixed(2)}%
                    </div>
                    <div className="text-gray-400 text-sm">24h Change</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Daily Info & Actions */}
          <div className="space-y-6">
            
            {/* Daily Rewards Section - Using existing component */}
            <DailyRewardsSection />

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">Quick Actions</h4>
              <div className="space-y-3">
                <Link href="/rewards" className="block w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white py-3 rounded-xl font-semibold transition-all text-center">
                  🏆 View Reward History
                </Link>
                <button 
                  onClick={() => setShowVipModal(true)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-xl font-semibold transition-all"
                >
                  👑 VIP Subscription (Coming Soon)
                </button>
                <Link href="/burns" className="block w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-all text-center">
                  🔥 View Token Burns
                </Link>
              </div>
            </div>

            {/* Member Benefits */}
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-3xl p-6 border border-purple-500/20">
              <h3 className="text-lg font-bold text-white mb-4">Your Benefits</h3>
              
              <div className="space-y-2">
                {getLocalTotalBenefits().map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300 text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VIP Subscription Modal */}
      {showVipModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">VIP Subscription</h2>
                <button 
                  onClick={() => setShowVipModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">💎</div>
                <h3 className="text-xl font-bold text-white mb-4">Coming Very Soon!</h3>
                <p className="text-gray-300 mb-6">
                  VIP subscriptions will multiply your daily entries for as long as you remain both a holder and subscriber.
                </p>
                
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl p-6 border border-purple-500/20 mb-6">
                  <h4 className="text-lg font-semibold text-white mb-4">How VIP Works</h4>
                  <div className="space-y-3 text-left">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-gray-300">Your entries multiply based on your subscription tier (2x-5x)</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-gray-300">Entries adjust dynamically with token price and holdings</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-gray-300">Fair system - all entries recalculated at draw time</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-gray-300">Pay with SOL, ALPHA, or USDC via Solana Pay</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/40 rounded-xl p-4 mb-6">
                  <div className="text-sm text-gray-400 mb-2">Your Current Entries</div>
                  <div className="text-2xl font-bold text-teal-400">
                    {currentEntries?.baseDailyEntries || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    With VIP, this could be {(currentEntries?.baseDailyEntries || 0) * 2}-{(currentEntries?.baseDailyEntries || 0) * 5} entries
                  </div>
                </div>

                <button 
                  onClick={() => setShowVipModal(false)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                >
                  Got It!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Dashboard - ALPHA Club</title>
        <meta name="description" content="Your ALPHA Club member dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <DashboardView />
    </div>
  );
};

export default Dashboard;