// src/pages/rewards.tsx - FIXED: Connect wallet button & prize pool loading
import type { NextPage } from "next";
import Head from "next/head";
import { FC, useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useMembershipStore } from '../stores/useMembershipStore';
import { googleSheetsService, type StatsData } from '../utils/googleSheetsService';
import { MarketDataService } from '../utils/marketDataService';
import { Connection, PublicKey } from '@solana/web3.js';
import Link from 'next/link';

interface RewardsData {
  totalSolAwarded: number;
  availableRewards: number;
  recentWinners: Array<{
    wallet: string;
    amount: number;
    date: string;
    prizeTx: string;
  }>;
  totalMembers: number;
  nextDrawTime: string;
}

interface MarketData {
  tokenPriceUSD: number;
  volume24h: number;
  priceChange24h: number;
  solPriceUSD: number;
}

const RewardsView: FC = () => {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [rewardsData, setRewardsData] = useState<RewardsData | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState('');
  const [vaultLoading, setVaultLoading] = useState(true);

  // FIXED: Use consistent membership store data
  const { 
    tokenBalance,
    usdValue,
    tokenEntries,
    vipBaselineEntries,
    vipMultiplier,
    totalDailyEntries,
    isEligible,
    vipActive,
    vipTier,
    membershipDisplayTier,
    isLoading: membershipLoading,
    getMembershipStatus
  } = useMembershipStore();

  // Auto-refresh membership on wallet connect
  useEffect(() => {
    if (publicKey && connected && !membershipLoading) {
      getMembershipStatus(publicKey, connection);
    }
  }, [publicKey, connected, membershipLoading, getMembershipStatus, connection]);

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

  // FIXED: Fetch creator vault balance with proper loading state
  const fetchCreatorVaultBalance = useCallback(async (): Promise<number> => {
    try {
      setVaultLoading(true);
      console.log('🏦 Fetching creator vault balance...');
      
      // First try the API
      const apiResponse = await fetch('/api/get-balances');
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        if (apiData.success && apiData.vaultBalance !== undefined) {
          console.log('✅ Vault balance from API:', apiData.vaultBalance);
          return apiData.vaultBalance;
        }
      }
      
      // Fallback: Direct blockchain query
      console.log('🔄 Falling back to direct blockchain query...');
      const CREATOR_VAULT = 'BJNJ36AQxBVoyBdZhdV1wyN7GDkro3uFwwNAxs4eQQFy';
      const vaultPublicKey = new PublicKey(CREATOR_VAULT);
      const balance = await connection.getBalance(vaultPublicKey);
      const solBalance = balance / 1e9; // Convert lamports to SOL
      
      console.log('✅ Vault balance from blockchain:', solBalance);
      return solBalance;
      
    } catch (error) {
      console.error('💥 Error fetching vault balance:', error);
      return 0; // Return 0 instead of throwing
    } finally {
      setVaultLoading(false);
    }
  }, [connection]);

  // Fetch all data on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        // Fetch data from Google Sheets and vault balance in parallel
        const [stats, vaultBalance] = await Promise.all([
          googleSheetsService.getStatsData(),
          fetchCreatorVaultBalance()
        ]);

        // Fetch market data
        const marketService = MarketDataService.getInstance();
        const market = await marketService.getMarketData();
        setMarketData(market);

        // Set rewards data
        setRewardsData({
          totalSolAwarded: stats.totalHolderPrizes,
          availableRewards: vaultBalance,
          recentWinners: stats.recentWinners,
          totalMembers: stats.totalMembers,
          nextDrawTime: '11:00 UTC Daily'
        });

        console.log('✅ Rewards data loaded successfully');

      } catch (error) {
        console.error('Error fetching rewards data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [fetchCreatorVaultBalance]);

  const getTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Less than 1h ago';
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            🏆 Reward Center
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Daily rewards for $ALPHA holders • Fair draws • Transparent burns
          </p>
        </div>

        {/* Live Rewards Overview */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-500/20 text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold text-white mb-2">Total SOL Rewarded</h3>
            <div className="text-3xl font-bold text-green-400 mb-2">
              {rewardsData ? rewardsData.totalSolAwarded.toFixed(2) : '0.00'} SOL
            </div>
         </div>

          <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-2xl p-6 border border-blue-500/20 text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-white mb-2">Available Rewards</h3>
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {vaultLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                  <span className="ml-2 text-lg">Loading...</span>
                </div>
              ) : (
                `${rewardsData?.availableRewards.toFixed(3) || '0.000'} SOL`
              )}
            </div>
            <div className="text-gray-400 text-sm">Ready for next draw</div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl p-6 border border-purple-500/20 text-center">
            <div className="text-4xl mb-4">⏰</div>
            <h3 className="text-xl font-bold text-white mb-2">Next Draw</h3>
            <div className="text-2xl font-mono font-bold text-purple-400 mb-2">
              {countdown}
            </div>
            <div className="text-gray-400 text-sm">Daily at 11:00 UTC</div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="mb-12 bg-gradient-to-r from-yellow-900/40 to-orange-900/40 rounded-2xl p-6 border border-yellow-500/20">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">📢</div>
            <div>
              <h3 className="text-lg font-bold text-yellow-200 mb-2">Daily Draw Requirements</h3>
              <p className="text-yellow-100 text-sm">
                We only draw prizes if trading volume on the token is over $30K per 24h period, 
                as the funds for rewards come from PumpFun creator rewards.
              </p>
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column - Recent Winners (2/3 width) */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-3xl p-8 border border-green-500/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <span className="mr-3">🏆</span>
                  Recent Winners
                </h3>
                <div className="text-green-400 font-semibold">
                  {rewardsData?.recentWinners.length || 0} Winners
                </div>
              </div>
              
              {rewardsData ? (
                <div className="space-y-4">
                  {rewardsData.recentWinners.slice(0, 8).map((winner, index) => (
                    <div key={index} className="bg-black/40 rounded-xl p-4 flex items-center justify-between hover:bg-black/60 transition-all">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {winner.wallet.slice(0, 4)}...{winner.wallet.slice(-4)}
                          </div>
                          <div className="text-gray-400 text-sm">{getTimeAgo(winner.date)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold">{winner.amount.toFixed(4)} SOL</div>
                        {winner.prizeTx && (
                          <a 
                            href={`https://solscan.io/tx/${winner.prizeTx}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
                          >
                            View Tx ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="text-center pt-4">
                    <Link href="/" className="text-teal-400 hover:text-teal-300 text-sm font-semibold transition-colors">
                      View Full History on Homepage →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔄</div>
                  <p className="text-gray-400">Loading recent winners...</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - User Info & VIP (1/3 width) */}
          <div className="space-y-6">

            {/* User Entry Status - FIXED: Now uses consistent membership store data */}
            {connected ? (
              <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 rounded-2xl p-6 border border-teal-500/20">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <span className="mr-2">🎯</span>
                  Your Entry Status
                </h4>
                
                <div className="space-y-4">
                  {/* Eligibility Status */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-teal-400 mb-2">
                      {isEligible ? '✅' : '❌'}
                    </div>
                    <div className="text-sm text-gray-300 font-medium">
                      {isEligible ? 'Eligible for Daily Draws' : 'Need $10+ Tokens or VIP'}
                    </div>
                  </div>

                  {/* Entry Breakdown */}
                  {isEligible && (
                    <div className="bg-black/40 rounded-xl p-4">
                      <div className="text-center mb-3">
                        <div className="text-gray-400 text-sm mb-1">Your Daily Entries</div>
                        <div className="text-2xl font-bold text-teal-400">
                          {totalDailyEntries}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Token Entries:</span>
                          <span className="text-white">{tokenEntries}</span>
                        </div>
                        {vipBaselineEntries > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">VIP Baseline:</span>
                            <span className="text-purple-400">+{vipBaselineEntries}</span>
                          </div>
                        )}
                        {vipMultiplier > 1 && (
                          <div className="flex justify-between border-t border-teal-700/30 pt-2">
                            <span className="text-gray-400">Multiplier:</span>
                            <span className="text-teal-400">{vipMultiplier}x VIP</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Holdings Info */}
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-center">
                      <div className="text-gray-400 text-xs mb-1">Token Holdings</div>
                      <div className="text-lg font-bold text-emerald-400">
                        {tokenBalance.toLocaleString()}
                      </div>
                      <div className="text-gray-500 text-xs">
                        ≈ ${usdValue.toFixed(2)} USD
                      </div>
                    </div>
                  </div>

                  {/* VIP Status */}
                  {vipActive ? (
                    <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg p-3 border border-purple-500/30">
                      <div className="text-center">
                        <div className="text-purple-400 font-semibold text-sm mb-1">
                          👑 {vipTier} VIP Active
                        </div>
                        <div className="text-purple-300 text-xs">
                          {vipMultiplier}x Multiplier
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link href="/vip" className="block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-center py-3 rounded-lg font-semibold transition-all transform hover:scale-105">
                      Upgrade to VIP 👑
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              /* FIXED: Connect Wallet CTA with working button */
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 text-center">
                <div className="text-4xl mb-4">🔐</div>
                <h4 className="text-lg font-semibold text-white mb-2">Connect Wallet</h4>
                <p className="text-gray-400 text-sm mb-4">
                  Connect your wallet to see your entry status and participate in daily draws.
                </p>
                <button 
                  onClick={() => setVisible(true)}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                >
                  Connect Wallet 🚀
                </button>
              </div>
            )}

            {/* Market Info */}
            {marketData && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-4">$ALPHA Market</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Price:</span>
                    <span className="text-white font-medium">${marketData.tokenPriceUSD.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">24h Volume:</span>
                    <span className="text-emerald-400 font-medium">${marketData.volume24h.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">24h Change:</span>
                    <span className={`font-medium ${marketData.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {marketData.priceChange24h >= 0 ? '+' : ''}{marketData.priceChange24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">Quick Actions</h4>
              <div className="space-y-3">
                <Link href="/dashboard" className="block w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white py-3 rounded-xl font-semibold text-center transition-all">
                  View Dashboard
                </Link>
                <Link href="/burns" className="block w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-3 rounded-xl font-semibold text-center transition-all">
                  View Burns
                </Link>
                <Link href="/leaderboard" className="block w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold text-center transition-all">
                  Leaderboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Rewards: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Rewards - ALPHA Club</title>
        <meta
          name="description"
          content="Daily SOL rewards for ALPHA token holders. Fair draws, transparent system."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <RewardsView />
      </main>
    </div>
  );
};

export default Rewards;