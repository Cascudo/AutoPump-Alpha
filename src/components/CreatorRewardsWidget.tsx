// src/components/CreatorRewardsWidget.tsx - SIMPLIFIED VERSION (Vault Only)
import { FC, useState, useEffect, useCallback } from 'react';

interface CreatorRewardsData {
  vaultBalance: number;
  vaultLamports: number;
  usdValue: number;
  lastUpdated: number;
  potentialReward: number;
  potentialBurn: number;
  potentialOps: number;
  solPrice: number;
  rpcEndpoint?: string;
}

export const CreatorRewardsWidget: FC = () => {
  const [rewardsData, setRewardsData] = useState<CreatorRewardsData>({
    vaultBalance: 0,
    vaultLamports: 0,
    usdValue: 0,
    lastUpdated: 0,
    potentialReward: 0,
    potentialBurn: 0,
    potentialOps: 0,
    solPrice: 200
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Distribution ratios
  const REWARD_RATIO = 0.4;  // 40%
  const BURN_RATIO = 0.3;    // 30%
  const OPS_RATIO = 0.3;     // 30%

  const fetchSolPrice = async (): Promise<number> => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      return data.solana?.usd || 200;
    } catch (error) {
      console.warn('Failed to fetch SOL price, using fallback:', error);
      return 200;
    }
  };

  const fetchCreatorRewards = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo('🚀 Fetching creator rewards from vault...');

      // Fetch balances from our API route
      const balanceResponse = await fetch('/api/get-balances');
      const balanceData = await balanceResponse.json();

      if (!balanceData.success) {
        throw new Error(balanceData.error || 'Failed to fetch balances');
      }

      setDebugInfo(prev => prev + `\n✅ Got balances from: ${balanceData.data.rpcEndpoint}`);

      // Get SOL price
      const solPrice = await fetchSolPrice();
      setDebugInfo(prev => prev + `\n💱 SOL Price: $${solPrice}`);

      // Extract ONLY vault balance (unclaimed creator rewards)
      const { vaultBalance, vaultLamports } = balanceData.data;

      // Calculate USD values and distributions based on vault only
      const usdValue = vaultBalance * solPrice;
      const potentialReward = vaultBalance * REWARD_RATIO;
      const potentialBurn = vaultBalance * BURN_RATIO;
      const potentialOps = vaultBalance * OPS_RATIO;

      setRewardsData({
        vaultBalance,
        vaultLamports,
        usdValue,
        lastUpdated: Date.now(),
        potentialReward,
        potentialBurn,
        potentialOps,
        solPrice,
        rpcEndpoint: balanceData.data.rpcEndpoint
      });

      setDebugInfo(prev => prev + `\n✅ Creator rewards data updated!`);

    } catch (err) {
      console.error('💥 Error fetching creator rewards:', err);
      setError(`Failed to fetch creator rewards: ${err.message}`);
      setDebugInfo(prev => prev + `\n💥 Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreatorRewards();
    const interval = setInterval(fetchCreatorRewards, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [fetchCreatorRewards]);

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (isLoading && rewardsData.lastUpdated === 0) {
    return (
      <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 rounded-2xl p-6 border border-teal-500/20">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-400"></div>
          <span className="text-teal-400">Loading creator rewards...</span>
        </div>
        
        {debugInfo && (
          <div className="bg-black/40 rounded-lg p-4 mt-4">
            <div className="text-xs text-gray-400 mb-2">Debug Info:</div>
            <div className="text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
              {debugInfo}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 rounded-2xl p-6 border border-red-500/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-red-400 mb-2">API Error</h3>
            <p className="text-gray-300 text-sm">{error}</p>
          </div>
          <button 
            onClick={fetchCreatorRewards}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
        
        {debugInfo && (
          <details>
            <summary className="text-xs text-gray-500 cursor-pointer">Show Debug Info</summary>
            <div className="bg-black/40 rounded-lg p-4 mt-2">
              <div className="text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                {debugInfo}
              </div>
            </div>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 rounded-2xl p-6 border border-teal-500/20 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">💰</div>
          <div>
            <h3 className="text-xl font-bold text-white">Available Creator Rewards</h3>
            <p className="text-gray-300 text-sm">Unclaimed from Pump.fun vault</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${isLoading ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
          <span className="text-xs text-gray-400">{formatTimeAgo(rewardsData.lastUpdated)}</span>
        </div>
      </div>

      {/* RPC Info */}
      {rewardsData.rpcEndpoint && (
        <div className="mb-4 text-xs text-gray-500">
          📡 Data from: {rewardsData.rpcEndpoint.includes('syndica') ? 'Syndica' : 
                         rewardsData.rpcEndpoint.includes('mainnet-beta') ? 'Solana Mainnet' :
                         rewardsData.rpcEndpoint.includes('projectserum') ? 'Project Serum' :
                         'Alternative RPC'}
        </div>
      )}

      {/* Main Balance Display - VAULT ONLY */}
      <div className="bg-black/40 rounded-xl p-6 mb-6">
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-2">Unclaimed Creator Rewards (Vault)</div>
          <div className="text-4xl font-bold text-teal-400 mb-2">
            {rewardsData.vaultBalance.toFixed(6)} SOL
          </div>
          <div className="text-lg text-gray-300 mb-2">
            ${rewardsData.usdValue.toFixed(2)} USD
          </div>
          <div className="text-xs text-gray-500 font-mono">
            {rewardsData.vaultLamports.toLocaleString()} lamports
          </div>
          <div className="mt-3 text-xs text-teal-400">
            Ready to claim and distribute
          </div>
        </div>
      </div>

      {/* Distribution Preview */}
      <div className="space-y-4 mb-6">
        <h4 className="text-lg font-semibold text-white">When Distributed:</h4>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-900/30 rounded-lg p-4 border border-green-500/20">
            <div className="text-center">
              <div className="text-sm text-green-400 font-semibold mb-1">Holder Rewards</div>
              <div className="text-lg font-bold text-white">
                {rewardsData.potentialReward.toFixed(4)}
              </div>
              <div className="text-xs text-gray-400">40% SOL</div>
            </div>
          </div>

          <div className="bg-orange-900/30 rounded-lg p-4 border border-orange-500/20">
            <div className="text-center">
              <div className="text-sm text-orange-400 font-semibold mb-1">Token Burns</div>
              <div className="text-lg font-bold text-white">
                {rewardsData.potentialBurn.toFixed(4)}
              </div>
              <div className="text-xs text-gray-400">30% SOL</div>
            </div>
          </div>

          <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-500/20">
            <div className="text-center">
              <div className="text-sm text-purple-400 font-semibold mb-1">Operations</div>
              <div className="text-lg font-bold text-white">
                {rewardsData.potentialOps.toFixed(4)}
              </div>
              <div className="text-xs text-gray-400">30% SOL</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={fetchCreatorRewards}
          disabled={isLoading}
          className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
        </button>

        <a
          href="https://pump.fun/coin/4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl font-semibold transition-all transform hover:scale-105 text-center"
        >
          Claim on Pump.fun
        </a>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-900/20 rounded-xl border border-blue-500/20">
        <p className="text-blue-400 font-semibold text-sm">💡 How it works:</p>
        <ul className="text-gray-300 text-xs mt-2 space-y-1">
          <li>• This shows ONLY unclaimed creator rewards from Pump.fun</li>
          <li>• Claim them from the vault to your wallet</li>
          <li>• Then distribute using the manual form below</li>
          <li>• Your wallet may have other SOL from different sources</li>
        </ul>
      </div>

      {/* Success indicator */}
      <div className="absolute top-4 right-4">
        <div className="bg-black/60 rounded-full px-3 py-1 flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-300">Vault Only</span>
        </div>
      </div>
    </div>
  );
};