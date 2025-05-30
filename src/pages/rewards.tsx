// src/pages/rewards.tsx
import type { NextPage } from "next";
import Head from "next/head";
import { FC, useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useAlphaTokenStore } from '../stores/useAlphaTokenStore';
import { useMembershipStore } from '../stores/useMembershipStore';
import { LoadingSpinner } from '../components/LoadingSpinner';

const RewardsView: FC = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [isLoading, setIsLoading] = useState(false);
  
  const { 
    tokenBalance, 
    usdValue, 
    getAlphaTokenBalance 
  } = useAlphaTokenStore();
  
  const { 
    membershipTier, 
    isEligible, 
    dailyEntries,
    getMembershipStatus 
  } = useMembershipStore();

  useEffect(() => {
    if (wallet.publicKey) {
      const fetchMemberData = async () => {
        setIsLoading(true);
        try {
          await getAlphaTokenBalance(wallet.publicKey, connection);
          await getMembershipStatus(wallet.publicKey, connection);
        } catch (error) {
          console.error('Error fetching member data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchMemberData();
    }
  }, [wallet.publicKey, connection, getAlphaTokenBalance, getMembershipStatus]);

  const ComingSoonBanner = () => (
    <div className="bg-gradient-to-r from-teal-900/40 to-cyan-900/40 backdrop-blur-sm rounded-2xl p-6 border border-teal-500/20 mb-8">
      <div className="flex items-center justify-center space-x-4">
        <div className="text-4xl">🚧</div>
        <div>
          <h2 className="text-2xl font-bold text-white">Coming Soon</h2>
          <p className="text-teal-400">Advanced reward features are under development</p>
        </div>
        <div className="text-4xl">🚧</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            🏆 Reward Center
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Track your rewards, view history, and manage your daily entries
          </p>
        </div>

        <ComingSoonBanner />

        {/* Preview Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column - Current Status */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Today's Draw Status */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">⏰</span>
                Today&apos;s Draw Status
              </h2>
              
              {wallet.connected ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-black/40 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm mb-2">Your Entries Today</div>
                    <div className="text-3xl font-bold text-teal-400 mb-2">{dailyEntries}</div>
                    <div className="text-sm text-gray-500">
                      {membershipTier} Member ({isEligible ? 'Eligible' : 'Not Eligible'})
                    </div>
                  </div>
                  
                  <div className="bg-black/40 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm mb-2">Next Draw In</div>
                    <div className="text-3xl font-bold text-cyan-400 mb-2">4h 23m</div>
                    <div className="text-sm text-gray-500">11:00 UTC Daily</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🔌</div>
                  <p className="text-gray-400 text-lg">Connect your wallet to view your reward status</p>
                </div>
              )}
              
              <div className="mt-6 p-4 bg-teal-900/20 rounded-xl border border-teal-500/20">
                <p className="text-teal-400 font-semibold">🔮 Future Features:</p>
                <ul className="text-gray-300 text-sm mt-2 space-y-1">
                  <li>• Real-time countdown to next draw</li>
                  <li>• Live entry confirmation</li>
                  <li>• Bonus entry opportunities</li>
                  <li>• Entry multiplier tracking</li>
                </ul>
              </div>
            </div>

            {/* Reward History */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">📜</span>
                Your Reward History
              </h2>
              
              {wallet.connected ? (
                <div className="space-y-4">
                  {/* Sample reward entries - will be dynamic */}
                  {[
                    { date: '2024-01-26', amount: 0.247, status: 'Won', tx: '5x7K...9mRp' },
                    { date: '2024-01-20', amount: 0.189, status: 'Won', tx: '8nB2...k5Wp' },
                    { date: '2024-01-15', amount: 0.356, status: 'Won', tx: '3mX4...j7Qs' }
                  ].map((reward, index) => (
                    <div key={index} className="bg-black/40 rounded-xl p-4 flex items-center justify-between opacity-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                          🏆
                        </div>
                        <div>
                          <div className="text-white font-medium">{reward.date}</div>
                          <div className="text-gray-400 text-sm">{reward.status}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold">{reward.amount} SOL</div>
                        <div className="text-gray-500 text-xs font-mono">{reward.tx}</div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="text-center py-4">
                    <div className="text-gray-500 text-sm">Sample data - Connect to live rewards API</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎯</div>
                  <p className="text-gray-400 text-lg">Connect wallet to view your personal reward history</p>
                </div>
              )}
              
              <div className="mt-6 p-4 bg-purple-900/20 rounded-xl border border-purple-500/20">
                <p className="text-purple-400 font-semibold">🚀 Planned Features:</p>
                <ul className="text-gray-300 text-sm mt-2 space-y-1">
                  <li>• Complete win/loss history</li>
                  <li>• Reward analytics & statistics</li>
                  <li>• Export rewards for tax purposes</li>
                  <li>• Claimable rewards management</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column - Quick Stats & Actions */}
          <div className="space-y-8">
            
            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Quick Stats</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Wins</span>
                  <span className="text-teal-400 font-bold">--</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Earned</span>
                  <span className="text-green-400 font-bold">-- SOL</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Win Rate</span>
                  <span className="text-cyan-400 font-bold">--%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Rank</span>
                  <span className="text-yellow-400 font-bold">#--</span>
                </div>
              </div>
            </div>

            {/* Membership Benefits */}
            <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 rounded-3xl p-6 border border-teal-500/20">
              <h3 className="text-xl font-bold text-white mb-4">Membership Perks</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${isEligible ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                  <span className="text-gray-300">Daily Entries: {dailyEntries}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${isEligible ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                  <span className="text-gray-300">Member Support</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${membershipTier === 'Gold' ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                  <span className="text-gray-300">Priority Processing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${membershipTier !== 'None' ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                  <span className="text-gray-300">Exclusive Updates</span>
                </div>
              </div>

              {!isEligible && (
                <div className="mt-4 p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/20">
                  <p className="text-yellow-400 text-sm font-semibold">💡 Upgrade Tip:</p>
                  <p className="text-gray-300 text-xs mt-1">
                    Hold $10+ worth of $ALPHA to become eligible for daily rewards
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white py-3 rounded-xl font-semibold transition-all transform hover:scale-105 opacity-50 cursor-not-allowed">
                  View Live Draw
                </button>
                <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-xl font-semibold transition-all transform hover:scale-105 opacity-50 cursor-not-allowed">
                  Claim Rewards
                </button>
                <button className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-all opacity-50 cursor-not-allowed">
                  Export History
                </button>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-gray-500 text-xs">Features coming soon!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 rounded-2xl p-8 border border-teal-500/20">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Start Earning?</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Hold $ALPHA tokens to participate in daily reward draws. The more you hold, the more chances you get!
            </p>
            <div className="flex items-center justify-center space-x-6">
              <div className="text-center">
                <div className="text-lg font-semibold text-teal-400">Bronze: $10+</div>
                <div className="text-sm text-gray-400">1 daily entry</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-teal-400">Silver: $100+</div>
                <div className="text-sm text-gray-400">3 daily entries</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-teal-400">Gold: $1000+</div>
                <div className="text-sm text-gray-400">10 daily entries</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Rewards: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Rewards - ALPHA Club</title>
        <meta
          name="description"
          content="Track your ALPHA Club rewards, view history, and manage your daily entries in the exclusive $ALPHA holders reward system."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <RewardsView />
    </div>
  );
};

export default Rewards;