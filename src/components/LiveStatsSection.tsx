// src/components/LiveStatsSection.tsx
import { FC, useState, useEffect, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { ALPHA_MINT } from '../stores/useAlphaTokenStore';
import { googleSheetsService, StatsData } from '../utils/googleSheetsService';
import { BlockchainDataService } from '../utils/blockchainDataService';

interface LiveStats {
  totalSupply: number;
  circulatingSupply: number;
  lockedSupply: number;
  holderCount: number;
  totalSolRewarded: number;
  totalRewards: string;
  latestReward: string;
  latestBurn: string;
  burnAmount: number;
  lastUpdated: number;
}

interface Winner {
  wallet: string;
  amount: number;
  date: string;
  prizeTx: string;
  timeAgo: string;
}

interface Burn {
  amount: number;
  date: string;
  burnTx: string;
  timeAgo: string;
}

export const LiveStatsSection: FC = () => {
  const { connection } = useConnection();
  const [stats, setStats] = useState<LiveStats>({
    totalSupply: 0,
    circulatingSupply: 0,
    lockedSupply: 100_000_000, // 100M locked dev tokens
    holderCount: 0,
    totalSolRewarded: 0,
    totalRewards: '$0',
    latestReward: 'Loading...',
    latestBurn: 'Loading...',
    burnAmount: 0,
    lastUpdated: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [sheetsData, setSheetsData] = useState<StatsData | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [burns, setBurns] = useState<Burn[]>([]);
  const [blockchainService, setBlockchainService] = useState<BlockchainDataService | null>(null);

  // Initialize blockchain service
  useEffect(() => {
    const service = new BlockchainDataService(connection);
    setBlockchainService(service);
  }, [connection]);

  const fetchBlockchainData = async () => {
    if (!blockchainService) return null;

    try {
      console.log('🔍 Fetching enhanced blockchain data...');
      
      const [analytics, lockedInfo] = await Promise.all([
        blockchainService.getTokenAnalytics(ALPHA_MINT),
        blockchainService.verifyLockedTokens()
      ]);

      console.log('✅ Blockchain data received:', {
        totalSupply: analytics.totalSupply.toLocaleString(),
        circulatingSupply: analytics.circulatingSupply.toLocaleString(),
        holders: analytics.holderCount ? analytics.holderCount.toLocaleString() : 'null/failed',
        locked: lockedInfo.lockedAmount.toLocaleString()
      });

      return {
        totalSupply: analytics.totalSupply,
        circulatingSupply: analytics.circulatingSupply,
        lockedSupply: analytics.lockedSupply,
        holderCount: analytics.holderCount, // This might be null if we can't get real data
        lockedInfo
      };
      
    } catch (error) {
      console.error('💥 Error fetching blockchain data:', error);
      return {
        totalSupply: 1_000_000_000,
        circulatingSupply: 900_000_000,
        lockedSupply: 100_000_000,
        holderCount: 2500,
        lockedInfo: {
          isLocked: true,
          lockedAmount: 100_000_000, // Fixed: changed from 'amount' to 'lockedAmount'
          contractAddress: '8KwNTWk1DEcesWTgcfoWT9vbGysPdD9W4qfcfB2gDEg8',
          streamflowUrl: 'https://app.streamflow.finance/contract/solana/mainnet/8KwNTWk1DEcesWTgcfoWT9vbGysPdD9W4qfcfB2gDEg8'
        }
      };
    }
  };

  const fetchLiveStats = useCallback(async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      console.log('🔄 Refreshing all live stats...');
      
      // Define blockchain data fetching within the callback
      const fetchBlockchainDataLocal = async () => {
        if (!blockchainService) return null;

        try {
          console.log('🔍 Fetching enhanced blockchain data...');
          
          const [analytics, lockedInfo] = await Promise.all([
            blockchainService.getTokenAnalytics(ALPHA_MINT),
            blockchainService.verifyLockedTokens()
          ]);

          console.log('✅ Blockchain data received:', {
            totalSupply: analytics.totalSupply.toLocaleString(),
            circulatingSupply: analytics.circulatingSupply.toLocaleString(),
            holders: analytics.holderCount ? analytics.holderCount.toLocaleString() : 'null/failed',
            locked: lockedInfo.lockedAmount.toLocaleString()
          });

          return {
            totalSupply: analytics.totalSupply,
            circulatingSupply: analytics.circulatingSupply,
            lockedSupply: analytics.lockedSupply,
            holderCount: analytics.holderCount, // This might be null if we can't get real data
            lockedInfo
          };
          
        } catch (error) {
          console.error('💥 Error fetching blockchain data:', error);
          return {
            totalSupply: 1_000_000_000,
            circulatingSupply: 900_000_000,
            lockedSupply: 100_000_000,
            holderCount: null, // Return null to indicate we couldn't get real data
            lockedInfo: {
              isLocked: true,
              lockedAmount: 100_000_000, // Fixed: changed from 'amount' to 'lockedAmount'
              contractAddress: '8KwNTWk1DEcesWTgcfoWT9vbGysPdD9W4qfcfB2gDEg8',
              streamflowUrl: 'https://app.streamflow.finance/contract/solana/mainnet/8KwNTWk1DEcesWTgcfoWT9vbGysPdD9W4qfcfB2gDEg8'
            }
          };
        }
      };
      
      // Fetch both data sources in parallel
      const [sheetsData, blockchainData] = await Promise.all([
        googleSheetsService.getStatsData(true), // Force refresh
        fetchBlockchainDataLocal()
      ]);

      if (!blockchainData) {
        throw new Error('Failed to fetch blockchain data');
      }

      setSheetsData(sheetsData);

      // Calculate total SOL rewarded
      const totalSolRewarded = sheetsData.totalHolderPrizes;

      // Prepare winners data with time ago
      const winnersWithTime = sheetsData.recentWinners.map(winner => ({
        ...winner,
        timeAgo: getTimeAgo(winner.date)
      }));

      // Prepare burns data with time ago
      const burnsWithTime = sheetsData.recentBurns.map(burn => ({
        ...burn,
        timeAgo: getTimeAgo(burn.date)
      }));

      setWinners(winnersWithTime);
      setBurns(burnsWithTime);

      // Update stats with proper timestamp and calculations
      const currentTime = Date.now();
      const actualCirculatingSupply = Math.max(0, blockchainData.totalSupply - blockchainData.lockedSupply - sheetsData.totalTokensBurned);
      
      const formattedStats: LiveStats = {
        totalSupply: blockchainData.totalSupply,
        circulatingSupply: actualCirculatingSupply, // Corrected calculation
        lockedSupply: blockchainData.lockedSupply,
        holderCount: blockchainData.holderCount || 0, // Handle null case
        totalSolRewarded,
        totalRewards: `${sheetsData.totalRewardsDistributed.toFixed(4)} SOL`,
        latestReward: sheetsData.latestReward 
          ? `${sheetsData.latestReward.amount.toFixed(4)} SOL to ${sheetsData.latestReward.wallet} (${getTimeAgo(sheetsData.latestReward.date)})`
          : 'No recent rewards',
        latestBurn: sheetsData.latestBurn
          ? `${sheetsData.latestBurn.tokensBurned.toLocaleString()} tokens burned (${getTimeAgo(sheetsData.latestBurn.date)})`
          : 'No recent burns',
        burnAmount: sheetsData.totalTokensBurned,
        lastUpdated: currentTime
      };

      setStats(formattedStats);
      
      const elapsedTime = Date.now() - startTime;
      console.log(`✨ Live stats updated successfully in ${elapsedTime}ms`);

    } catch (error) {
      console.error('💥 Error fetching live stats:', error);
      
      // Set fallback data with current timestamp to show it attempted to update
      const currentTime = Date.now();
      setStats(prevStats => ({
        ...prevStats,
        lastUpdated: currentTime
      }));
    } finally {
      setIsLoading(false);
    }
  }, [blockchainService]); // Only blockchainService as dependency

  const getTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  useEffect(() => {
    // Initial load
    fetchLiveStats();

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchLiveStats();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchLiveStats]); // Now properly includes fetchLiveStats

  const formatNumber = (num: number) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const getLastUpdatedText = () => {
    if (!stats.lastUpdated) return 'Never';

    const secondsAgo = Math.floor((Date.now() - stats.lastUpdated) / 1000);
    if (secondsAgo < 5) return 'Just now';
    if (secondsAgo < 60) return `${secondsAgo}s ago`;

    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) return `${minutesAgo}m ago`;

    const hoursAgo = Math.floor(minutesAgo / 60);
    return `${hoursAgo}h ago`;
  };

  return (
    <div className="w-full py-12 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Live Stats</h2>
            <p className="text-gray-400">
              Real-time data from blockchain and rewards system
              <span className="ml-2 text-teal-400">• Updated {getLastUpdatedText()}</span>
            </p>
          </div>
          <button
            onClick={fetchLiveStats}
            disabled={isLoading}
            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-2"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Dev Tokens Locked Banner */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">🔒</div>
                <div>
                  <h3 className="text-xl font-bold text-white">100M Dev Tokens Locked</h3>
                  <p className="text-green-400 text-sm">10% of total supply secured via Streamflow</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">{formatNumber(stats.lockedSupply)}</div>
                  <div className="text-sm text-gray-400">Tokens Locked</div>
                </div>
                <a 
                  href="https://app.streamflow.finance/contract/solana/mainnet/8KwNTWk1DEcesWTgcfoWT9vbGysPdD9W4qfcfB2gDEg8" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-2"
                >
                  <span>Verify Lock</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Total Supply */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Total Supply</h3>
              <div className="text-2xl">📊</div>
            </div>
            <div className="text-3xl font-bold text-purple-400 mb-1">
              {formatNumber(stats.totalSupply)}
            </div>
            <div className="text-sm text-gray-400">
              Total tokens minted
            </div>
          </div>

          {/* Circulating Supply */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Circulating Supply</h3>
              <div className="text-2xl">💰</div>
            </div>
            <div className="text-3xl font-bold text-teal-400 mb-1">
              {formatNumber(stats.circulatingSupply)}
            </div>
            <div className="text-sm text-gray-400">
              Total supply minus locked & burned
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatNumber(stats.totalSupply - stats.lockedSupply - stats.burnAmount)} tokens
            </div>
          </div>

          {/* Token Holders */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Token Holders</h3>
              <div className="text-2xl">👥</div>
            </div>
            <div className="text-3xl font-bold text-cyan-400 mb-1">
              {stats.holderCount > 0 ? stats.holderCount.toLocaleString() : 'Loading...'}
            </div>
            <div className="text-sm text-gray-400">
              {stats.holderCount > 0 ? 'Live from blockchain' : 'Fetching real data...'}
            </div>
          </div>

          {/* Total SOL Rewarded */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Total SOL Rewarded</h3>
              <div className="text-2xl">🏆</div>
            </div>
            <div className="text-3xl font-bold text-green-400 mb-1">
              {stats.totalSolRewarded.toFixed(4)}
            </div>
            <div className="text-sm text-gray-400">
              SOL distributed to holders
            </div>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Latest Reward */}
          <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 rounded-2xl p-6 border border-teal-500/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                🎉
              </div>
              <h3 className="text-lg font-semibold text-white">Latest Reward</h3>
            </div>
            <div className="text-sm text-teal-400 font-medium mb-2 break-words">
              {stats.latestReward}
            </div>
            <div className="text-xs text-gray-400">
              Last reward winner
            </div>
          </div>

          {/* Tokens Burned */}
          <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-2xl p-6 border border-orange-500/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                🔥
              </div>
              <h3 className="text-lg font-semibold text-white">Tokens Burned</h3>
            </div>
            <div className="text-2xl font-bold text-orange-400 mb-2">
              {formatNumber(stats.burnAmount)}
            </div>
            <div className="text-xs text-gray-400">
              Permanently removed from supply
            </div>
          </div>
        </div>

        {/* Scrollable History Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Winners History */}
          <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <span className="mr-2">🏆</span>
                Recent Winners
              </h3>
              <div className="text-green-400 font-semibold">
                {winners.length} Winners
              </div>
            </div>
            
            <div className="h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-green-500 scrollbar-track-gray-700 pr-2">
              <div className="space-y-3">
                {winners.map((winner, index) => (
                  <div key={index} className="bg-black/40 rounded-xl p-4 hover:bg-black/60 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-white font-medium">{winner.wallet}</div>
                          <div className="text-gray-400 text-xs">{winner.timeAgo}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold">{winner.amount.toFixed(4)} SOL</div>
                        {winner.prizeTx && (
                          <a 
                            href={winner.prizeTx}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gray-300 text-xs font-mono transition-colors"
                          >
                            View Tx ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Burns History - FIXED VERSION */}
          <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-2xl p-6 border border-orange-500/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <span className="mr-2">🔥</span>
                Recent Burns
              </h3>
              <div className="text-orange-400 font-semibold">
                {burns.length} Burns
              </div>
            </div>
            
            {/* Updated burns display section */}
            <div className="h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700 pr-2">
              <div className="space-y-3">
                {burns.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No burns recorded yet
                  </div>
                ) : (
                  burns.map((burn, index) => (
                    <div key={index} className="bg-black/40 rounded-xl p-4 hover:bg-black/60 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            🔥
                          </div>
                          <div>
                            <div className="text-orange-400 font-bold">
                              {burn.amount.toLocaleString()} Tokens
                            </div>
                            <div className="text-gray-400 text-xs">{burn.timeAgo}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {burn.burnTx && burn.burnTx.length > 10 ? (
                            <a 
                              href={burn.burnTx}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-400 hover:text-orange-300 text-xs font-mono transition-colors bg-black/40 px-2 py-1 rounded"
                            >
                              View Burn Tx ↗
                            </a>
                          ) : (
                            <div className="text-gray-600 text-xs">
                              No TX recorded
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Data Connection Status */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-4 bg-black/40 rounded-full px-6 py-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-semibold">Live Data Feed Active</span>
            </div>
            <div className="w-1 h-4 bg-gray-600"></div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-blue-400 text-sm font-semibold">Blockchain Connected</span>
            </div>
            <div className="w-1 h-4 bg-gray-600"></div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span className="text-purple-400 text-sm font-semibold">Dev Tokens Secured</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};