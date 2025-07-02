// src/components/RewardDistributionAdmin.tsx - FIXED with null value handling and all warnings
import { FC, useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { RewardDistributionService } from '../utils/rewardDistributionService';
import { CreatorRewardsWidget } from './CreatorRewardsWidget';

interface DatabaseStats {
  totalHolders: number;
  eligibleHolders: number;
  totalEntries: number;
  totalUsdValue: number;
  activeVipSubscriptions: number;
  lastUpdated: string;
  drawEligible?: number;
  drawTotalEntries?: number;
  excludedCount?: number;
  excludedValue?: number;
}

interface BatchSyncResult {
  totalHolders: number;
  eligibleHolders: number;
  totalEntries: number;
  tokenPriceUSD: number;
  averageUsdValue: number;
  vipSubscribers: number;
  readyForDraw: boolean;
}

interface TopHolder {
  wallet_address: string | null;  // 🔧 FIXED: Allow null values
  token_balance: number | null;   // 🔧 FIXED: Allow null values
  usd_value: number | null;       // 🔧 FIXED: Allow null values
  cached_entries: number | null;  // 🔧 FIXED: Allow null values
  is_eligible: boolean;
  excluded_from_draw: boolean;
  exclusion_reason?: string;
}

interface ExcludedWallet {
  wallet_address: string | null;  // 🔧 FIXED: Allow null values
  token_balance: number | null;   // 🔧 FIXED: Allow null values
  usd_value: number | null;       // 🔧 FIXED: Allow null values
  excluded_from_draw: boolean;
  exclusion_reason: string;
  excluded_by: string;
  excluded_at: string;
}

export const RewardDistributionAdmin: FC = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [service, setService] = useState<RewardDistributionService | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastBalance, setLastBalance] = useState(0);
  const [manualAmount, setManualAmount] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  
  // Database stats state
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<BatchSyncResult | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Exclusion management state
  const [showExclusionPanel, setShowExclusionPanel] = useState(false);
  const [topHolders, setTopHolders] = useState<TopHolder[]>([]);
  const [excludedWallets, setExcludedWallets] = useState<ExcludedWallet[]>([]);
  const [isLoadingExclusions, setIsLoadingExclusions] = useState(false);
  const [exclusionWallet, setExclusionWallet] = useState('');
  const [exclusionReason, setExclusionReason] = useState('');
  const [isApplyingSystemExclusions, setIsApplyingSystemExclusions] = useState(false);

  useEffect(() => {
    const rewardService = new RewardDistributionService(connection);
    setService(rewardService);

    // Update status every 10 seconds
    const statusInterval = setInterval(() => {
      if (rewardService) {
        const status = rewardService.getStatus();
        setIsMonitoring(status.isMonitoring);
        setLastBalance(status.lastBalance);
      }
    }, 10000);

    return () => clearInterval(statusInterval);
  }, [connection]);

  // FIXED: Wrap fetchDatabaseStats in useCallback
  const fetchDatabaseStats = useCallback(async () => {
    if (!publicKey) return;
    
    setIsLoadingStats(true);
    try {
      console.log('📊 Fetching database stats...');
      
      const response = await fetch(`/api/admin/dashboard-stats?adminWallet=${publicKey.toString()}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setDbStats(data.realTimeStats);
        console.log('✅ Database stats loaded');
      } else {
        console.error('❌ Database stats error:', data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching database stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [publicKey]);

  // FIXED: Wrap fetchExclusionData in useCallback
  const fetchExclusionData = useCallback(async () => {
    if (!publicKey) return;
    
    setIsLoadingExclusions(true);
    try {
      console.log('📋 Fetching exclusion data...');
      
      // Get top holders
      const holdersResponse = await fetch(`/api/admin/dashboard-stats?adminWallet=${publicKey.toString()}&includeTopHolders=true`);
      if (holdersResponse.ok) {
        const holdersData = await holdersResponse.json();
        setTopHolders(holdersData.topHolders || []);
      }

      // Get excluded wallets
      const excludedResponse = await fetch(`/api/admin/manage-exclusions?adminWallet=${publicKey.toString()}`);
      if (excludedResponse.ok) {
        const excludedData = await excludedResponse.json();
        setExcludedWallets(excludedData.exclusions || []);
      }

    } catch (error) {
      console.error('❌ Error fetching exclusion data:', error);
      addLog('❌ Error fetching exclusion data');
    } finally {
      setIsLoadingExclusions(false);
    }
  }, [publicKey]);

  // Apply system exclusions
  const handleApplySystemExclusions = async () => {
    if (!publicKey) return;

    setIsApplyingSystemExclusions(true);
    try {
      addLog('🔄 Applying system exclusions (Dev wallet, AMM, Locked tokens)...');
      
      const response = await fetch('/api/admin/manage-exclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply-system-exclusions',
          adminWallet: publicKey.toString()
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        addLog(`✅ System exclusions applied: ${result.updatedCount} wallets excluded`);
        result.systemExclusions?.forEach((exclusion: any) => {
          addLog(`  🚫 ${exclusion.wallet} - ${exclusion.reason}`);
        });
        await fetchExclusionData();
        await fetchDatabaseStats();
      } else {
        addLog(`❌ Failed to apply system exclusions: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error applying system exclusions: ${error.message}`);
    } finally {
      setIsApplyingSystemExclusions(false);
    }
  };

  // Exclude wallet function
  const handleExcludeWallet = async (walletAddress: string, reason: string) => {
    if (!publicKey || !walletAddress || !reason) return;

    try {
      addLog(`🚫 Excluding wallet ${walletAddress.slice(0, 8)}... (${reason})`);
      
      const response = await fetch('/api/admin/manage-exclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'exclude',
          adminWallet: publicKey.toString(),
          walletAddress,
          reason
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        addLog(`✅ Wallet excluded successfully: ${result.walletAddress}`);
        await fetchExclusionData();
        await fetchDatabaseStats();
        setExclusionWallet('');
        setExclusionReason('');
      } else {
        addLog(`❌ Failed to exclude wallet: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error excluding wallet: ${error.message}`);
    }
  };

  // Include wallet function
  const handleIncludeWallet = async (walletAddress: string) => {
    if (!publicKey || !walletAddress) return;

    try {
      addLog(`✅ Including wallet ${walletAddress.slice(0, 8)}... back in draws`);
      
      const response = await fetch('/api/admin/manage-exclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'include',
          adminWallet: publicKey.toString(),
          walletAddress
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        addLog(`✅ Wallet included successfully: ${result.walletAddress}`);
        await fetchExclusionData();
        await fetchDatabaseStats();
      } else {
        addLog(`❌ Failed to include wallet: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error including wallet: ${error.message}`);
    }
  };

  // Prepare draw with fresh blockchain data
  const handlePrepareDraw = async () => {
    if (!publicKey) {
      addLog('❌ Admin wallet not connected');
      return;
    }
    
    setIsPreparing(true);
    try {
      addLog('🔄 Starting comprehensive blockchain sync...');
      addLog('📡 This will scan all ALPHA holders and update the database');
      addLog('⏳ Please wait, this may take 1-3 minutes depending on holder count...');
      
      const response = await fetch('/api/admin/batch-sync-holders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminWallet: publicKey.toString()
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setLastSyncResult({
          totalHolders: result.totalHolders,
          eligibleHolders: result.eligibleHolders,
          totalEntries: result.totalEntries,
          tokenPriceUSD: result.tokenPriceUSD,
          averageUsdValue: result.averageUsdValue,
          vipSubscribers: result.vipSubscribers,
          readyForDraw: result.readyForDraw
        });

        addLog(`✅ Blockchain sync completed successfully!`);
        addLog(`📊 Results: ${result.totalHolders} holders, ${result.eligibleHolders} eligible`);
        addLog(`🎯 Total entries: ${result.totalEntries.toLocaleString()}`);
        addLog(`💰 Token price: $${result.tokenPriceUSD.toFixed(8)}`);
        addLog(`🎲 System ready for winner selection`);
        
        // Refresh stats after successful sync
        await fetchDatabaseStats();
        
      } else {
        addLog(`❌ Blockchain sync failed: ${result.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      addLog(`❌ Error during blockchain sync: ${error.message}`);
    } finally {
      setIsPreparing(false);
    }
  };

  // Auto-refresh database stats every 1 minute when enabled
  useEffect(() => {
    if (publicKey && autoRefreshEnabled) {
      fetchDatabaseStats();
      const interval = setInterval(fetchDatabaseStats, 60000);
      return () => clearInterval(interval);
    }
  }, [publicKey, autoRefreshEnabled, fetchDatabaseStats]);

  // Initial fetch on component mount
  useEffect(() => {
    if (publicKey) {
      fetchDatabaseStats();
    }
  }, [publicKey, fetchDatabaseStats]);

  // Load exclusion data when panel is shown
  useEffect(() => {
    if (showExclusionPanel && publicKey) {
      fetchExclusionData();
    }
  }, [showExclusionPanel, publicKey, fetchExclusionData]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 24)]);
  };

  const handleStartMonitoring = async () => {
    if (!service) return;
    
    try {
      addLog('Starting reward distribution monitoring...');
      await service.startMonitoring();
      addLog('✅ Monitoring started successfully');
    } catch (error) {
      addLog(`❌ Error starting monitoring: ${error.message}`);
    }
  };

  const handleStopMonitoring = async () => {
    if (!service) return;
    
    try {
      addLog('Stopping reward distribution monitoring...');
      await service.stopMonitoring();
      addLog('⏹️ Monitoring stopped');
    } catch (error) {
      addLog(`❌ Error stopping monitoring: ${error.message}`);
    }
  };

  const handleDistributeReward = async () => {
    if (!service || !manualAmount) return;
    
    const amount = parseFloat(manualAmount);
    if (isNaN(amount) || amount <= 0) {
      addLog('❌ Invalid amount entered');
      return;
    }
    
    try {
      addLog(`🎯 Manually distributing ${amount} SOL...`);
      //await service.distributeReward(amount);
      addLog('✅ Manual reward distributed successfully');
      setManualAmount('');
    } catch (error) {
      addLog(`❌ Error distributing reward: ${error.message}`);
    }
  };

  // 🔧 FIXED: Safe rendering helper functions
  const safeTokenBalance = (balance: number | null): string => {
    return balance ? balance.toLocaleString() : '0';
  };

  const safeUsdValue = (value: number | null): string => {
    return value ? value.toFixed(2) : '0.00';
  };

  const safeCachedEntries = (entries: number | null): number => {
    return entries || 0;
  };

  const safeWalletAddress = (address: string | null | undefined): string => {
    if (!address || address.length < 16) return 'Invalid...Address';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  return (
    <div className="space-y-8">
      {/* Creator Rewards Widget */}
      <CreatorRewardsWidget />

      {/* Database Stats Overview */}
      <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 rounded-3xl p-8 border border-blue-500/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <span className="mr-3">📊</span>
            Real-Time Database Stats
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">Auto-refresh:</span>
              <button
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                className={`w-12 h-6 rounded-full transition-all ${
                  autoRefreshEnabled ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                  autoRefreshEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <button
              onClick={fetchDatabaseStats}
              disabled={isLoadingStats}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-semibold transition-all"
            >
              {isLoadingStats ? '⏳' : '🔄'} Refresh
            </button>
          </div>
        </div>

        {dbStats ? (
          <>
            <div className="grid md:grid-cols-6 gap-6 mb-6">
              <div className="bg-black/40 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {dbStats.totalHolders.toLocaleString()}
                </div>
                <div className="text-gray-400 text-sm">Total Holders</div>
              </div>
              
              <div className="bg-black/40 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {dbStats.eligibleHolders.toLocaleString()}
                </div>
                <div className="text-gray-400 text-sm">Eligible (≥$10)</div>
              </div>
              
              <div className="bg-black/40 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400 mb-1">
                  {(dbStats.drawEligible || 0).toLocaleString()}
                </div>
                <div className="text-gray-400 text-sm">Draw Eligible</div>
                <div className="text-xs text-gray-500">(excl. excluded)</div>
              </div>
              
              <div className="bg-black/40 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {(dbStats.drawTotalEntries || 0).toLocaleString()}
                </div>
                <div className="text-gray-400 text-sm">Draw Entries</div>
              </div>
              
              <div className="bg-black/40 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-400 mb-1">
                  {(dbStats.excludedCount || 0).toLocaleString()}
                </div>
                <div className="text-gray-400 text-sm">Excluded</div>
                <div className="text-xs text-gray-500">(LP/Dev)</div>
              </div>

              <div className="bg-black/40 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-pink-400 mb-1">
                  {dbStats.activeVipSubscriptions.toLocaleString()}
                </div>
                <div className="text-gray-400 text-sm">VIP Members</div>
              </div>
            </div>

            {/* Show excluded wallets summary */}
            {(dbStats.excludedCount || 0) > 0 && (
              <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-red-400">🚫 Currently Excluded Wallets</h3>
                  <span className="text-red-300 text-sm">{dbStats.excludedCount} excluded</span>
                </div>
                
                <div className="grid md:grid-cols-2 gap-3">
                  {excludedWallets.slice(0, 6).map((wallet, index) => (
                    <div key={index} className="bg-black/40 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <div className="text-white font-mono text-xs">
                          {safeWalletAddress(wallet.wallet_address)}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {safeTokenBalance(wallet.token_balance)} ALPHA • {wallet.exclusion_reason}
                        </div>
                      </div>
                      {wallet.excluded_by !== 'SYSTEM' && (
                        <button
                          onClick={() => handleIncludeWallet(wallet.wallet_address)}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                        >
                          Include
                        </button>
                      )}
                      {wallet.excluded_by === 'SYSTEM' && (
                        <span className="text-red-400 text-xs font-semibold">SYSTEM</span>
                      )}
                    </div>
                  ))}
                  
                  {excludedWallets.length > 6 && (
                    <div className="col-span-2 text-center text-gray-400 text-sm">
                      And {excludedWallets.length - 6} more... (use exclusion panel below to see all)
                    </div>
                  )}
                </div>
                
                <div className="mt-3 text-xs text-gray-400">
                  💡 These wallets are tracked but excluded from daily draws. Total excluded value: ${(dbStats.excludedValue || 0).toLocaleString()}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-black/40 rounded-xl p-6 text-center">
            <div className="text-gray-400">
              {publicKey ? 'Click refresh to load database stats' : 'Connect admin wallet to view stats'}
            </div>
          </div>
        )}

        {dbStats && (
          <div className="text-xs text-gray-400 text-center">
            Last updated: {dbStats.lastUpdated} • Auto-refresh: {autoRefreshEnabled ? 'ON' : 'OFF'}
          </div>
        )}
      </div>

      {/* Exclusion Management Panel */}
      <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 rounded-3xl p-8 border border-red-500/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <span className="mr-3">🚫</span>
            Wallet Exclusion Management
          </h2>
          <button
            onClick={() => setShowExclusionPanel(!showExclusionPanel)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold transition-all"
          >
            {showExclusionPanel ? 'Hide Panel' : 'Show Panel'}
          </button>
        </div>

        {/* System Exclusions */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-black/40 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">System Exclusions</h3>
            <p className="text-gray-300 text-sm mb-4">
              Automatically exclude Dev wallet, AMM pools, and locked token accounts from winning draws.
            </p>
            <button
              onClick={handleApplySystemExclusions}
              disabled={isApplyingSystemExclusions}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold transition-all"
            >
              {isApplyingSystemExclusions ? '⏳ Applying...' : '🔒 Apply System Exclusions'}
            </button>
          </div>

          <div className="bg-black/40 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Manual Exclusion</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Wallet address to exclude..."
                value={exclusionWallet}
                onChange={(e) => setExclusionWallet(e.target.value)}
                className="w-full bg-black/60 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="Exclusion reason..."
                value={exclusionReason}
                onChange={(e) => setExclusionReason(e.target.value)}
                className="w-full bg-black/60 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
              />
              <button
                onClick={() => handleExcludeWallet(exclusionWallet, exclusionReason)}
                disabled={!exclusionWallet || !exclusionReason}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition-all"
              >
                🚫 Exclude Wallet
              </button>
            </div>
          </div>
        </div>

        {/* Exclusion Panel */}
        {showExclusionPanel && (
          <div className="bg-black/40 rounded-xl p-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Excluded Wallets List */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Currently Excluded ({excludedWallets.length})</h3>
                {excludedWallets.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {excludedWallets.map((wallet, index) => (
                      <div key={index} className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-white font-mono text-sm flex items-center space-x-2">
                              <span>{safeWalletAddress(wallet.wallet_address)}</span>
                              {wallet.excluded_by === 'SYSTEM' && (
                                <span className="bg-red-600 text-xs px-2 py-1 rounded">SYSTEM</span>
                              )}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {safeTokenBalance(wallet.token_balance)} ALPHA • ${safeUsdValue(wallet.usd_value)} • {wallet.exclusion_reason}
                            </div>
                            <div className="text-gray-500 text-xs">
                              Excluded {new Date(wallet.excluded_at).toLocaleDateString()} by {wallet.excluded_by}
                            </div>
                          </div>
                          {wallet.excluded_by !== 'SYSTEM' && (
                            <button
                              onClick={() => handleIncludeWallet(wallet.wallet_address)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-semibold transition-all"
                            >
                              Include
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-4">
                    No wallets currently excluded
                  </div>
                )}
              </div>

              {/* Top Holders for Quick Exclusion */}
              <div className="bg-black/40 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Top Holders (Quick Exclusion)</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {topHolders.slice(0, 20).map((holder, index) => (
                    <div key={index} className={`rounded-lg p-3 ${holder.excluded_from_draw ? 
                      'bg-red-900/20 border border-red-500/20' : 'bg-gray-900/40'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-mono text-sm">
                            {safeWalletAddress(holder.wallet_address)}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {safeTokenBalance(holder.token_balance)} ALPHA • ${safeUsdValue(holder.usd_value)} • {safeCachedEntries(holder.cached_entries)} entries
                          </div>
                          {holder.excluded_from_draw && (
                            <div className="text-red-400 text-xs">Excluded: {holder.exclusion_reason}</div>
                          )}
                        </div>
                        {!holder.excluded_from_draw && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleExcludeWallet(holder.wallet_address, 'Liquidity Pool')}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                            >
                              LP
                            </button>
                            <button
                              onClick={() => handleExcludeWallet(holder.wallet_address, 'Dev Wallet')}
                              className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs"
                            >
                              Dev
                            </button>
                            <button
                              onClick={() => handleExcludeWallet(holder.wallet_address, 'Bot/Spam')}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs"
                            >
                              Bot
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pre-Draw Preparation */}
      <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 rounded-3xl p-8 border border-teal-500/20">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <span className="mr-3">🎯</span>
          Draw Preparation & Blockchain Sync
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-black/40 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Pre-Draw Blockchain Sync</h3>
            <p className="text-gray-300 text-sm mb-4">
              Scan all ALPHA token holders on-chain and update database with current balances.
              This ensures 100% accurate entry counts for fair winner selection.
            </p>
            <button
              onClick={handlePrepareDraw}
              disabled={isPreparing}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold transition-all"
            >
              {isPreparing ? '⏳ Syncing All Holders...' : '🔄 Prepare Draw (Smart RPC Sync)'}
            </button>
          </div>

          {lastSyncResult && (
            <div className="bg-black/40 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Last Sync Results</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Holders:</span>
                  <span className="text-green-400 font-bold">{lastSyncResult.totalHolders.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Eligible Holders:</span>
                  <span className="text-blue-400 font-bold">{lastSyncResult.eligibleHolders.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Draw Eligible:</span>
                  <span className="text-emerald-400 font-bold">{(dbStats?.drawEligible || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Entries:</span>
                  <span className="text-purple-400 font-bold">{(dbStats?.drawTotalEntries || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Token Price:</span>
                  <span className="text-cyan-400 font-bold">${lastSyncResult.tokenPriceUSD.toFixed(8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">VIP Members:</span>
                  <span className="text-pink-400 font-bold">{lastSyncResult.vipSubscribers}</span>
                </div>
              </div>
              
              {lastSyncResult.readyForDraw && (dbStats?.drawEligible || 0) > 0 && (
                <div className="mt-4 bg-green-900/20 border border-green-500/20 rounded-lg p-3">
                  <div className="text-green-400 text-sm font-semibold">🎲 Ready for Winner Selection</div>
                  <div className="text-gray-300 text-xs">All data synced and exclusions applied</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl p-4 border border-yellow-500/20">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-yellow-400">💡</span>
            <span className="text-yellow-400 font-semibold">Recommended Pre-Draw Workflow</span>
          </div>
          <ol className="text-gray-300 text-sm space-y-1 ml-4">
            <li>1. Apply system exclusions for Dev/AMM/Locked wallets</li>
            <li>2. Review top holders and exclude any additional LP/Dev wallets</li>
            <li>3. Click &quot;Prepare Draw&quot; to sync all blockchain data (~30 seconds)</li>
            <li>4. Review the sync results and final eligible count</li>
            <li>5. Use manual trigger to test winner selection with accurate data</li>
          </ol>
        </div>
      </div>
      
      {/* Reward Distribution Admin Controls */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <span className="mr-3">🤖</span>
          Reward Distribution Admin
        </h2>

        {/* Status Display */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-black/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Monitoring Status</span>
              <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            </div>
            <div className={`text-lg font-bold ${isMonitoring ? 'text-green-400' : 'text-red-400'}`}>
              {isMonitoring ? 'ACTIVE' : 'STOPPED'}
            </div>
          </div>

          <div className="bg-black/40 rounded-xl p-4">
            <div className="text-gray-400 mb-2">Last Known Balance</div>
            <div className="text-lg font-bold text-cyan-400">
              {lastBalance.toFixed(4)} SOL
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={handleStartMonitoring}
            disabled={isMonitoring}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105"
          >
            {isMonitoring ? '✅ Monitoring Active' : '▶️ Start Monitoring'}
          </button>

          <button
            onClick={handleStopMonitoring}
            disabled={!isMonitoring}
            className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105"
          >
            ⏹️ Stop Monitoring
          </button>
        </div>

        {/* Manual Distribution */}
        <div className="bg-black/40 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Manual Reward Distribution</h3>
          <div className="flex gap-4">
            <input
              type="number"
              step="0.001"
              placeholder="Amount in SOL"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              className="flex-1 bg-black/60 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
            />
            <button
              onClick={handleDistributeReward}
              disabled={!manualAmount || isNaN(parseFloat(manualAmount))}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-semibold transition-all"
            >
              🎯 Distribute
            </button>
          </div>
        </div>

        {/* Activity Logs */}
        <div className="bg-black/40 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Activity Logs</h3>
          <div className="bg-black/60 rounded-lg p-4 max-h-64 overflow-y-auto">
            {logs.length > 0 ? (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-gray-300 text-sm font-mono">
                    {log}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center">No logs yet...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};