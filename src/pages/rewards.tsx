// src/pages/rewards.tsx
import type { NextPage } from "next";
import Head from "next/head";
import { FC, useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useAlphaTokenStore } from '../stores/useAlphaTokenStore';
import { useMembershipStore } from '../stores/useMembershipStore';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LiveStatsSection } from '../components/LiveStatsSection';
import { CreatorRewardsWidget } from '../components/CreatorRewardsWidget';
import { googleSheetsService } from '../utils/googleSheetsService';
import { MarketDataService } from '../utils/marketDataService';
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

const RewardsView: FC = () => {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [isLoading, setIsLoading] = useState(false);
  const [rewardsData, setRewardsData] = useState<RewardsData | null>(null);
  const [marketData, setMarketData] = useState<any>(null);
  const [countdown, setCountdown] = useState('');
  
  const { 
    tokenBalance, 
    usdValue, 
    getAlphaTokenBalance 
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

  // Calculate daily entries based on $10 per entry rule
  const calculateDailyEntries = (tokenBalance: number, tokenPriceUSD: number) => {
    const usdValue = tokenBalance * tokenPriceUSD;
    return Math.floor(usdValue / 10); // 1 entry per $10 USD
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
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        // Fetch burn data from Google Sheets
        const stats = await googleSheetsService.getStatsData();
        
        // Fetch unclaimed creator rewards from blockchain (vault balance)
        const balanceResponse = await fetch('/api/get-balances');
        const balanceData = await balanceResponse.json();
        
        let unclaimedRewards = 0;
        if (balanceData.success) {
          unclaimedRewards = balanceData.data.vaultBalance; // This is the actual unclaimed SOL
        }

        // Fetch market data
        const marketService = MarketDataService.getInstance();
        const market = await marketService.getMarketData();
        setMarketData(market);

        // Set rewards data with correct unclaimed amount
        setRewardsData({
          totalSolAwarded: stats.totalHolderPrizes,
          availableRewards: unclaimedRewards, // Real vault balance from blockchain
          recentWinners: stats.recentWinners,
          totalMembers: stats.totalMembers,
          nextDrawTime: '11:00 UTC Daily'
        });

        // Fetch user data if connected
        if (publicKey && connected) {
          await Promise.all([
            getAlphaTokenBalance(publicKey, connection),
            getMembershipStatus(publicKey, connection)
          ]);
        }

      } catch (error) {
        console.error('Error fetching rewards data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [publicKey, connected]);

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

  // Calculate real-time entries using current market data
  const currentEntries = marketData && connected 
    ? calculateDailyEntries(tokenBalance, marketData.tokenPriceUSD) * vipMultiplier
    : totalDailyEntries;

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
              {rewardsData ? `${rewardsData.totalSolAwarded.toFixed(4)} SOL` : 'Loading...'}
            </div>
            <div className="text-gray-400 text-sm">Since launch</div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-2xl p-6 border border-yellow-500/20 text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-white mb-2">Unclaimed Creator Rewards</h3>
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {rewardsData && rewardsData.availableRewards > 0 
                ? `${rewardsData.availableRewards.toFixed(4)} SOL` 
                : <div className="animate-pulse">Loading...</div>
              }
            </div>
            <div className="text-gray-400 text-sm">Vault balance ready for draws</div>
          </div>
          
          <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-2xl p-6 border border-cyan-500/20 text-center">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-white mb-2">Active Members</h3>
            <div className="text-3xl font-bold text-cyan-400 mb-2">
              <div className="animate-pulse">Loading...</div>
            </div>
            <div className="text-gray-400 text-sm">Fetching holder count</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column - Draw Status & History */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Today's Draw Status */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">⏰</span>
                Next Draw Status
              </h2>
              
              {connected ? (
                <div className="space-y-6">
                  {/* User's Entry Status */}
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-black/40 rounded-2xl p-6 text-center">
                      <div className="text-gray-400 text-sm mb-2">Your Entries</div>
                      <div className="text-3xl font-bold text-teal-400 mb-2">{currentEntries}</div>
                      <div className="text-sm text-gray-500">
                        {baseDailyEntries} base × {vipMultiplier}x VIP
                      </div>
                    </div>
                    
                    <div className="bg-black/40 rounded-2xl p-6 text-center">
                      <div className="text-gray-400 text-sm mb-2">Next Draw</div>
                      <div className="text-2xl font-bold text-cyan-400 mb-2">{countdown}</div>
                      <div className="text-sm text-gray-500">11:00 UTC on Pump.fun Livestream</div>
                    </div>
                    
                    <div className="bg-black/40 rounded-2xl p-6 text-center">
                      <div className="text-gray-400 text-sm mb-2">Status</div>
                      <div className={`text-2xl font-bold mb-2 ${isEligible ? 'text-green-400' : 'text-red-400'}`}>
                        {isEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}
                      </div>
                      <div className="text-sm text-gray-500">{membershipTier} Member</div>
                    </div>
                  </div>

                  {/* Entry Calculation Breakdown */}
                  <div className="bg-gradient-to-r from-teal-900/20 to-cyan-900/20 rounded-2xl p-6 border border-teal-500/20">
                    <h4 className="text-lg font-semibold text-white mb-4">📊 How Your Entries Are Calculated</h4>
                    <div className="grid md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-gray-400">Holdings</div>
                        <div className="text-lg font-bold text-white">{tokenBalance.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">$ALPHA tokens</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-400">USD Value</div>
                        <div className="text-lg font-bold text-white">${usdValue.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">Current value</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-400">Base Entries</div>
                        <div className="text-lg font-bold text-teal-400">{baseDailyEntries}</div>
                        <div className="text-xs text-gray-500">$10 per entry</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-400">VIP Boost</div>
                        <div className="text-lg font-bold text-purple-400">{vipMultiplier}x</div>
                        <div className="text-xs text-gray-500">Multiplier</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-6">🔌</div>
                  <h3 className="text-xl font-bold text-white mb-4">Connect Your Wallet</h3>
                  <p className="text-gray-400 text-lg mb-6">View your reward status and daily entries</p>
                  <button
                    onClick={() => setVisible(true)}
                    className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105"
                  >
                    Connect Wallet
                  </button>
                </div>
              )}
            </div>

            {/* Recent Winners */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">🎉</span>
                Recent Winners
              </h2>
              
              {rewardsData && rewardsData.recentWinners.length > 0 ? (
                <div className="space-y-4">
                  {rewardsData.recentWinners.slice(0, 5).map((winner, index) => (
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
                            href={winner.prizeTx}
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

          {/* Right Column - VIP Info & Actions */}
          <div className="space-y-8">

            {/* VIP Features Coming Soon */}
            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-3xl p-6 border border-purple-500/20">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">💎</div>
                <h3 className="text-xl font-bold text-white">VIP Subscriptions</h3>
                <p className="text-purple-400 font-semibold">Coming Very Soon</p>
              </div>

              <div className="space-y-4">
                <div className="bg-black/40 rounded-xl p-4">
                  <h4 className="text-white font-semibold mb-2">🚀 VIP Benefits</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• 2x-5x entry multipliers</li>
                    <li>• Exclusive VIP-only draws</li>
                    <li>• Priority support</li>
                    <li>• Special partner benefits</li>
                  </ul>
                </div>

                <div className="bg-black/40 rounded-xl p-4">
                  <h4 className="text-white font-semibold mb-2">💳 Payment Options</h4>
                  <div className="text-gray-300 text-sm space-y-1">
                    <div>• SOL (Solana Pay)</div>
                    <div>• $ALPHA tokens</div>
                    <div>• USDC stablecoin</div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl p-4 border border-purple-500/20">
                  <h4 className="text-white font-semibold mb-2">⚖️ Fair & Dynamic</h4>
                  <p className="text-gray-300 text-xs">
                    Your entries multiply as long as you hold $ALPHA and maintain VIP subscription. 
                    All entries recalculated at draw time for complete fairness.
                  </p>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">How Rewards Work</h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                  <div>
                    <div className="text-white font-medium">Hold $ALPHA</div>
                    <div className="text-gray-400 text-sm">$10+ worth = 1+ daily entries</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                  <div>
                    <div className="text-white font-medium">Daily Draws</div>
                    <div className="text-gray-400 text-sm">11:00 UTC on Pump.fun livestreams</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                  <div>
                    <div className="text-white font-medium">Win SOL</div>
                    <div className="text-gray-400 text-sm">From creator rewards pool</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-teal-900/20 rounded-xl border border-teal-500/20">
                <div className="text-teal-400 font-semibold text-sm">💡 Pro Tips:</div>
                <ul className="text-gray-300 text-xs mt-2 space-y-1">
                  <li>• More tokens = more entries = better odds</li>
                  <li>• VIP multiplies your base entries</li>
                  <li>• All draws are provably fair</li>
                </ul>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <Link href="/dashboard" className="block w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white py-3 rounded-xl font-semibold transition-all text-center">
                  📊 View Dashboard
                </Link>
                <a 
                  href="https://pump.fun/coin/4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-xl font-semibold transition-all text-center"
                >
                  🚀 Buy $ALPHA
                </a>
                <Link href="/burns" className="block w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-all text-center">
                  🔥 View Token Burns
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA - Updated with correct entry logic */}
        <div className="mt-12">
          <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 rounded-2xl p-8 border border-teal-500/20 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Join the Daily Draws?</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Hold $ALPHA tokens to participate in daily reward draws. Get 1 entry for every $10 worth of tokens held!
            </p>
            <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-lg font-semibold text-teal-400">$10 = 1 Entry</div>
                <div className="text-sm text-gray-400">Minimum to participate</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-teal-400">$100 = 10 Entries</div>
                <div className="text-sm text-gray-400">10x better odds</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-teal-400">$1000 = 100 Entries</div>
                <div className="text-sm text-gray-400">100x better odds</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-400">VIP = 2x-5x</div>
                <div className="text-sm text-gray-400">Multiply all entries</div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Live Stats Section */}
        <div className="mt-12">
          <LiveStatsSection />
        </div>
      </div>
    </div>
  );
};

const Rewards: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Rewards - ALPHA Club | Daily SOL Rewards for $ALPHA Holders</title>
        <meta
          name="description"
          content="Join ALPHA Club daily rewards system. Hold $ALPHA tokens to earn SOL rewards daily at 11:00 UTC. Fair draws, transparent burns, and VIP multipliers coming soon."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <RewardsView />
    </div>
  );
};

export default Rewards;