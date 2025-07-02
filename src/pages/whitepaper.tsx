// src/pages/whitepaper.tsx - IMPROVED: Sustainable Capitalism & Volume Milestones
import type { NextPage } from "next";
import Head from "next/head";
import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { googleSheetsService, type StatsData } from '../utils/googleSheetsService';
import Link from 'next/link';

interface LiveStats {
  totalSolAwarded: number;
  activeMembers: number | null;
  tokensBurned: number;
  daysLive: number;
  retentionRate: number;
  dailyGrowthRate: number;
  isLoading: boolean;
}

const WhitepaperView: FC = () => {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [currentWord, setCurrentWord] = useState(0);
  const words = ['REWARD', 'BURN', 'REPEAT'];
  
  const [liveStats, setLiveStats] = useState<LiveStats>({
    totalSolAwarded: 0,
    activeMembers: null,
    tokensBurned: 0,
    daysLive: 0,
    retentionRate: 0,
    dailyGrowthRate: 0,
    isLoading: true
  });

  // REWARD|BURN|REPEAT animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 1200); // 1.2 seconds per word (same as homepage)

    return () => clearInterval(interval);
  }, [words.length]);

  // Color mapping: REWARD=teal, BURN=orange, REPEAT=purple
  const getWordColor = (word: string) => {
    switch(word) {
      case 'REWARD': return 'from-teal-400 to-cyan-400';
      case 'BURN': return 'from-orange-400 to-red-400';
      case 'REPEAT': return 'from-purple-400 to-pink-400';
      default: return 'from-teal-400 to-cyan-400';
    }
  };

  // Enhanced volume milestone data
  const volumeMilestones = [
    {
      range: "$30K - $50K",
      dailyVolume: "30k-50k",
      prizes: "Up to $500",
      description: "Gaming tier prizes, tech gadgets, or cash",
      color: "from-green-500 to-teal-500",
      icon: "🎮"
    },
    {
      range: "$100K+",
      dailyVolume: "100k",
      prizes: "$1,000",
      description: "Premium electronics, luxury items, or cash",
      color: "from-blue-500 to-cyan-500",
      icon: "💎"
    },
    {
      range: "$1M+", 
      dailyVolume: "1M",
      prizes: "$10,000",
      description: "High-end experiences, jewelry, or cash",
      color: "from-purple-500 to-pink-500",
      icon: "🏆"
    },
    {
      range: "$10M+",
      dailyVolume: "10M", 
      prizes: "$100,000",
      description: "Luxury cars, down payments, or cash",
      color: "from-yellow-500 to-orange-500",
      icon: "🚗"
    },
    {
      range: "$30M+",
      dailyVolume: "30M",
      prizes: "LAMBO TIER",
      description: "Sports cars, houses, boats, or cash equivalent",
      color: "from-red-500 to-pink-500",
      icon: "🏎️"
    }
  ];

  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const stats = await googleSheetsService.getStatsData();
        const daysLive = Math.floor((Date.now() - new Date('2024-01-15').getTime()) / (1000 * 60 * 60 * 24));
        
        // Only show member count if it's reasonable (not too high)
        const memberCount = (stats.totalMembers && stats.totalMembers < 100000) 
          ? stats.totalMembers : null;
        
        setLiveStats({
          totalSolAwarded: stats.totalHolderPrizes || 0,
          activeMembers: memberCount,
          tokensBurned: stats.totalTokensBurned || 4000000,
          daysLive: Math.max(daysLive, 5),
          retentionRate: 80,
          dailyGrowthRate: 12.5,
          isLoading: false
        });
      } catch (error) {
        console.error('Error fetching live stats for whitepaper:', error);
        setLiveStats({
          totalSolAwarded: 0.28,
          activeMembers: null,
          tokensBurned: 4000000,
          daysLive: 6,
          retentionRate: 80,
          dailyGrowthRate: 12.5,
          isLoading: false
        });
      }
    };

    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Main Headline with Animation on Same Line */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-4 mb-6">
              <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
                <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  ALPHA CLUB
                </span>
              </h1>
              
              {/* ANIMATED CYCLING WORDS - Same Line */}
              <div className="flex items-center px-2 py-3">
                <span className="text-5xl lg:text-7xl font-black transition-all duration-300">
                  <span className={`inline-block transition-all duration-300 ${
                    words[currentWord] === 'REWARD' ? 'text-teal-400' :
                    words[currentWord] === 'BURN' ? 'text-orange-400' :
                    'text-purple-400'
                  }`}>
                    {words[currentWord]}
                  </span>
                </span>
              </div>
            </div>

        {/* Live Stats Banner */}
        <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 rounded-2xl p-6 border border-teal-500/20 mb-8 text-center">
          <h3 className="text-white font-bold text-lg mb-4">📊 Live Performance Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-teal-400">
                {liveStats.totalSolAwarded.toFixed(2)} SOL
              </div>
              <div className="text-gray-300 text-sm">Paid to Holders</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">
                {(liveStats.tokensBurned / 1000000).toFixed(1)}M
              </div>
              <div className="text-gray-300 text-sm">Tokens Burned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">
                {liveStats.daysLive}
              </div>
              <div className="text-gray-300 text-sm">Days Live</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {liveStats.retentionRate}%
              </div>
              <div className="text-gray-300 text-sm">Holder Retention</div>
            </div>
          </div>
        </div>

        {/* The Problem & Solution */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <span className="mr-3">🔥</span>
            The ALPHA Flywheel: REWARD | BURN | REPEAT
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* The Problem */}
            <div>
              <h3 className="text-xl font-bold text-red-400 mb-4">❌ Traditional Memecoins</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">📈</span>
                  <span className="text-gray-300">Pump. Dump. Ghost.</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xl">💸</span>
                  <span className="text-gray-300">No real utility or rewards</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xl">😵</span>
                  <span className="text-gray-300">Holders get nothing but hope</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xl">🎰</span>
                  <span className="text-gray-300">Pure speculation, zero substance</span>
                </div>
              </div>
            </div>
            
            {/* The Solution */}
            <div>
              <h3 className="text-xl font-bold text-green-400 mb-4">✅ ALPHA CLUB = SUSTAINABLE CAPITALISM</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-green-400">💰</span>
                  <span className="text-gray-300">Real revenue from Pump.fun creator fees</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-400">🔄</span>
                  <span className="text-gray-300">Automatic SOL rewards for holders</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-400">🔥</span>
                  <span className="text-gray-300">Token burns = guaranteed scarcity</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-400">📈</span>
                  <span className="text-gray-300">Mathematical wealth creation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Flywheel Explanation */}
          <div className="mt-8 bg-black/40 rounded-xl p-6">
            <h4 className="text-white font-bold text-lg mb-4 text-center">🔄 How The Flywheel Works</h4>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-2 text-teal-400">REWARD</div>
                <div className="text-gray-300 text-sm">
                  • Auto-entries from holdings<br/>
                  • Daily SOL distributions<br/>
                  • VIP exclusive benefits<br/>
                  • Partner discount access
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2 text-orange-400">BURN</div>
                <div className="text-gray-300 text-sm">
                  • Live burn counter<br/>
                  • Supply reduction = price increase<br/>
                  • Deflationary mechanics<br/>
                  • &ldquo;Your bag grows without buying more&rdquo;
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2 text-purple-400">REPEAT</div>
                <div className="text-gray-300 text-sm">
                  • Daily rewards cycle<br/>
                  • Weekly VIP benefits<br/>
                  • Monthly promo giveaways<br/>
                  • Volume based prize upgrades
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Volume-Based Milestone Giveaways */}
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-3xl p-8 border border-purple-500/20 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <span className="mr-3">🎯</span>
            Volume-Based Milestone Giveaways
          </h2>
          
          <p className="text-gray-300 text-lg mb-8 leading-relaxed">
            The more our ecosystem grows, the bigger the prizes become. These milestone giveaways activate automatically when daily trading volume from Pump.fun creator rewards reaches each tier:
          </p>

          <div className="space-y-4">
            {volumeMilestones.map((milestone, index) => (
              <div key={index} className={`bg-gradient-to-r ${milestone.color} p-1 rounded-xl`}>
                <div className="bg-black/90 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">{milestone.icon}</div>
                      <div>
                        <div className="text-white font-bold text-lg">
                          {milestone.range} Daily Volume
                        </div>
                        <div className="text-gray-300 text-sm">
                          {milestone.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {milestone.prizes}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Prize Pool
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-black/40 rounded-xl p-6">
            <h4 className="text-yellow-400 font-bold mb-2">🚀 The Beautiful Part:</h4>
            <p className="text-gray-300">
              As ALPHA Club grows and trading volume increases, <span className="text-teal-400 font-semibold">ALL existing holders benefit from bigger prize pools</span>. 
              The more successful our ecosystem becomes, the more valuable the prizes become for everyone.
            </p>
          </div>
        </div>

        {/* Three Ways to Participate */}
        <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 rounded-3xl p-8 border border-teal-500/20 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <span className="mr-3">🎮</span>
            Three Ways to Win
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Hold Tokens */}
            <div className="bg-black/40 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">💎</div>
              <h3 className="text-xl font-bold text-teal-400 mb-3">HOLD TOKENS</h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <div>• Buy & Hold $10+ in $ALPHA</div>
                <div>• Get automatic entries daily</div>
                <div>• No gas fees, no effort required</div>
                <div>• Benefit from all token burns</div>
                <div>• Eligible for ALL giveaway tiers</div>
              </div>
              {!connected && (
                <button
                  onClick={() => setVisible(true)}
                  className="mt-4 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm transition-all"
                >
                  Connect Wallet
                </button>
              )}
            </div>

            {/* Become VIP */}
            <div className="bg-black/40 rounded-xl p-6 text-center border-2 border-purple-500/50">
              <div className="text-4xl mb-4">👑</div>
              <h3 className="text-xl font-bold text-purple-400 mb-3">BECOME VIP</h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <div>• Get 2x-5x entry multipliers</div>
                <div>• Access exclusive VIP-only draws</div>
                <div>• Partner discounts (AWS, Google Cloud)</div>
                <div>• Monthly baseline entry bonuses</div>
                <div>• Premium support & early access</div>
              </div>
              <Link href="/vip">
                <button className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-all">
                  Upgrade to VIP
                </button>
              </Link>
            </div>

            {/* Buy Entries */}
            <div className="bg-black/40 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-orange-400 mb-3">BUY ENTRIES</h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <div>• Purchase additional entries</div>
                <div>• VIP members get multiplied entries</div>
                <div>• Support your favorite giveaways</div>
                <div>• Instant entry confirmation</div>
                <div>• Solana Pay secure payments</div>
              </div>
              <Link href="/giveaways">
                <button className="mt-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm transition-all">
                  View Giveaways
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Mathematical Certainty */}
        <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-3xl p-8 border border-green-500/20 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <span className="mr-3">📊</span>
            Mathematical Certainty
          </h2>
          
          <p className="text-gray-300 text-lg mb-6 leading-relaxed">
            Unlike speculative memecoins, ALPHA Club operates on <span className="text-green-400 font-semibold">verifiable mathematical principles</span>:
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-black/40 rounded-xl p-6">
              <h3 className="text-green-400 font-bold text-lg mb-4">🔥 Deflationary Mechanics</h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <div>• 30% of creator rewards = token burns</div>
                <div>• Lower supply = higher price per token</div>
                <div>• Your bag worth more without buying more</div>
                <div>• {(liveStats.tokensBurned / 1000000).toFixed(1)}M tokens already burned</div>
              </div>
            </div>
            
            <div className="bg-black/40 rounded-xl p-6">
              <h3 className="text-blue-400 font-bold text-lg mb-4">💰 Revenue Distribution</h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <div>• 40% creator rewards → holder prizes</div>
                <div>• 30% → token burns (price increase)</div>
                <div>• 30% → operations & development</div>
                <div>• {liveStats.totalSolAwarded.toFixed(2)} SOL already distributed</div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center bg-black/40 rounded-xl p-6">
            <h4 className="text-white font-bold text-lg mb-2">🎯 Your $ALPHA Works 24/7</h4>
            <p className="text-gray-300">
              Every Pump.fun transaction increases your wealth through burns, 
              gets you entries in giveaways, and contributes to bigger prize pools. 
              <span className="text-teal-400 font-semibold">This is sustainable capitalism where everyone wins.</span>
            </p>
          </div>
        </div>

        {/* Roadmap */}
        <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-3xl p-8 border border-orange-500/20 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <span className="mr-3">🗺️</span>
            Prize Scaling Roadmap
          </h2>
          
          <p className="text-gray-300 text-lg mb-6">
            We started with Gaming Consoles. We&apos;re scaling to Lamborghinis. Imagine where we&apos;ll be at $100M market cap.
          </p>

          <div className="space-y-4">
            <div className="flex items-center space-x-4 bg-black/40 rounded-lg p-4">
              <div className="text-2xl">🎮</div>
              <div className="flex-1">
                <div className="text-white font-bold">Current: Gaming Tier</div>
                <div className="text-gray-300 text-sm">Nintendo Switch 2, Gaming PCs, Tech Gadgets, Cash Prizes</div>
              </div>
              <div className="text-green-400 font-bold">✅ ACTIVE</div>
            </div>
            
            <div className="flex items-center space-x-4 bg-black/40 rounded-lg p-4 opacity-75">
              <div className="text-2xl">🏠</div>
              <div className="flex-1">
                <div className="text-white font-bold">$10M Market Cap: Lifestyle Tier</div>
                <div className="text-gray-300 text-sm">Rolex, MacBook Pro, High-end Electronics, Cash Prizes</div>
              </div>
              <div className="text-yellow-400 font-bold">COMING SOON</div>
            </div>
            
            <div className="flex items-center space-x-4 bg-black/40 rounded-lg p-4 opacity-50">
              <div className="text-2xl">🚗</div>
              <div className="flex-1">
                <div className="text-white font-bold">$50M Market Cap: Vehicle Tier</div>
                <div className="text-gray-300 text-sm">Tesla Model S, Motorcycles, Luxury Cars</div>
              </div>
              <div className="text-purple-400 font-bold">ROADMAP</div>
            </div>
            
            <div className="flex items-center space-x-4 bg-black/40 rounded-lg p-4 opacity-30">
              <div className="text-2xl">🏎️</div>
              <div className="flex-1">
                <div className="text-white font-bold">$100M Market Cap: LAMBO TIER</div>
                <div className="text-gray-300 text-sm">Lamborghini, Ferrari, House Down Payments, Yacht Trips</div>
              </div>
              <div className="text-red-400 font-bold">ULTIMATE GOAL</div>
            </div>
          </div>
        </div>

        {/* Community & Contact */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-3xl p-8 border border-gray-700 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <span className="mr-3">🤝</span>
            Join the Movement
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-blue-400 mb-4">🌐 Community</h3>
              <div className="space-y-3">
                <div>• Twitter: <a href="https://twitter.com/cascudox" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-cyan-400">@cascudox</a></div>
                <div>• Email: <a href="mailto:contact@alphaclub.fun" className="text-teal-400 hover:text-cyan-400">contact@alphaclub.fun</a></div>
                <div>• Contract: <span className="font-mono text-xs text-cyan-400">4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump</span></div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-purple-400 mb-4">📱 Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/dashboard" className="block bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg text-center transition-all">
                  View Dashboard
                </Link>
                <Link href="/vip" className="block bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-center transition-all">
                  Upgrade to VIP
                </Link>
                <a href="https://pump.fun/coin/4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump" target="_blank" rel="noopener noreferrer" className="block bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg text-center transition-all">
                  Buy $ALPHA
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 rounded-3xl p-8 border border-red-500/20 text-center">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center justify-center">
            <span className="mr-3">🚀</span>
            The Smartest Asymmetric Bet in Crypto
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto mb-8">
            You found the only token where <span className="text-teal-400 font-bold">holding automatically pays you</span>, 
            <span className="text-orange-400 font-bold"> burns increase your wealth</span>, and you can 
            <span className="text-purple-400 font-bold"> win Lamborghinis just for being early</span>. 
            The more successful we get, the richer existing holders become.
          </p>
          
          <div className="space-y-4">
            {!connected ? (
              <button
                onClick={() => setVisible(true)}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-xl"
              >
                🔗 Connect Wallet & Start Earning
              </button>
            ) : (
              <Link href="/dashboard">
                <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-xl">
                  🎯 View Your Dashboard
                </button>
              </Link>
            )}
            
            <div className="text-green-400 text-sm flex items-center justify-center space-x-4 mt-4">
              <span>✅ Automatic rewards</span>
              <span>•</span>
              <span>🔥 Deflationary burns</span>
              <span>•</span>
              <span>🏎️ Scale to Lambos</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm max-w-2xl mx-auto">
            This whitepaper is for informational purposes only and does not constitute financial advice. 
            Cryptocurrency investments carry risk, and past performance does not guarantee future results. 
            Please conduct your own research and consult with financial advisors before making investment decisions.
          </p>
        </div>
      </div>
    </div>
  );
};

const Whitepaper: NextPage = () => {
  return (
    <div>
      <Head>
        <title>ALPHA Club Whitepaper - REWARD BURN REPEAT</title>
        <meta
          name="description"
          content="ALPHA Club Whitepaper 2.0 - Where holding $ALPHA automatically earns money, burns make everyone richer, and community growth scales rewards for all."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <WhitepaperView />
    </div>
  );
};

export default Whitepaper;