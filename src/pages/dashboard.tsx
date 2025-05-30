// src/pages/dashboard.tsx
import type { NextPage } from "next";
import Head from "next/head";
import { FC, useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useAlphaTokenStore } from '../stores/useAlphaTokenStore';
import { useMembershipStore } from '../stores/useMembershipStore';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MembershipCard } from '../components/MembershipCard';
import { DailyRewardsSection } from '../components/DailyRewardsSection';
import Link from 'next/link';

const DashboardView: FC = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const { 
    tokenBalance, 
    usdValue, 
    pricePerToken,
    holderRank,
    percentageOfSupply,
    getAlphaTokenBalance,
    getHolderStats
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
          await getHolderStats(wallet.publicKey, connection);
        } catch (error) {
          console.error('Error fetching member data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchMemberData();
    }
  }, [wallet.publicKey, connection, getAlphaTokenBalance, getMembershipStatus, getHolderStats]);

  // Mock data for member perks - will be dynamic later
  const memberPerks = {
    holdingPeriod: 45, // days
    socialEngagement: 8, // score out of 10
    referrals: 3,
    communityRank: 'Active',
    streakDays: 12,
    unlockedPerks: [
      'Daily Rewards Access',
      'Member Badge',
      'Basic Support',
      'Community Access'
    ],
    availablePerks: [
      'Priority Support (Hold 60+ days)',
      'Engage more)',
      'Referral Bonuses (5+ referrals)',
      'VIP Chat Access (Gold tier + active)'
    ]
  };

  const NotConnectedView = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-6xl mb-8">🔐</div>
        <h1 className="text-3xl font-bold text-white mb-4">Member Dashboard</h1>
        <p className="text-gray-300 mb-8">
          Connect your wallet to access your personalized ALPHA Club dashboard
        </p>
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-full px-6 py-3 text-white font-semibold animate-bounce">
          👆 Connect Wallet Above 👆
        </div>
      </div>
    </div>
  );

  if (!wallet.connected) {
    return <NotConnectedView />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Welcome back! {membershipTier !== 'None' && (
                <span className="text-teal-400">
                  {membershipTier === 'Gold' && '👑'}
                  {membershipTier === 'Silver' && '🥈'}
                  {membershipTier === 'Bronze' && '🥉'}
                </span>
              )}
            </h1>
            <p className="text-gray-300 text-lg">
              {wallet.publicKey?.toString().slice(0, 4)}...{wallet.publicKey?.toString().slice(-4)}
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <div className="text-right">
              <div className="text-sm text-gray-400">Last Updated</div>
              <div className="text-white font-semibold">{new Date().toLocaleTimeString()}</div>
            </div>
            <button 
              onClick={() => {
                if (wallet.publicKey) {
                  getAlphaTokenBalance(wallet.publicKey, connection);
                  getMembershipStatus(wallet.publicKey, connection);
                }
              }}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'rewards', label: 'My Rewards', icon: '🏆' },
            { id: 'perks', label: 'Member Perks', icon: '⭐' },
            { id: 'analytics', label: 'Analytics', icon: '📈' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Left Column - Membership Card & Stats */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Membership Overview */}
              <MembershipCard
                tokenBalance={tokenBalance}
                usdValue={usdValue}
                membershipTier={membershipTier}
                isEligible={isEligible}
                dailyEntries={dailyEntries}
              />

              {/* Portfolio Stats */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-6">Portfolio Analytics</h2>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-black/40 rounded-2xl p-6 text-center">
                    <div className="text-2xl font-bold text-teal-400 mb-2">
                      {holderRank ? `#${holderRank}` : '--'}
                    </div>
                    <div className="text-gray-400 text-sm">Holder Rank</div>
                  </div>
                  
                  <div className="bg-black/40 rounded-2xl p-6 text-center">
                    <div className="text-2xl font-bold text-cyan-400 mb-2">
                      {percentageOfSupply ? `${percentageOfSupply.toFixed(4)}%` : '--'}
                    </div>
                    <div className="text-gray-400 text-sm">Of Supply</div>
                  </div>
                  
                  <div className="bg-black/40 rounded-2xl p-6 text-center">
                    <div className="text-2xl font-bold text-emerald-400 mb-2">
                      ${(pricePerToken * 200).toFixed(6)}
                    </div>
                    <div className="text-gray-400 text-sm">Token Price (USD)</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <Link href="/rewards" className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white p-4 rounded-xl font-semibold transition-all transform hover:scale-105 text-center">
                    🏆 View Reward History
                  </Link>
                  <Link href="/vip" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-4 rounded-xl font-semibold transition-all transform hover:scale-105 text-center">
                    👑 Upgrade to VIP
                  </Link>
                  <Link href="/leaderboard" className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-xl font-semibold transition-all transform hover:scale-105 text-center">
                    📊 View Leaderboard
                  </Link>
                  <Link href="/burns" className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white p-4 rounded-xl font-semibold transition-all transform hover:scale-105 text-center">
                    🔥 Token Burns
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column - Daily Rewards */}
            <div>
              <DailyRewardsSection />
            </div>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="space-y-8">
            
            {/* My Rewards Summary */}
            <div className="bg-gradient-to-br from-green-800/30 to-emerald-800/30 rounded-3xl p-8 border border-green-500/20">
              <h2 className="text-2xl font-bold text-white mb-6">My Rewards Summary</h2>
              
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">--</div>
                  <div className="text-gray-300">Total Wins</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-400 mb-2">-- SOL</div>
                  <div className="text-gray-300">Total Earned</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-teal-400 mb-2">--%</div>
                  <div className="text-gray-300">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-cyan-400 mb-2">--</div>
                  <div className="text-gray-300">Days Active</div>
                </div>
              </div>
            </div>

            {/* Recent Rewards */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6">Recent Rewards</h2>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <p className="text-gray-400 text-lg">Your reward history will appear here</p>
                <p className="text-gray-500 text-sm mt-2">Connect to live rewards tracking system</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'perks' && (
          <div className="space-y-8">
            
            {/* Member Status */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6">Member Status & Perks</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                
                {/* Current Status */}
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Your Status</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg">
                      <span className="text-gray-300">Membership Tier</span>
                      <span className="text-teal-400 font-bold">{membershipTier}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg">
                      <span className="text-gray-300">Holding Period</span>
                      <span className="text-cyan-400 font-bold">{memberPerks.holdingPeriod} days</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg">
                      <span className="text-gray-300">Community Rank</span>
                      <span className="text-emerald-400 font-bold">{memberPerks.communityRank}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg">
                      <span className="text-gray-300">Referrals</span>
                      <span className="text-yellow-400 font-bold">{memberPerks.referrals}</span>
                    </div>
                  </div>
                </div>

                {/* Engagement Score */}
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Engagement Score</h3>
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-teal-400 mb-2">
                      {memberPerks.socialEngagement}/10
                    </div>
                    <div className="text-gray-300">Community Engagement</div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                    <div 
                      className="bg-gradient-to-r from-teal-400 to-cyan-500 h-3 rounded-full transition-all duration-1000"
                      style={{ width: `${memberPerks.socialEngagement * 10}%` }}
                    />
                  </div>
                  <p className="text-gray-400 text-sm text-center">
                    Based on community participation, social media engagement, and activity
                  </p>
                </div>
              </div>
            </div>

            {/* Partner Benefits - Detailed */}
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-3xl p-8 border border-purple-500/20">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">🤝</span>
                Exclusive Partner Benefits
              </h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                
                {/* Cloud & Infrastructure */}
                <div className="bg-black/40 rounded-2xl p-6 border border-gray-600">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
                      <div className="text-sm font-bold text-white">AWS</div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">Amazon AWS</h4>
                      <p className="text-xs text-gray-400">Cloud Computing</p>
                    </div>
                  </div>
                  <div className="text-orange-400 font-bold mb-2">Up to $10,000 Credits</div>
                  <p className="text-gray-300 text-sm mb-3">AWS Activate program for qualifying startups and businesses</p>
                  <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-all">
                    Claim Offer
                  </button>
                </div>

                <div className="bg-black/40 rounded-2xl p-6 border border-gray-600">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
                      <div className="text-xs font-bold text-white">GCP</div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">Google Cloud</h4>
                      <p className="text-xs text-gray-400">Cloud Platform</p>
                    </div>
                  </div>
                  <div className="text-blue-400 font-bold mb-2">$300 Free Credits</div>
                  <p className="text-gray-300 text-sm mb-3">Google Cloud Platform credits for new accounts</p>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-all">
                    Claim Offer
                  </button>
                </div>

                <div className="bg-black/40 rounded-2xl p-6 border border-gray-600">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
                      <div className="text-xs font-bold text-white">DO</div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">DigitalOcean</h4>
                      <p className="text-xs text-gray-400">Developer Cloud</p>
                    </div>
                  </div>
                  <div className="text-cyan-400 font-bold mb-2">$200 Credit</div>
                  <p className="text-gray-300 text-sm mb-3">60-day trial for new developer accounts</p>
                  <button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-all">
                    Claim Offer
                  </button>
                </div>

                {/* Marketing & Analytics */}
                <div className="bg-black/40 rounded-2xl p-6 border border-gray-600">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-yellow-500 rounded-xl flex items-center justify-center">
                      <div className="text-xs font-bold text-white">GAds</div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">Google Ads</h4>
                      <p className="text-xs text-gray-400">Online Advertising</p>
                    </div>
                  </div>
                  <div className="text-green-400 font-bold mb-2">$150 Ad Credits</div>
                  <p className="text-gray-300 text-sm mb-3">After spending first $150 on ads</p>
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-all">
                    Claim Offer
                  </button>
                </div>

                <div className="bg-black/40 rounded-2xl p-6 border border-gray-600">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                      <div className="text-xs font-bold text-white">MC</div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">Mailchimp</h4>
                      <p className="text-xs text-gray-400">Email Marketing</p>
                    </div>
                  </div>
                  <div className="text-yellow-400 font-bold mb-2">Premium Plan</div>
                  <p className="text-gray-300 text-sm mb-3">6 months free premium features</p>
                  <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-all">
                    Claim Offer
                  </button>
                </div>

                <div className="bg-black/40 rounded-2xl p-6 border border-gray-600">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                      <div className="text-xs font-bold text-white">HS</div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">HubSpot</h4>
                      <p className="text-xs text-gray-400">CRM & Marketing</p>
                    </div>
                  </div>
                  <div className="text-orange-400 font-bold mb-2">Startup Package</div>
                  <p className="text-gray-300 text-sm mb-3">75% discount on HubSpot tools</p>
                  <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-all">
                    Claim Offer
                  </button>
                </div>
              </div>

              <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/20">
                <p className="text-purple-400 font-semibold mb-2">🎯 How to Access:</p>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• Click &ldquo;Claim Offer&rdquo; to get your unique referral link</li>
                  <li>• Some offers require verification of your ALPHA holdings</li>
                  <li>• Higher membership tiers unlock better deals</li>
                  <li>• New partners and offers added regularly</li>
                </ul>
              </div>
            </div>

            {/* Unlocked Perks */}
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* Current Perks */}
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-3xl p-8 border border-green-500/20">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <span className="mr-2">✅</span>
                  Unlocked Perks
                </h3>
                
                <div className="space-y-3">
                  {memberPerks.unlockedPerks.map((perk, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-black/40 rounded-lg">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                        ✓
                      </div>
                      <span className="text-gray-300">{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Perks */}
              <div className="bg-gradient-to-br from-orange-900/30 to-yellow-900/30 rounded-3xl p-8 border border-orange-500/20">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <span className="mr-2">🔓</span>
                  Available Perks
                </h3>
                
                <div className="space-y-3">
                  {memberPerks.availablePerks.map((perk, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-black/40 rounded-lg">
                      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm">
                        !
                      </div>
                      <span className="text-gray-300 text-sm">{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            
            {/* Analytics Coming Soon */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-12 border border-gray-700 text-center">
              <div className="text-6xl mb-6">📊</div>
              <h2 className="text-3xl font-bold text-white mb-4">Advanced Analytics</h2>
              <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                Detailed portfolio analytics, reward predictions, and market insights coming soon
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 opacity-50">
                <div className="bg-black/40 rounded-xl p-6">
                  <div className="text-3xl mb-3">📈</div>
                  <h4 className="text-lg font-semibold text-white mb-2">Portfolio Tracking</h4>
                  <p className="text-gray-400 text-sm">Real-time value tracking and performance metrics</p>
                </div>
                
                <div className="bg-black/40 rounded-xl p-6">
                  <div className="text-3xl mb-3">🎯</div>
                  <h4 className="text-lg font-semibold text-white mb-2">Reward Predictions</h4>
                  <p className="text-gray-400 text-sm">AI-powered win probability and optimization tips</p>
                </div>
                
                <div className="bg-black/40 rounded-xl p-6">
                  <div className="text-3xl mb-3">🌊</div>
                  <h4 className="text-lg font-semibold text-white mb-2">Market Insights</h4>
                  <p className="text-gray-400 text-sm">Token trends, burn impact, and market analysis</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Member Dashboard - ALPHA Club</title>
        <meta
          name="description"
          content="Your personal ALPHA Club dashboard. Track rewards, manage membership, view analytics, and access exclusive member perks."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <DashboardView />
    </div>
  );
};

export default Dashboard;