// src/pages/burns.tsx
import type { NextPage } from "next";
import Head from "next/head";
import { FC, useState, useEffect, useCallback } from 'react';
import { googleSheetsService } from '../utils/googleSheetsService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import Link from 'next/link';

interface BurnData {
  totalTokensBurned: number;
  recentBurns: Array<{
    amount: number;
    date: string;
    burnTx: string;
  }>;
  latestBurn: {
    tokensBurned: number;
    date: string;
    burnTx: string;
  } | null;
}

const BurnsView: FC = () => {
  const [burnData, setBurnData] = useState<BurnData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const formatNumber = (num: number) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const getTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Less than 1h ago';
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  const fetchBurnData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch burn data from Google Sheets - same as homepage
      const stats = await googleSheetsService.getStatsData();
      
      // Set burn data directly from stats
      setBurnData({
        totalTokensBurned: stats.totalTokensBurned || 0,
        recentBurns: stats.recentBurns || [],
        latestBurn: stats.latestBurn || null
      });

      setLastUpdated(new Date().toLocaleTimeString());

    } catch (error) {
      console.error('Error fetching burn data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBurnData();
    
    // Auto-refresh every 30 seconds like the homepage
    const interval = setInterval(fetchBurnData, 30000);
    return () => clearInterval(interval);
  }, [fetchBurnData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Calculate burn percentage assuming 1B total supply
  const TOTAL_SUPPLY = 1000000000; // 1 billion
  const DEV_LOCKED = 100000000; // 100 million
  const burnPercentage = ((burnData?.totalTokensBurned || 0) / TOTAL_SUPPLY) * 100;
  const circulatingSupply = TOTAL_SUPPLY - DEV_LOCKED - (burnData?.totalTokensBurned || 0);
  
  const avgDailyBurn = burnData && burnData.recentBurns.length > 0 
    ? burnData.recentBurns.reduce((sum, burn) => sum + burn.amount, 0) / burnData.recentBurns.length 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            🔥 Token Burns
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Permanent token removal • Supply reduction • Deflationary mechanics
          </p>
          <div className="mt-4">
            <span className="text-gray-400 text-sm">Last updated: {lastUpdated}</span>
          </div>
        </div>

        {/* Dev Tokens Locked Banner */}
        <div className="mb-12">
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">🔒</div>
                <div>
                  <h3 className="text-xl font-bold text-white">100M Dev Tokens Permanently Locked</h3>
                  <p className="text-green-400 text-sm">10% of total supply secured forever via Streamflow</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">
                    {formatNumber(DEV_LOCKED)}
                  </div>
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

        {/* Live Burn Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 rounded-2xl p-6 border border-orange-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Total Burned</h3>
              <div className="text-2xl">🔥</div>
            </div>
            <div className="text-3xl font-bold text-orange-400 mb-1">
              {burnData ? formatNumber(burnData.totalTokensBurned) : 'Loading...'}
            </div>
            <div className="text-sm text-gray-400">ALPHA Tokens</div>
          </div>

          <div className="bg-gradient-to-br from-red-600/20 to-pink-600/20 rounded-2xl p-6 border border-red-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Burn Events</h3>
              <div className="text-2xl">📊</div>
            </div>
            <div className="text-3xl font-bold text-red-400 mb-1">
              {burnData ? burnData.recentBurns.length : '0'}
            </div>
            <div className="text-sm text-gray-400">Total Burns</div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Supply Impact</h3>
              <div className="text-2xl">📉</div>
            </div>
            <div className="text-3xl font-bold text-purple-400 mb-1">
              -{burnPercentage.toFixed(4)}%
            </div>
            <div className="text-sm text-gray-400">Of Total Supply</div>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-2xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Average Burn</h3>
              <div className="text-2xl">⚡</div>
            </div>
            <div className="text-3xl font-bold text-green-400 mb-1">
              {avgDailyBurn > 0 ? formatNumber(avgDailyBurn) : '0'}
            </div>
            <div className="text-sm text-gray-400">Per Event</div>
          </div>
        </div>

        {/* Supply Breakdown */}
        <div className="mb-12">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="mr-3">📊</span>
              Token Supply Breakdown
            </h2>
            
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-400 mb-2">Total Supply</div>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(TOTAL_SUPPLY)}
                </div>
                <div className="text-sm text-gray-500">Original mint</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-400 mb-2">Locked (Dev)</div>
                <div className="text-2xl font-bold text-green-400">
                  {formatNumber(DEV_LOCKED)}
                </div>
                <div className="text-sm text-gray-500">10% locked</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-400 mb-2">Burned</div>
                <div className="text-2xl font-bold text-orange-400">
                  {formatNumber(burnData?.totalTokensBurned || 0)}
                </div>
                <div className="text-sm text-gray-500">
                  {burnPercentage.toFixed(3)}% burned
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-400 mb-2">Circulating</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {formatNumber(circulatingSupply)}
                </div>
                <div className="text-sm text-gray-500">
                  {((circulatingSupply / TOTAL_SUPPLY) * 100).toFixed(1)}% circulating
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column - Burn History */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Recent Burns */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">🔥</span>
                Recent Burns
              </h2>
              
              {burnData && burnData.recentBurns.length > 0 ? (
                <div className="space-y-4">
                  {burnData.recentBurns.map((burn, index) => (
                    <div key={index} className="bg-black/40 rounded-xl p-4 hover:bg-black/60 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold">
                            🔥
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              {formatNumber(burn.amount)} ALPHA Burned
                            </div>
                            <div className="text-gray-400 text-sm">{getTimeAgo(burn.date)}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {burn.burnTx && burn.burnTx.length > 10 ? (
                            <a 
                              href={burn.burnTx}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-400 hover:text-orange-300 text-sm transition-colors bg-black/40 px-3 py-1 rounded font-mono"
                            >
                              View Tx ↗
                            </a>
                          ) : (
                            <div className="text-gray-600 text-sm">
                              Pending
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔄</div>
                  <p className="text-gray-400">
                    No burns recorded yet. Burns will appear here once executed.
                  </p>
                </div>
              )}
            </div>

            {/* Latest Burn Info */}
            {burnData && burnData.latestBurn && (
              <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-3xl p-8 border border-orange-500/20">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <span className="mr-3">🔥</span>
                  Latest Burn Event
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-black/40 rounded-xl p-6">
                    <div className="text-gray-400 text-sm mb-2">Tokens Burned</div>
                    <div className="text-2xl font-bold text-orange-400 mb-2">
                      {formatNumber(burnData.latestBurn.tokensBurned)}
                    </div>
                    <div className="text-sm text-gray-500">ALPHA tokens</div>
                  </div>
                  
                  <div className="bg-black/40 rounded-xl p-6">
                    <div className="text-gray-400 text-sm mb-2">Date</div>
                    <div className="text-2xl font-bold text-white mb-2">
                      {getTimeAgo(burnData.latestBurn.date)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(burnData.latestBurn.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                {burnData.latestBurn.burnTx && burnData.latestBurn.burnTx.length > 10 && (
                  <div className="mt-6 text-center">
                    <a 
                      href={burnData.latestBurn.burnTx}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105"
                    >
                      View Transaction ↗
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Burn Mechanics & Info */}
          <div className="space-y-8">
            
            {/* How Burns Work */}
            <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-3xl p-6 border border-orange-500/20">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="mr-2">⚙️</span>
                How Burns Work
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-1">
                    1
                  </div>
                  <div>
                    <div className="text-white font-semibold">Trading Generates Revenue</div>
                    <div className="text-gray-300 text-sm">Creator rewards from Pump.fun activity</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-1">
                    2
                  </div>
                  <div>
                    <div className="text-white font-semibold">30% for Burns</div>
                    <div className="text-gray-300 text-sm">Dedicated portion for token removal</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-1">
                    3
                  </div>
                  <div>
                    <div className="text-white font-semibold">Buy & Burn</div>
                    <div className="text-gray-300 text-sm">Purchase ALPHA tokens from market</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-1">
                    4
                  </div>
                  <div>
                    <div className="text-white font-semibold">Permanent Removal</div>
                    <div className="text-gray-300 text-sm">Send to burn address forever</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Economic Impact */}
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-3xl p-6 border border-purple-500/20">
              <h3 className="text-xl font-bold text-white mb-4">Economic Impact</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">Total Supply Burned</span>
                    <span className="text-purple-400 font-bold">{burnPercentage.toFixed(4)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-1000" 
                      style={{width: `${Math.min(burnPercentage * 10, 100)}%`}}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">Effective Circulating</span>
                    <span className="text-blue-400 font-bold">
                      {((circulatingSupply / TOTAL_SUPPLY) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-1000" 
                      style={{width: `${(circulatingSupply / TOTAL_SUPPLY) * 100}%`}}
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/20">
                <p className="text-purple-400 text-sm font-semibold">💡 Key Impact:</p>
                <p className="text-gray-300 text-xs mt-1">
                  Higher trading volume = more burns = increased scarcity. 
                  With 100M dev tokens locked forever, burns directly reduce the circulating supply.
                </p>
              </div>
            </div>

            {/* Transparency */}
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-3xl p-6 border border-green-500/20">
              <h3 className="text-xl font-bold text-white mb-4">Transparency</h3>
              
              <div className="space-y-3">
                <div className="bg-black/40 rounded-lg p-3">
                  <div className="text-green-400 text-sm font-semibold">✅ Google Sheets Tracking</div>
                  <div className="text-gray-300 text-xs">All burns recorded in public spreadsheet</div>
                </div>
                
                <div className="bg-black/40 rounded-lg p-3">
                  <div className="text-green-400 text-sm font-semibold">✅ On-chain Verification</div>
                  <div className="text-gray-300 text-xs">Transaction links for every burn</div>
                </div>
                
                <div className="bg-black/40 rounded-lg p-3">
                  <div className="text-green-400 text-sm font-semibold">✅ Real-time Updates</div>
                  <div className="text-gray-300 text-xs">Auto-refreshes every 30 seconds</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <Link href="/dashboard" className="block w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white py-3 rounded-xl font-semibold transition-all text-center">
                  📊 View Dashboard
                </Link>
                <Link href="/rewards" className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-xl font-semibold transition-all text-center">
                  🏆 View Rewards
                </Link>
                <Link href="/" className="block w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-all text-center">
                  🏠 Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Info - Revenue Split */}
        <div className="mt-12">
          <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-2xl p-8 border border-orange-500/20 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Sustainable Tokenomics</h3>
            <p className="text-gray-300 mb-6 max-w-3xl mx-auto">
              Trading volume directly impacts token scarcity. Every trade generates creator rewards that fund both holder rewards and permanent token burns, creating long-term value through supply reduction.
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl mb-2">💰</div>
                <div className="text-lg font-semibold text-teal-400">40% Rewards</div>
                <div className="text-sm text-gray-400">Daily SOL prizes to holders</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🔥</div>
                <div className="text-lg font-semibold text-orange-400">30% Burns</div>
                <div className="text-sm text-gray-400">Permanent supply reduction</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">⚙️</div>
                <div className="text-lg font-semibold text-purple-400">30% Operations</div>
                <div className="text-sm text-gray-400">Platform development & growth</div>
              </div>
            </div>
            
            <div className="mt-8 bg-black/40 rounded-xl p-6 max-w-2xl mx-auto">
              <div className="text-green-400 font-semibold mb-2">🔒 Security Note</div>
              <p className="text-gray-300 text-sm">
                With 100M dev tokens permanently locked and regular burns reducing circulating supply, 
                the effective supply decreases over time while demand from trading activity continues.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Burns: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Token Burns - ALPHA Club | Real-time Burn Tracking & Supply Reduction</title>
        <meta
          name="description"
          content="Track ALPHA token burns in real-time. View burn history, supply reduction impact, and transparent on-chain verification. 30% of creator rewards fund permanent token burns."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <BurnsView />
    </div>
  );
};

export default Burns;