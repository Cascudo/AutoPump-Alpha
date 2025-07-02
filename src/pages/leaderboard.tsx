// src/pages/leaderboard.tsx
import type { NextPage } from "next";
import Head from "next/head";
import { FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const LeaderboardView: FC = () => {
  const wallet = useWallet();
  const [selectedCategory, setSelectedCategory] = useState('holders');
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');

  const ComingSoonBanner = () => (
    <div className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 backdrop-blur-sm rounded-2xl p-6 border border-yellow-500/20 mb-8">
      <div className="flex items-center justify-center space-x-4">
        <div className="text-4xl">🚧</div>
        <div>
          <h2 className="text-2xl font-bold text-white">Coming Soon</h2>
          <p className="text-yellow-400">Advanced leaderboards and ranking system under development</p>
        </div>
        <div className="text-4xl">🚧</div>
      </div>
    </div>
  );

  // Mock leaderboard data
  const mockHolders = [
    { rank: 1, wallet: '8BEt...qxKt', balance: 45672891, percentage: 4.57, tier: 'Gold', wins: 23 },
    { rank: 2, wallet: 'D3oB...Y9nn', balance: 32458976, percentage: 3.25, tier: 'Gold', wins: 18 },
    { rank: 3, wallet: 'ByYq...X6EB', balance: 28934512, percentage: 2.89, tier: 'Gold', wins: 15 },
    { rank: 4, wallet: '7x8K...m9Qr', balance: 24567834, percentage: 2.46, tier: 'Gold', wins: 12 },
    { rank: 5, wallet: '9mR2...k5Lp', balance: 19876543, percentage: 1.99, tier: 'Gold', wins: 11 },
    { rank: 6, wallet: '3nX4...j7Ws', balance: 15432876, percentage: 1.54, tier: 'Silver', wins: 9 },
    { rank: 7, wallet: '5kL9...p2Rt', balance: 12987654, percentage: 1.30, tier: 'Silver', wins: 8 },
    { rank: 8, wallet: '2vC8...x4Yu', balance: 10456789, percentage: 1.05, tier: 'Silver', wins: 7 },
    { rank: 9, wallet: '6qW1...s9Df', balance: 8765432, percentage: 0.88, tier: 'Silver', wins: 6 },
    { rank: 10, wallet: '4tE7...h3Gk', balance: 7234567, percentage: 0.72, tier: 'Silver', wins: 5 }
  ];

  const mockWinners = [
    { rank: 1, wallet: '8BEt...qxKt', totalWon: 2.4567, wins: 23, avgWin: 0.1068, tier: 'Gold' },
    { rank: 2, wallet: 'D3oB...Y9nn', totalWon: 1.8934, wins: 18, avgWin: 0.1052, tier: 'Gold' },
    { rank: 3, wallet: 'ByYq...X6EB', totalWon: 1.5432, wins: 15, avgWin: 0.1029, tier: 'Gold' },
    { rank: 4, wallet: '7x8K...m9Qr', totalWon: 1.2876, wins: 12, avgWin: 0.1073, tier: 'Gold' },
    { rank: 5, wallet: '9mR2...k5Lp', totalWon: 1.1234, wins: 11, avgWin: 0.1021, tier: 'Gold' }
  ];

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Gold': return 'text-yellow-400 bg-yellow-400/20';
      case 'Silver': return 'text-gray-300 bg-gray-300/20';
      case 'Bronze': return 'text-orange-400 bg-orange-400/20';
      default: return 'text-gray-500 bg-gray-500/20';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'Gold': return '👑';
      case 'Silver': return '🥈';
      case 'Bronze': return '🥉';
      default: return '⭕';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  // Find user's position (mock)
  const userPosition = wallet.connected ? {
    rank: 47,
    wallet: wallet.publicKey?.toString().slice(0, 4) + '...' + wallet.publicKey?.toString().slice(-4),
    balance: 125000,
    percentage: 0.125,
    tier: 'Silver',
    wins: 3
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            🏆 Leaderboard
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Top ALPHA holders, biggest winners, and community rankings
          </p>
        </div>

        <ComingSoonBanner />

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {[
            { id: 'holders', label: 'Top Holders', icon: '💰' },
            { id: 'winners', label: 'Biggest Winners', icon: '🏆' },
            { id: 'active', label: 'Most Active', icon: '⚡' },
            { id: 'streaks', label: 'Win Streaks', icon: '🔥' }
          ].map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        {/* Timeframe Filter */}
        <div className="flex justify-center gap-2 mb-8">
          {[
            { id: 'all', label: 'All Time' },
            { id: '30d', label: '30 Days' },
            { id: '7d', label: '7 Days' },
            { id: '24h', label: '24 Hours' }
          ].map((timeframe) => (
            <button
              key={timeframe.id}
              onClick={() => setSelectedTimeframe(timeframe.id)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                selectedTimeframe === timeframe.id
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {timeframe.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          
          {/* Main Leaderboard */}
          <div className="lg:col-span-3">
            
            {/* Your Position (if connected) */}
            {userPosition && (
              <div className="bg-gradient-to-r from-teal-900/40 to-cyan-900/40 rounded-2xl p-6 border border-teal-500/30 mb-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                  <span className="mr-2">📍</span>
                  Your Position
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                      #{userPosition.rank}
                    </div>
                    <div>
                      <div className="text-white font-medium">{userPosition.wallet}</div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getTierColor(userPosition.tier)}`}>
                          {getTierIcon(userPosition.tier)} {userPosition.tier}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-teal-400 font-bold">{userPosition.balance.toLocaleString()} ALPHA</div>
                    <div className="text-gray-400 text-sm">{userPosition.percentage}% of supply</div>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard Table */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">
                  {selectedCategory === 'holders' && '💰'}
                  {selectedCategory === 'winners' && '🏆'}
                  {selectedCategory === 'active' && '⚡'}
                  {selectedCategory === 'streaks' && '🔥'}
                </span>
                {selectedCategory === 'holders' && 'Top Token Holders'}
                {selectedCategory === 'winners' && 'Biggest Winners'}
                {selectedCategory === 'active' && 'Most Active Members'}
                {selectedCategory === 'streaks' && 'Longest Win Streaks'}
              </h2>
              
              <div className="space-y-3">
                {(selectedCategory === 'holders' ? mockHolders : mockWinners).map((entry, index) => (
                  <div key={index} className="bg-black/40 rounded-xl p-4 hover:bg-black/60 transition-all opacity-75">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                          entry.rank <= 3 
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' 
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {getRankIcon(entry.rank)}
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-3">
                            <span className="text-white font-medium">{entry.wallet}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getTierColor(entry.tier)}`}>
                              {getTierIcon(entry.tier)} {entry.tier}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                            {selectedCategory === 'holders' && (
                              <>
                                <span>{entry.balance.toLocaleString()} ALPHA</span>
                                <span>•</span>
                                <span>{entry.percentage}% supply</span>
                              </>
                            )}
                            {selectedCategory === 'winners' && (
                              <>
                                <span>{entry.totalWon.toFixed(4)} SOL won</span>
                                <span>•</span>
                                <span>{entry.wins} wins</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {selectedCategory === 'holders' && (
                          <>
                            <div className="text-teal-400 font-bold">{entry.wins} Wins</div>
                            <div className="text-gray-400 text-sm">Total Rewards</div>
                          </>
                        )}
                        {selectedCategory === 'winners' && (
                          <>
                            <div className="text-green-400 font-bold">{entry.avgWin.toFixed(4)} SOL</div>
                            <div className="text-gray-400 text-sm">Avg per win</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 text-center">
                <button className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 opacity-50 cursor-not-allowed">
                  Load More Rankings
                </button>
                <p className="text-gray-500 text-xs mt-2">Live rankings coming soon</p>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Community Stats</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Holders</span>
                  <span className="text-teal-400 font-bold">2,847</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Gold Members</span>
                  <span className="text-yellow-400 font-bold">127</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Silver Members</span>
                  <span className="text-gray-300 font-bold">384</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Bronze Members</span>
                  <span className="text-orange-400 font-bold">956</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Winners</span>
                  <span className="text-green-400 font-bold">1,243</span>
                </div>
              </div>
            </div>

            {/* Tier Requirements */}
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl p-6 border border-purple-500/20">
              <h3 className="text-xl font-bold text-white mb-4">Tier Requirements</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span>🥉</span>
                    <span className="text-orange-400 font-semibold">Bronze</span>
                  </div>
                  <span className="text-gray-300">$10+</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span>🥈</span>
                    <span className="text-gray-300 font-semibold">Silver</span>
                  </div>
                  <span className="text-gray-300">$100+</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span>👑</span>
                    <span className="text-yellow-400 font-semibold">Gold</span>
                  </div>
                  <span className="text-gray-300">$1,000+</span>
                </div>
              </div>
            </div>

            {/* Recent Winners */}
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-500/20">
              <h3 className="text-xl font-bold text-white mb-4">Recent Winners</h3>
              
              <div className="space-y-3">
                {[
                  { wallet: 'ByYq...X6EB', amount: 0.0468, time: '2h ago' },
                  { wallet: 'D3oB...Y9nn', amount: 0.1344, time: '1d ago' },
                  { wallet: '8BEt...qxKt', amount: 0.0522, time: '2d ago' }
                ].map((winner, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{winner.wallet}</div>
                      <div className="text-gray-400 text-xs">{winner.time}</div>
                    </div>
                    <div className="text-green-400 font-bold">
                      {winner.amount.toFixed(4)} SOL
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements (Preview) */}
            <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-2xl p-6 border border-yellow-500/20">
              <h3 className="text-xl font-bold text-white mb-4">Achievements</h3>
              
              <div className="space-y-3 opacity-50">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🎯</div>
                  <div>
                    <div className="text-white font-medium">First Win</div>
                    <div className="text-gray-400 text-xs">Win your first reward</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🔥</div>
                  <div>
                    <div className="text-white font-medium">Hot Streak</div>
                    <div className="text-gray-400 text-xs">Win 3 times in a week</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">💎</div>
                  <div>
                    <div className="text-white font-medium">Diamond Hands</div>
                    <div className="text-gray-400 text-xs">Hold for 90+ days</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-gray-500 text-xs">Achievement system coming soon!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Leaderboard: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Leaderboard - ALPHA Club</title>
        <meta
          name="description"
          content="View ALPHA Club leaderboards: top holders, biggest winners, and community rankings. Track your position and compete with other members."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <LeaderboardView />
    </div>
  );
};

export default Leaderboard;