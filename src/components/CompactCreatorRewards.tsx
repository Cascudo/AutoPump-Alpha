// src/components/CompactCreatorRewards.tsx - Updated for WSOL token account API
import { FC, useState, useEffect } from 'react';

interface CreatorRewardsData {
  balance: number;
  estimatedNextReward: number;
  usdValue: number;
  solPrice: number;
  lastUpdated: Date;
  source: string;
  method: string;
}

interface CompactCreatorRewardsProps {
  className?: string;
}

export const CompactCreatorRewards: FC<CompactCreatorRewardsProps> = ({ className = '' }) => {
  const [rewardsData, setRewardsData] = useState<CreatorRewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCreatorRewards();
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchCreatorRewards, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchCreatorRewards = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🏦 Fetching creator vault balance from API...');
      
      // Use the updated API that reads WSOL token account
      const response = await fetch('/api/get-balances');
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API returned unsuccessful response');
      }

      // Use the new API response structure with dynamic pricing
      const balance = data.data.vaultBalance || 0;
      const solPrice = data.data.solPrice || 145;
      const usdValue = data.data.usdValue || (balance * solPrice);
      const method = data.data.method || 'Unknown';
      
      setRewardsData({
        balance,
        estimatedNextReward: balance * 0.4, // 40% goes to rewards
        usdValue,
        solPrice,
        method,
        lastUpdated: new Date(),
        source: 'API'
      });
      
      console.log('✅ Creator rewards loaded from API:', balance, 'SOL');
      
    } catch (err) {
      console.error('💥 Error fetching creator rewards:', err);
      setError(`Failed to load creator rewards: ${err.message}`);
      
      // Don't set fallback data - better to show error
      setRewardsData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatSOL = (amount: number): string => {
    return amount.toFixed(4);
  };

  const formatUSD = (usdValue: number): string => {
    return usdValue.toFixed(0);
  };

  const getSourceIcon = (source: string): string => {
    switch (source) {
      case 'API': return '🔌';
      case 'Blockchain': return '⛓️';
      case 'Fallback': return '🔄';
      default: return '📊';
    }
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-500/20 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-700 rounded w-32"></div>
            <div className="h-4 bg-gray-700 rounded w-16"></div>
          </div>
          <div className="space-y-4">
            <div className="bg-black/30 rounded-xl p-4">
              <div className="h-4 bg-gray-700 rounded mb-2 w-20 mx-auto"></div>
              <div className="h-8 bg-gray-700 rounded mb-1 w-24 mx-auto"></div>
              <div className="h-3 bg-gray-700 rounded w-16 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gradient-to-br from-red-900/30 to-red-800/30 rounded-2xl p-6 border border-red-500/20 ${className}`}>
        <div className="text-center">
          <div className="text-red-400 text-lg font-semibold mb-2">⚠️ Connection Error</div>
          <div className="text-red-300 text-sm mb-3">{error}</div>
          <button 
            onClick={fetchCreatorRewards}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!rewardsData) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-500/20 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center">
          <span className="mr-2">💰</span>
          Creator Rewards
        </h3>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <span>{getSourceIcon(rewardsData.source)}</span>
          <span>{rewardsData.method}</span>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Current Balance */}
        <div className="bg-black/30 rounded-xl p-4">
          <div className="text-center">
            <div className="text-gray-400 text-sm mb-1">Available Now</div>
            <div className="text-3xl font-bold text-green-400 mb-1">
              {formatSOL(rewardsData.balance)} SOL
            </div>
            <div className="text-gray-500 text-xs">
              ≈ ${formatUSD(rewardsData.usdValue)} USD
            </div>
          </div>
        </div>

        {/* Distribution Breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-teal-400 text-xs mb-1">40% Rewards</div>
            <div className="text-sm font-bold text-teal-300">
              {formatSOL(rewardsData.balance * 0.4)}
            </div>
          </div>
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-orange-400 text-xs mb-1">30% Burns</div>
            <div className="text-sm font-bold text-orange-300">
              {formatSOL(rewardsData.balance * 0.3)}
            </div>
          </div>
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-purple-400 text-xs mb-1">30% Ops</div>
            <div className="text-sm font-bold text-purple-300">
              {formatSOL(rewardsData.balance * 0.3)}
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className={`rounded-lg p-3 text-center ${
          rewardsData.balance > 0.1 
            ? 'bg-green-900/20 border border-green-500/20' 
            : 'bg-yellow-900/20 border border-yellow-500/20'
        }`}>
          <div className={`font-semibold text-sm ${
            rewardsData.balance > 0.1 ? 'text-green-200' : 'text-yellow-200'
          }`}>
            {rewardsData.balance > 0.1 
              ? '✅ Ready for Distribution' 
              : '⏳ Accumulating Fees'
            }
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {rewardsData.balance > 0.1 
              ? 'Sufficient balance for rewards' 
              : 'Waiting for more trading activity'
            }
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <a
            href="https://pump.fun/coin/4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all transform hover:scale-105"
          >
            <span>🚀</span>
            <span>View on Pump.fun</span>
          </a>
        </div>

        {/* Last Updated */}
        <div className="text-center text-gray-500 text-xs">
          Updated: {rewardsData.lastUpdated.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};