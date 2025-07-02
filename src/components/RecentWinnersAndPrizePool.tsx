// src/components/RecentWinnersAndPrizePool.tsx - Updated to use Google Sheets data
// FIXED: useEffect dependency warning
import { FC, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { googleSheetsService, type StatsData } from '../utils/googleSheetsService';

interface Winner {
  date: string;
  wallet: string;
  amount: number;
  txSignature?: string;
  isVip?: boolean;
  vipTier?: string;
}

interface PrizePoolData {
  currentPool: number;
  estimatedNext: number;
  totalDistributed: number;
  lastUpdated: Date;
  source: string;
}

interface RecentWinnersProps {
  className?: string;
  showPrizePool?: boolean;
  maxWinners?: number;
}

export const RecentWinnersAndPrizePool: FC<RecentWinnersProps> = ({ 
  className = '', 
  showPrizePool = true,
  maxWinners = 5 
}) => {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [prizePool, setPrizePool] = useState<PrizePoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // FIXED: Wrap loadDataFromGoogleSheets in useCallback
  const loadDataFromGoogleSheets = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🏆 Loading winners and prize data from Google Sheets...');
      
      // Get stats data from Google Sheets (same source as homepage)
      const statsData: StatsData = await googleSheetsService.getStatsData();
      
      // Transform recent winners data
      const recentWinners: Winner[] = statsData.recentWinners.slice(0, maxWinners).map(winner => ({
        date: winner.date,
        wallet: winner.wallet,
        amount: winner.amount,
        txSignature: winner.prizeTx,
        // Add VIP detection logic based on your business rules
        isVip: Math.random() > 0.7, // Placeholder - replace with actual VIP detection
        vipTier: Math.random() > 0.5 ? 'Gold' : 'Silver' // Placeholder
      }));

      setWinners(recentWinners);

      // Set prize pool data if requested
      if (showPrizePool) {
        const prizeData: PrizePoolData = {
          currentPool: 0.5, // You can calculate this from vault balance
          estimatedNext: 0.3, // Based on creator rewards accumulation
          totalDistributed: statsData.totalRewardsDistributed,
          lastUpdated: new Date(statsData.lastUpdated),
          source: 'Google Sheets'
        };
        setPrizePool(prizeData);
      }

      console.log('✅ Successfully loaded data from Google Sheets');
      
    } catch (err) {
      console.error('💥 Error loading Google Sheets data:', err);
      setError('Failed to load recent winners data');
      
      // Fallback to empty arrays rather than mock data
      setWinners([]);
      if (showPrizePool) {
        setPrizePool(null);
      }
    } finally {
      setLoading(false);
    }
  }, [maxWinners, showPrizePool]);

  useEffect(() => {
    loadDataFromGoogleSheets();
  }, [loadDataFromGoogleSheets]);

  const formatWallet = (wallet: string): string => {
    if (wallet.length < 8) return wallet;
    return `${wallet.substring(0, 4)}...${wallet.substring(wallet.length - 4)}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVipBadge = (isVip: boolean, vipTier?: string) => {
    if (!isVip) return null;
    
    const tierColors = {
      'Silver': 'bg-gray-500',
      'Gold': 'bg-yellow-500',
      'Platinum': 'bg-purple-500'
    };
    
    const colorClass = tierColors[vipTier as keyof typeof tierColors] || 'bg-teal-500';
    
    return (
      <span className={`inline-block px-2 py-1 text-xs font-bold text-white rounded-full ${colorClass} ml-2`}>
        {vipTier || 'VIP'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-gray-700 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700 ${className}`}>
        <div className="text-center text-red-400">
          <p className="text-lg font-semibold mb-2">Unable to load data</p>
          <p className="text-sm text-gray-400">{error}</p>
          <button 
            onClick={loadDataFromGoogleSheets}
            className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700 ${className}`}>
      {/* Prize Pool Section */}
      {showPrizePool && prizePool && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <span className="text-2xl mr-3">💰</span>
            Prize Pool
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-black/40 rounded-xl p-4 text-center">
              <div className="text-gray-400 text-sm mb-1">Current Pool</div>
              <div className="text-2xl font-bold text-teal-400">
                {prizePool.currentPool.toFixed(2)} SOL
              </div>
            </div>
            <div className="bg-black/40 rounded-xl p-4 text-center">
              <div className="text-gray-400 text-sm mb-1">Est. Next Draw</div>
              <div className="text-2xl font-bold text-cyan-400">
                {prizePool.estimatedNext.toFixed(2)} SOL
              </div>
            </div>
            <div className="bg-black/40 rounded-xl p-4 text-center">
              <div className="text-gray-400 text-sm mb-1">Total Distributed</div>
              <div className="text-2xl font-bold text-emerald-400">
                {prizePool.totalDistributed.toFixed(2)} SOL
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Winners Section */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <span className="text-2xl mr-3">🏆</span>
          Recent Winners
        </h2>
        
        {winners.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-lg mb-2">No recent winners data</div>
            <div className="text-gray-500 text-sm">Check back later for winner updates</div>
          </div>
        ) : (
          <div className="space-y-4">
            {winners.map((winner, index) => (
              <div 
                key={`${winner.wallet}-${winner.date}-${index}`}
                className="bg-black/40 rounded-xl p-4 border border-gray-700/50 hover:border-teal-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-full flex items-center justify-center text-black font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="flex items-center">
                        <span className="text-white font-mono text-sm">
                          {formatWallet(winner.wallet)}
                        </span>
                        {getVipBadge(winner.isVip, winner.vipTier)}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {formatDate(winner.date)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-teal-400 font-bold text-lg">
                      +{winner.amount.toFixed(3)} SOL
                    </div>
                    {winner.txSignature && (
                      <Link 
                        href={`https://solscan.io/tx/${winner.txSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 text-xs underline"
                      >
                        View TX
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Data Source Attribution */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="text-gray-500 text-xs text-center">
          Data updated from Google Sheets • Last updated: {prizePool ? formatDate(prizePool.lastUpdated.toISOString()) : 'N/A'}
        </div>
      </div>
    </div>
  );
};