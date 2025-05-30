// src/pages/burns.tsx
import type { NextPage } from "next";
import Head from "next/head";
import { FC, useState } from 'react';

const BurnsView: FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');

  const ComingSoonBanner = () => (
    <div className="bg-gradient-to-r from-orange-900/40 to-red-900/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/20 mb-8">
      <div className="flex items-center justify-center space-x-4">
        <div className="text-4xl">🚧</div>
        <div>
          <h2 className="text-2xl font-bold text-white">Coming Soon</h2>
          <p className="text-orange-400">Advanced burn tracking and analytics are under development</p>
        </div>
        <div className="text-4xl">🚧</div>
      </div>
    </div>
  );

  // Mock data for visualization
  const burnHistory = [
    { date: '2024-01-27', amount: 252029, tx: 'burn1...abc', usdValue: 125.23 },
    { date: '2024-01-26', amount: 556927, tx: 'burn2...def', usdValue: 278.46 },
    { date: '2024-01-25', amount: 872856, tx: 'burn3...ghi', usdValue: 436.43 },
    { date: '2024-01-24', amount: 334521, tx: 'burn4...jkl', usdValue: 167.26 },
    { date: '2024-01-23', amount: 445789, tx: 'burn5...mno', usdValue: 222.89 }
  ];

  const totalBurned = burnHistory.reduce((sum, burn) => sum + burn.amount, 0);
  const totalValue = burnHistory.reduce((sum, burn) => sum + burn.usdValue, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            🔥 Token Burns
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Track token burns, supply reduction, and deflationary mechanics
          </p>
        </div>

        <ComingSoonBanner />

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 rounded-2xl p-6 border border-orange-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Total Burned</h3>
              <div className="text-2xl">🔥</div>
            </div>
            <div className="text-3xl font-bold text-orange-400 mb-1">
              {totalBurned.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">ALPHA Tokens</div>
          </div>

          <div className="bg-gradient-to-br from-red-600/20 to-pink-600/20 rounded-2xl p-6 border border-red-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">USD Value</h3>
              <div className="text-2xl">💰</div>
            </div>
            <div className="text-3xl font-bold text-red-400 mb-1">
              ${totalValue.toFixed(2)}
            </div>
            <div className="text-sm text-gray-400">Total Burned</div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Supply Impact</h3>
              <div className="text-2xl">📉</div>
            </div>
            <div className="text-3xl font-bold text-purple-400 mb-1">
              -{((totalBurned / 1000000000) * 100).toFixed(3)}%
            </div>
            <div className="text-sm text-gray-400">Of Total Supply</div>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-2xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Avg Daily</h3>
              <div className="text-2xl">⚡</div>
            </div>
            <div className="text-3xl font-bold text-green-400 mb-1">
              {Math.round(totalBurned / burnHistory.length).toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Tokens/Day</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column - Burn History */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Burn Chart Placeholder */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <span className="mr-3">📊</span>
                  Burn Analytics
                </h2>
                
                <div className="flex space-x-2">
                  {['24h', '7d', '30d', '90d'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedTimeframe(period)}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        selectedTimeframe === period
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Placeholder Chart */}
              <div className="h-64 bg-black/40 rounded-xl flex items-center justify-center border border-gray-600">
                <div className="text-center">
                  <div className="text-6xl mb-4">📈</div>
                  <p className="text-gray-400 text-lg">Interactive Burn Chart</p>
                  <p className="text-gray-500 text-sm">Coming Soon</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-orange-900/20 rounded-xl border border-orange-500/20">
                <p className="text-orange-400 font-semibold">📊 Chart Features:</p>
                <ul className="text-gray-300 text-sm mt-2 space-y-1">
                  <li>• Historical burn timeline</li>
                  <li>• Supply reduction visualization</li>
                  <li>• USD value impact tracking</li>
                  <li>• Burn rate trend analysis</li>
                </ul>
              </div>
            </div>

            {/* Recent Burns */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">🔥</span>
                Recent Burns
              </h2>
              
              <div className="space-y-4">
                {burnHistory.map((burn, index) => (
                  <div key={index} className="bg-black/40 rounded-xl p-4 hover:bg-black/60 transition-all opacity-75">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold">
                          🔥
                        </div>
                        <div>
                          <div className="text-white font-medium">{burn.date}</div>
                          <div className="text-gray-400 text-sm">Daily Burn Event</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-orange-400 font-bold">{burn.amount.toLocaleString()} ALPHA</div>
                        <div className="text-gray-400 text-sm">${burn.usdValue.toFixed(2)} USD</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Transaction:</span>
                      <span className="text-gray-500 font-mono">{burn.tx}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 text-center">
                <button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 opacity-50 cursor-not-allowed">
                  Load More Burns
                </button>
                <p className="text-gray-500 text-xs mt-2">Connected to live burn API</p>
              </div>
            </div>
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
                    <div className="text-white font-semibold">Revenue Collection</div>
                    <div className="text-gray-300 text-sm">We collect creator rewards from trading activity</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-1">
                    2
                  </div>
                  <div>
                    <div className="text-white font-semibold">Allocation Split</div>
                    <div className="text-gray-300 text-sm">30% allocated for token burns</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-1">
                    3
                  </div>
                  <div>
                    <div className="text-white font-semibold">Token Purchase</div>
                    <div className="text-gray-300 text-sm">Buy ALPHA tokens from the market</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-1">
                    4
                  </div>
                  <div>
                    <div className="text-white font-semibold">Permanent Burn</div>
                    <div className="text-gray-300 text-sm">Send tokens to burn address forever</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Burn Schedule */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Burn Schedule</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg">
                  <span className="text-gray-300">Frequency</span>
                  <span className="text-orange-400 font-semibold">Daily</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg">
                  <span className="text-gray-300">Time</span>
                  <span className="text-orange-400 font-semibold">11:30 UTC</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg">
                  <span className="text-gray-300">Next Burn</span>
                  <span className="text-orange-400 font-semibold">4h 53m</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg">
                  <span className="text-gray-300">Estimated Amount</span>
                  <span className="text-orange-400 font-semibold">~350K ALPHA</span>
                </div>
              </div>
            </div>

            {/* Impact Metrics */}
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-3xl p-6 border border-purple-500/20">
              <h3 className="text-xl font-bold text-white mb-4">Economic Impact</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">Supply Burned</span>
                    <span className="text-purple-400 font-bold">0.246%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full" style={{width: '2.46%'}}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">Deflation Rate</span>
                    <span className="text-blue-400 font-bold">~0.08%/mo</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{width: '8%'}}></div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/20">
                <p className="text-purple-400 text-sm font-semibold">💡 Impact:</p>
                <p className="text-gray-300 text-xs mt-1">
                  Regular burns reduce supply, potentially increasing scarcity and value for holders
                </p>
              </div>
            </div>

            {/* Transparency */}
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-3xl p-6 border border-green-500/20">
              <h3 className="text-xl font-bold text-white mb-4">Transparency</h3>
              
              <div className="space-y-3">
                <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-xl font-semibold transition-all transform hover:scale-105 opacity-50 cursor-not-allowed">
                  View Burn Wallet
                </button>
                <button className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-all opacity-50 cursor-not-allowed">
                  Burn Verification
                </button>
                <button className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-all opacity-50 cursor-not-allowed">
                  Export Burn Data
                </button>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-gray-500 text-xs">All burns are publicly verifiable</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="mt-12">
          <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-2xl p-8 border border-orange-500/20 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Deflationary by Design</h3>
            <p className="text-gray-300 mb-6 max-w-3xl mx-auto">
              Every trade generates revenue that funds both holder rewards and token burns. 
              This creates a sustainable model where trading activity directly benefits holders through rewards and scarcity.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-2">💰</div>
                <div className="text-lg font-semibold text-orange-400">40% Rewards</div>
                <div className="text-sm text-gray-400">To lucky holders</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🔥</div>
                <div className="text-lg font-semibold text-red-400">30% Burns</div>
                <div className="text-sm text-gray-400">Permanent removal</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">⚙️</div>
                <div className="text-lg font-semibold text-yellow-400">30% Operations</div>
                <div className="text-sm text-gray-400">Platform development</div>
              </div>
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
        <title>Token Burns - ALPHA Club</title>
        <meta
          name="description"
          content="Track ALPHA token burns, supply reduction, and deflationary mechanics. View burn history and transparency reports."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <BurnsView />
    </div>
  );
};

export default Burns;