// src/pages/daily-draw.tsx
// Dedicated page for conducting fair daily draws

import type { NextPage } from "next";
import Head from "next/head";
import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AdminGuard } from '../components/AdminGuard';

interface EligibleWallet {
  wallet_address: string;
  token_balance: number;
  usd_value: number;
  cached_entries: number;
  is_eligible: boolean;
  excluded_from_draw: boolean;
  vip_tier?: string;
}

interface DrawResult {
  winnerWallet: string;
  winnerEntries: number;
  winnerUsdValue: number;
  winnerTokenBalance: number;
  randomNumber: number;
  totalEntries: number;
  totalEligibleWallets: number;
  prizeAmount: number;
  drawTimestamp: string;
  entryDetails: Array<{
    wallet: string;
    startEntry: number;
    endEntry: number;
    entries: number;
    usdValue: number;
  }>;
}

interface SyncStats {
  lastSyncTime: string;
  totalHolders: number;
  eligibleHolders: number;
  excludedCount: number;
  tokenPrice: number;
  syncDuration: number;
}

const DailyDraw: NextPage = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  
  // Draw state
  const [eligibleWallets, setEligibleWallets] = useState<EligibleWallet[]>([]);
  const [isLoadingEligible, setIsLoadingEligible] = useState(false);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Prize and stats
  const [prizeAmount, setPrizeAmount] = useState<number>(0); // Will be loaded from creator rewards
  const [isLoadingPrize, setIsLoadingPrize] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  
  // Draw animation
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [currentAnimationWallet, setCurrentAnimationWallet] = useState<string>('');

  // Load current creator rewards (prize amount) - FIXED: Use actual API
  const loadCreatorRewards = useCallback(async () => {
    if (!publicKey) return;
    
    setIsLoadingPrize(true);
    try {
      console.log('💰 Loading creator rewards for prize amount...');
      
      // Use the same API that CreatorRewardsWidget uses
      const response = await fetch('/api/get-balances');
      const data = await response.json();

      if (data.success) {
        // Calculate 40% of vault balance for rewards (matches your existing logic)
        const vaultBalance = data.data.vaultBalance || 0;
        const rewardAllocation = vaultBalance * 0.4; // 40% for holder rewards
        
        setPrizeAmount(rewardAllocation);
        console.log(`💰 Prize amount loaded: ${rewardAllocation.toFixed(6)} SOL (40% of ${vaultBalance.toFixed(6)} SOL vault)`);
      } else {
        console.error('❌ Failed to load creator rewards:', data.error);
        setPrizeAmount(0);
      }
    } catch (error) {
      console.error('❌ Error loading creator rewards:', error);
      setPrizeAmount(0);
    } finally {
      setIsLoadingPrize(false);
    }
  }, [publicKey]);

  // Load latest sync statistics
  const loadSyncStats = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      const response = await fetch(`/api/admin/dashboard-stats?adminWallet=${publicKey.toString()}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setSyncStats({
          lastSyncTime: data.timestamp,
          totalHolders: data.realTimeStats.totalHolders,
          eligibleHolders: data.realTimeStats.eligibleHolders,
          excludedCount: data.exclusionStats?.totalExcluded || 0,
          tokenPrice: 0.00001818, // Would get from market data
          syncDuration: 0 // Would get from last sync
        });
      }
    } catch (error) {
      console.error('❌ Error loading sync stats:', error);
    }
  }, [publicKey]);

  // Load eligible wallets (FIXED: Properly exclude blocked wallets)
  const loadEligibleWallets = useCallback(async () => {
    if (!publicKey) return;
    
    setIsLoadingEligible(true);
    try {
      console.log('🔄 Loading eligible wallets for draw...');
      console.log('🚫 CRITICAL: Filtering out excluded wallets...');
      
      const response = await fetch('/api/admin/manage-exclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'eligible',
          adminWallet: publicKey.toString()
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // CRITICAL FIX: Double-check exclusions
        const eligibleWallets = (result.eligibleWallets || []).filter(wallet => 
          wallet.is_eligible === true && 
          wallet.excluded_from_draw === false &&
          wallet.cached_entries > 0
        );
        
        setEligibleWallets(eligibleWallets);
        
        console.log(`✅ Loaded ${eligibleWallets.length} eligible wallets (excluded blocked wallets)`);
        console.log(`🚫 Filtered out ${(result.eligibleWallets?.length || 0) - eligibleWallets.length} excluded/ineligible wallets`);
        
        // Log first few for verification
        eligibleWallets.slice(0, 3).forEach(wallet => {
          console.log(`  ✅ ${wallet.wallet_address.slice(0, 8)}... - ${wallet.cached_entries} entries (excluded: ${wallet.excluded_from_draw})`);
        });
        
        // Also get latest sync stats and prize amount
        await loadSyncStats();
        await loadCreatorRewards();
      } else {
        console.error('❌ Failed to load eligible wallets:', result.error);
      }
    } catch (error) {
      console.error('❌ Error loading eligible wallets:', error);
    } finally {
      setIsLoadingEligible(false);
    }
  }, [publicKey, loadSyncStats, loadCreatorRewards]);

  // Cryptographically secure random number generation
  const generateSecureRandom = (max: number): number => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return Math.floor((array[0] / 4294967295) * max) + 1;
  };

  // Conduct the draw with fair entry distribution
  const conductDraw = async () => {
    if (!publicKey || eligibleWallets.length === 0) {
      alert('No eligible wallets for draw');
      return;
    }

    if (prizeAmount <= 0) {
      alert('Please set a valid prize amount');
      return;
    }

    setIsDrawing(true);
    setIsAnimating(true);
    setDrawResult(null);
    
    try {
      console.log('🎲 Starting fair winner selection...');
      console.log(`🏆 Prize Amount: ${prizeAmount} SOL`);
      
      // Calculate total entries and create entry distribution
      const entryDetails: Array<{
        wallet: string;
        startEntry: number;
        endEntry: number;
        entries: number;
        usdValue: number;
        tokenBalance: number;
        vipTier: string;
      }> = [];
      
      let currentEntry = 1;
      let totalEntries = 0;
      
      // Build entry ranges for each eligible wallet
      for (const wallet of eligibleWallets) {
        if (wallet.cached_entries > 0) {
          const startEntry = currentEntry;
          const endEntry = currentEntry + wallet.cached_entries - 1;
          
          entryDetails.push({
            wallet: wallet.wallet_address,
            startEntry,
            endEntry,
            entries: wallet.cached_entries,
            usdValue: wallet.usd_value,
            tokenBalance: wallet.token_balance,
            vipTier: wallet.vip_tier || 'None'
          });
          
          currentEntry += wallet.cached_entries;
          totalEntries += wallet.cached_entries;
          
          console.log(`📋 ${wallet.wallet_address.slice(0, 8)}... entries ${startEntry}-${endEntry} (${wallet.cached_entries} entries)`);
        }
      }
      
      console.log(`🎯 Total entries in draw: ${totalEntries.toLocaleString()}`);
      
      if (totalEntries === 0) {
        alert('No entries available for draw');
        return;
      }
      
      // Animate the selection process
      const animationDuration = 3000; // 3 seconds
      const animationSteps = 30;
      const stepDuration = animationDuration / animationSteps;
      
      for (let i = 0; i < animationSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, stepDuration));
        
        // Show random wallets during animation
        const randomWallet = entryDetails[Math.floor(Math.random() * entryDetails.length)];
        setCurrentAnimationWallet(randomWallet.wallet);
        setAnimationProgress((i + 1) / animationSteps * 100);
      }
      
      // Generate cryptographically secure random number
      const winningNumber = generateSecureRandom(totalEntries);
      console.log(`🎲 Winning number: ${winningNumber} out of ${totalEntries}`);
      
      // Find the winner based on entry ranges
      let winner: typeof entryDetails[0] | null = null;
      
      for (const entry of entryDetails) {
        if (winningNumber >= entry.startEntry && winningNumber <= entry.endEntry) {
          winner = entry;
          break;
        }
      }
      
      if (!winner) {
        throw new Error('No winner found - this should not happen');
      }
      
      console.log(`🏆 WINNER: ${winner.wallet.slice(0, 8)}... with entry #${winningNumber}`);
      console.log(`💰 Winner details: ${winner.entries} entries, $${winner.usdValue.toFixed(2)} USD value`);
      
      // Create draw result
      const result: DrawResult = {
        winnerWallet: winner.wallet,
        winnerEntries: winner.entries,
        winnerUsdValue: winner.usdValue,
        winnerTokenBalance: winner.tokenBalance,
        randomNumber: winningNumber,
        totalEntries,
        totalEligibleWallets: entryDetails.length,
        prizeAmount,
        drawTimestamp: new Date().toISOString(),
        entryDetails: entryDetails.map(e => ({
          wallet: e.wallet,
          startEntry: e.startEntry,
          endEntry: e.endEntry,
          entries: e.entries,
          usdValue: e.usdValue
        }))
      };
      
      setDrawResult(result);
      setCurrentAnimationWallet(winner.wallet);
      
      // Log to database (optional)
      await logDrawResult(result);
      
    } catch (error) {
      console.error('❌ Draw failed:', error);
      alert(`Draw failed: ${error.message}`);
    } finally {
      setIsDrawing(false);
      setIsAnimating(false);
      setAnimationProgress(0);
    }
  };

  // Log draw result to database
  const logDrawResult = async (result: DrawResult) => {
    try {
      // You could create an API endpoint to log draw results
      console.log('📝 Draw result logged:', {
        winner: result.winnerWallet.slice(0, 8) + '...',
        prize: result.prizeAmount + ' SOL',
        entries: result.totalEntries,
        timestamp: result.drawTimestamp
      });
    } catch (error) {
      console.error('❌ Failed to log draw result:', error);
    }
  };

  // Calculate win probability for a wallet
  const calculateWinProbability = (entries: number, totalEntries: number): string => {
    if (totalEntries === 0) return '0.00';
    const probability = (entries / totalEntries) * 100;
    return probability.toFixed(4);
  };

  // Load data on component mount
  useEffect(() => {
    if (publicKey) {
      loadEligibleWallets(); // This will also load creator rewards and sync stats
    }
  }, [publicKey, loadEligibleWallets]);

  const totalEligibleEntries = eligibleWallets.reduce((sum, w) => sum + w.cached_entries, 0);
  const totalEligibleUsdValue = eligibleWallets.reduce((sum, w) => sum + w.usd_value, 0);

  return (
    <div>
      <Head>
        <title>Daily Draw - ALPHA Club</title>
        <meta name="description" content="ALPHA Club daily draw - Fair winner selection" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      
      <AdminGuard requireAuth={true}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          {/* Header */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl p-6 border border-purple-500/20">
              <h1 className="text-3xl font-bold text-white mb-2">
                🎲 Daily Draw - Fair Winner Selection
              </h1>
              <p className="text-purple-400">
                Provably fair draw system using cryptographic randomness and transparent entry distribution
              </p>
            </div>
          </div>

          {/* Prize & Sync Stats */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            
            {/* Prize Configuration */}
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-500/20">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="mr-2">🏆</span>
                Current Prize Pool
              </h2>
              
              <div className="space-y-4">
                  <div className="bg-black/40 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      {prizeAmount.toFixed(6)} SOL
                    </div>
                    <div className="text-gray-400 text-sm mb-2">
                      ≈ ${(prizeAmount * 240).toFixed(2)} USD (@ $240/SOL)
                    </div>
                    <div className="text-xs text-gray-500">
                      {isLoadingPrize ? 'Loading from creator vault...' : 'From creator vault (40% of available balance)'}
                    </div>
                  </div>
                
                <button
                  onClick={loadCreatorRewards}
                  disabled={isLoadingPrize}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  {isLoadingPrize ? '⏳ Loading...' : '🔄 Refresh Prize Amount'}
                </button>
                
                <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-3">
                  <div className="text-yellow-400 text-xs font-semibold mb-1">💡 Prize Source</div>
                  <div className="text-gray-300 text-xs">
                    Prize is 40% of unclaimed creator vault balance. The vault contains {(prizeAmount / 0.4).toFixed(6)} SOL total.
                    Creator rewards widget shows complete breakdown.
                  </div>
                </div>
              </div>
            </div>

            {/* Latest Sync Stats */}
            <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-2xl p-6 border border-blue-500/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <span className="mr-2">📊</span>
                  Latest Sync Results
                </h2>
                <button
                  onClick={loadSyncStats}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                >
                  Refresh
                </button>
              </div>
              
              {syncStats ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Holders:</span>
                    <span className="text-blue-400 font-bold">{syncStats.totalHolders.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Eligible Holders:</span>
                    <span className="text-cyan-400 font-bold">{syncStats.eligibleHolders.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Excluded:</span>
                    <span className="text-red-400 font-bold">{syncStats.excludedCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Sync:</span>
                    <span className="text-gray-300 text-sm">{new Date(syncStats.lastSyncTime).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-center py-4">
                  Click refresh to load sync stats
                </div>
              )}
            </div>
          </div>

          {/* Draw Controls */}
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl p-6 border border-purple-500/20 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <span className="mr-2">🎯</span>
                Draw Controls
              </h2>
              <button
                onClick={loadEligibleWallets}
                disabled={isLoadingEligible}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                {isLoadingEligible ? '⏳' : '🔄'} Refresh Eligible Wallets
              </button>
            </div>

            {/* CRITICAL: Exclusion Warning */}
            <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4 mb-6">
              <div className="text-red-400 text-sm font-semibold mb-2">🚫 Exclusion Safety Check</div>
              <div className="text-gray-300 text-sm">
                This draw will ONLY include wallets that are:
                <br />• ✅ Eligible (≥$10 USD worth of ALPHA)
                <br />• ✅ Not excluded from draws
                <br />• ✅ Not system wallets (Dev/AMM/Locked)
                <br />
                <strong>Excluded wallets are automatically filtered out and cannot win.</strong>
              </div>
            </div>

            {/* Current Draw Status */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-black/40 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-purple-400">
                  {eligibleWallets.length.toLocaleString()}
                </div>
                <div className="text-gray-400 text-sm">Eligible Wallets</div>
              </div>
              
              <div className="bg-black/40 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-pink-400">
                  {totalEligibleEntries.toLocaleString()}
                </div>
                <div className="text-gray-400 text-sm">Total Entries</div>
              </div>
              
              <div className="bg-black/40 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-cyan-400">
                  ${totalEligibleUsdValue.toLocaleString()}
                </div>
                <div className="text-gray-400 text-sm">Total USD Value</div>
              </div>
              
              <div className="bg-black/40 rounded-lg p-4 text-center">
                <div className={`text-xl font-bold ${totalEligibleEntries > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalEligibleEntries > 0 ? '✅ Ready' : '❌ Not Ready'}
                </div>
                <div className="text-gray-400 text-sm">Draw Status</div>
              </div>
            </div>

            {/* Draw Button */}
            <button
              onClick={conductDraw}
              disabled={isDrawing || eligibleWallets.length === 0 || totalEligibleEntries === 0 || prizeAmount <= 0}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105"
            >
              {isDrawing ? '🎲 Drawing Winner...' : '🎲 Conduct Fair Draw'}
            </button>
          </div>

          {/* Draw Animation */}
          {isAnimating && (
            <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-2xl p-8 border border-yellow-500/20 mb-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-4">🎲 Selecting Winner...</h3>
                
                <div className="bg-black/40 rounded-xl p-6 mb-4">
                  <div className="text-xl font-mono text-yellow-400 mb-2">
                    {currentAnimationWallet ? 
                      `${currentAnimationWallet.slice(0, 8)}...${currentAnimationWallet.slice(-8)}` 
                      : 'Randomizing...'
                    }
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-100"
                      style={{ width: `${animationProgress}%` }}
                    ></div>
                  </div>
                  <div className="text-gray-400 text-sm mt-2">
                    {animationProgress.toFixed(0)}% complete
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Draw Result */}
          {drawResult && (
            <div className="bg-gradient-to-br from-gold-900/30 to-yellow-900/30 rounded-2xl p-8 border border-yellow-500/20 mb-8">
              <div className="text-center mb-6">
                <h3 className="text-3xl font-bold text-white mb-2">🎉 Winner Selected!</h3>
                <div className="text-yellow-400 text-lg">
                  Drawn at {new Date(drawResult.drawTimestamp).toLocaleString()}
                </div>
              </div>

              {/* Winner Details - FIXED: Show full wallet address */}
              <div className="bg-black/40 rounded-xl p-6 mb-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-bold text-white mb-4">🏆 Winner Details</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="text-gray-400 text-sm mb-1">Full Wallet Address:</div>
                        <div className="bg-gray-900 rounded-lg p-3 border border-gray-600">
                          <div className="text-yellow-400 font-mono text-sm break-all select-all">
                            {drawResult.winnerWallet}
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(drawResult.winnerWallet);
                              alert('Winner wallet address copied to clipboard!');
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                          >
                            📋 Click to copy full address
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">ALPHA Holdings:</span>
                        <span className="text-white font-bold">{drawResult.winnerTokenBalance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">USD Value:</span>
                        <span className="text-green-400 font-bold">${drawResult.winnerUsdValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Entries:</span>
                        <span className="text-purple-400 font-bold">{drawResult.winnerEntries.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Win Probability:</span>
                        <span className="text-cyan-400 font-bold">
                          {calculateWinProbability(drawResult.winnerEntries, drawResult.totalEntries)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-white mb-4">🎲 Draw Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Prize Amount:</span>
                        <span className="text-yellow-400 font-bold">{drawResult.prizeAmount} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Winning Number:</span>
                        <span className="text-pink-400 font-bold">#{drawResult.randomNumber.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Entries:</span>
                        <span className="text-blue-400 font-bold">{drawResult.totalEntries.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Eligible Wallets:</span>
                        <span className="text-green-400 font-bold">{drawResult.totalEligibleWallets.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Share & Export - FIXED: Include full wallet address */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    const result = {
                      winner_wallet: drawResult.winnerWallet, // Full address for transfer
                      winner_display: `${drawResult.winnerWallet.slice(0, 8)}...${drawResult.winnerWallet.slice(-8)}`,
                      prize_amount_sol: drawResult.prizeAmount,
                      prize_amount_usd: (drawResult.prizeAmount * 240).toFixed(2),
                      entries: drawResult.winnerEntries,
                      total_entries: drawResult.totalEntries,
                      win_probability: calculateWinProbability(drawResult.winnerEntries, drawResult.totalEntries) + '%',
                      timestamp: drawResult.drawTimestamp,
                      random_number: drawResult.randomNumber
                    };
                    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
                    alert('Draw result with full wallet address copied to clipboard!');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  📋 Copy Full Result
                </button>
                
                <button
                  onClick={() => {
                    const shareText = `🎉 ALPHA Club Daily Draw Winner!\n\n🏆 Winner: ${drawResult.winnerWallet.slice(0, 8)}...${drawResult.winnerWallet.slice(-8)}\n💰 Prize: ${drawResult.prizeAmount.toFixed(6)} SOL\n🎲 Entries: ${drawResult.winnerEntries}/${drawResult.totalEntries}\n📊 Win Rate: ${calculateWinProbability(drawResult.winnerEntries, drawResult.totalEntries)}%\n\n✅ Provably fair draw with cryptographic randomness`;
                    
                    if (navigator.share) {
                      navigator.share({ text: shareText });
                    } else {
                      navigator.clipboard.writeText(shareText);
                      alert('Draw announcement copied to clipboard!');
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  📢 Share Result
                </button>

                <button
                  onClick={() => {
                    // Copy just the wallet address for easy transfer
                    navigator.clipboard.writeText(drawResult.winnerWallet);
                    alert(`Winner address copied: ${drawResult.winnerWallet}`);
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  📬 Copy Winner Address
                </button>
              </div>
            </div>
          )}

          {/* REMOVED: Eligible Wallets Preview - Could show excluded wallets confusingly */}
          {/* Showing wallet preview removed since it could display excluded wallets and cause confusion */}
          
          {eligibleWallets.length > 0 && (
            <div className="bg-gradient-to-br from-gray-900/30 to-gray-800/30 rounded-2xl p-6 border border-gray-600/20">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="mr-2">✅</span>
                Draw Summary
              </h2>
              
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-black/40 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold text-green-400">
                    {eligibleWallets.length}
                  </div>
                  <div className="text-gray-400 text-sm">Verified Eligible</div>
                  <div className="text-xs text-gray-500">No excluded wallets</div>
                </div>
                
                <div className="bg-black/40 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold text-purple-400">
                    {totalEligibleEntries.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-sm">Total Entries</div>
                  <div className="text-xs text-gray-500">Fair distribution</div>
                </div>
                
                <div className="bg-black/40 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold text-cyan-400">
                    ${totalEligibleUsdValue.toFixed(0)}
                  </div>
                  <div className="text-gray-400 text-sm">Total USD Value</div>
                  <div className="text-xs text-gray-500">Of eligible holdings</div>
                </div>
                
                <div className="bg-black/40 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold text-yellow-400">
                    {prizeAmount > 0 ? 'Ready' : 'No Prize'}
                  </div>
                  <div className="text-gray-400 text-sm">Draw Status</div>
                  <div className="text-xs text-gray-500">
                    {prizeAmount > 0 ? 'Prize loaded' : 'Load prize first'}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-center text-gray-400 text-sm">
                💡 Individual wallet details hidden to prevent confusion with excluded wallets.
                <br />All wallets shown here are verified eligible and not excluded.
              </div>
            </div>
          )}

          {/* How It Works */}
          <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 rounded-2xl p-6 border border-teal-500/20 mt-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="mr-2">ℹ️</span>
              How Fair Draw Selection Works
            </h2>
            <div className="grid md:grid-cols-2 gap-6 text-gray-300 text-sm">
              <div>
                <h3 className="text-white font-semibold mb-2">🎯 Entry Calculation</h3>
                <ul className="space-y-1">
                  <li>• 1 entry per $10 USD worth of ALPHA tokens</li>
                  <li>• VIP Silver: 2x multiplier (2 entries per $10)</li>
                  <li>• VIP Gold: 3x multiplier (3 entries per $10)</li>
                  <li>• VIP Platinum: 5x multiplier (5 entries per $10)</li>
                  <li>• Minimum $10 USD to be eligible</li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">🎲 Random Selection</h3>
                <ul className="space-y-1">
                  <li>• Uses crypto.getRandomValues() for secure randomness</li>
                  <li>• Each wallet gets consecutive entry numbers</li>
                  <li>• Random number selects winning entry</li>
                  <li>• Provably fair and transparent process</li>
                  <li>• All excluded wallets are automatically filtered out</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </AdminGuard>
    </div>
  );
};

export default DailyDraw;