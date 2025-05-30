// src/pages/vip.tsx
import type { NextPage } from "next";
import Head from "next/head";
import { FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PremiumSubscription } from '../components/PremiumSubscription';

const VipView: FC = () => {
  const wallet = useWallet();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const ComingSoonBanner = () => (
    <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 mb-8">
      <div className="flex items-center justify-center space-x-4">
        <div className="text-4xl">🚧</div>
        <div>
          <h2 className="text-2xl font-bold text-white">VIP Features Coming Soon</h2>
          <p className="text-purple-400">Premium subscriptions and Solana Pay integration under development</p>
        </div>
        <div className="text-4xl">🚧</div>
      </div>
    </div>
  );

  const VipPerks = () => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
      
      {/* Exclusive Rewards */}
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl p-8 border border-purple-500/20 text-center">
        <div className="text-5xl mb-4">💎</div>
        <h3 className="text-xl font-bold text-white mb-4">Exclusive Rewards</h3>
        <ul className="text-gray-300 space-y-2 text-left">
          <li>• VIP-only reward pools</li>
          <li>• Guaranteed weekly payouts</li>
          <li>• Higher reward multipliers</li>
          <li>• Bonus entry opportunities</li>
        </ul>
      </div>

      {/* Priority Access */}
      <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-2xl p-8 border border-yellow-500/20 text-center">
        <div className="text-5xl mb-4">⚡</div>
        <h3 className="text-xl font-bold text-white mb-4">Priority Access</h3>
        <ul className="text-gray-300 space-y-2 text-left">
          <li>• First access to new features</li>
          <li>• Priority customer support</li>
          <li>• Exclusive community chat</li>
          <li>• Direct line to developers</li>
        </ul>
      </div>

      {/* Premium Analytics */}
      <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-2xl p-8 border border-green-500/20 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h3 className="text-xl font-bold text-white mb-4">Premium Analytics</h3>
        <ul className="text-gray-300 space-y-2 text-left">
          <li>• Advanced portfolio tracking</li>
          <li>• Detailed reward analytics</li>
          <li>• Market insights & alerts</li>
          <li>• Tax reporting tools</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center bg-gradient-to-r from-purple-900/40 to-blue-900/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl px-8 py-4 mb-6">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              👑 VIP CLUB
            </h1>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Unlock Premium ALPHA Experience
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Supercharge your rewards with VIP subscriptions. Get more chances, exclusive perks, and premium support.
          </p>
        </div>

        <ComingSoonBanner />

        {/* VIP Benefits Overview */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Exclusive VIP Benefits</h2>
          <VipPerks />
        </div>

        {/* VIP Subscription Plans */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Choose Your VIP Level</h2>
          <p className="text-gray-400 text-center mb-12">All plans include base membership benefits plus VIP exclusives</p>
          <PremiumSubscription />
        </div>

        {/* VIP vs Regular Comparison */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white text-center mb-8">VIP vs Regular Membership</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="py-4 px-6 text-gray-400 font-semibold">Features</th>
                    <th className="py-4 px-6 text-center text-gray-400 font-semibold">Regular</th>
                    <th className="py-4 px-6 text-center text-purple-400 font-semibold">VIP Bronze</th>
                    <th className="py-4 px-6 text-center text-gray-300 font-semibold">VIP Silver</th>
                    <th className="py-4 px-6 text-center text-yellow-400 font-semibold">VIP Diamond</th>
                  </tr>
                </thead>
                <tbody className="opacity-75">
                  <tr className="border-b border-gray-700">
                    <td className="py-4 px-6 text-white">Daily Entries</td>
                    <td className="py-4 px-6 text-center text-gray-400">1-10</td>
                    <td className="py-4 px-6 text-center text-purple-400 font-bold">2x-20x</td>
                    <td className="py-4 px-6 text-center text-gray-300 font-bold">5x-50x</td>
                    <td className="py-4 px-6 text-center text-yellow-400 font-bold">10x-100x</td>
                  </tr>
                  <tr className="border-b border-gray-700">
                    <td className="py-4 px-6 text-white">Support Priority</td>
                    <td className="py-4 px-6 text-center text-gray-400">Standard</td>
                    <td className="py-4 px-6 text-center text-purple-400">Priority</td>
                    <td className="py-4 px-6 text-center text-gray-300">High Priority</td>
                    <td className="py-4 px-6 text-center text-yellow-400">Instant</td>
                  </tr>
                  <tr className="border-b border-gray-700">
                    <td className="py-4 px-6 text-white">Exclusive Rewards</td>
                    <td className="py-4 px-6 text-center text-gray-400">❌</td>
                    <td className="py-4 px-6 text-center text-purple-400">✅</td>
                    <td className="py-4 px-6 text-center text-gray-300">✅</td>
                    <td className="py-4 px-6 text-center text-yellow-400">✅</td>
                  </tr>
                  <tr className="border-b border-gray-700">
                    <td className="py-4 px-6 text-white">Guaranteed Payouts</td>
                    <td className="py-4 px-6 text-center text-gray-400">❌</td>
                    <td className="py-4 px-6 text-center text-purple-400">❌</td>
                    <td className="py-4 px-6 text-center text-gray-300">Monthly</td>
                    <td className="py-4 px-6 text-center text-yellow-400">Weekly</td>
                  </tr>
                  <tr className="border-b border-gray-700">
                    <td className="py-4 px-6 text-white">Analytics Dashboard</td>
                    <td className="py-4 px-6 text-center text-gray-400">Basic</td>
                    <td className="py-4 px-6 text-center text-purple-400">Enhanced</td>
                    <td className="py-4 px-6 text-center text-gray-300">Premium</td>
                    <td className="py-4 px-6 text-center text-yellow-400">Pro</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 text-white">Dev Access</td>
                    <td className="py-4 px-6 text-center text-gray-400">❌</td>
                    <td className="py-4 px-6 text-center text-purple-400">❌</td>
                    <td className="py-4 px-6 text-center text-gray-300">❌</td>
                    <td className="py-4 px-6 text-center text-yellow-400">✅</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* VIP Community Stats */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          
          {/* Current VIP Members */}
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-3xl p-8 border border-purple-500/20">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="mr-3">👑</span>
              VIP Community
            </h3>
            
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-400 mb-2">247</div>
                <div className="text-gray-300">Total VIP Members</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-orange-400">89</div>
                  <div className="text-xs text-gray-400">Bronze</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-300">127</div>
                  <div className="text-xs text-gray-400">Silver</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">31</div>
                  <div className="text-xs text-gray-400">Diamond</div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-600">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">VIP Rewards Distributed</span>
                  <span className="text-purple-400 font-bold">12.47 SOL</span>
                </div>
              </div>
            </div>
          </div>

          {/* VIP Testimonials */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="mr-3">💬</span>
              VIP Reviews
            </h3>
            
            <div className="space-y-6">
              <div className="bg-black/40 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-black font-bold text-sm">
                    💎
                  </div>
                  <div>
                    <div className="text-white font-semibold">8BEt...qxKt</div>
                    <div className="text-xs text-yellow-400">Diamond VIP</div>
                  </div>
                </div>
                <p className="text-gray-300 text-sm italic">
                  &ldquo;The guaranteed weekly payouts are amazing! Already earned back my subscription cost.&rdquo;
                </p>
              </div>
              
              <div className="bg-black/40 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-black font-bold text-sm">
                    🥈
                  </div>
                  <div>
                    <div className="text-white font-semibold">D3oB...Y9nn</div>
                    <div className="text-xs text-gray-300">Silver VIP</div>
                  </div>
                </div>
                <p className="text-gray-300 text-sm italic">
                  &ldquo;Priority support is incredible. Dev team responded within minutes!&rdquo;
                </p>
              </div>
              
              <div className="bg-black/40 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center text-black font-bold text-sm">
                    🥉
                  </div>
                  <div>
                    <div className="text-white font-semibold">ByYq...X6EB</div>
                    <div className="text-xs text-orange-400">Bronze VIP</div>
                  </div>
                </div>
                <p className="text-gray-300 text-sm italic">
                  &ldquo;Double the chances means double the fun. Worth every penny!&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white text-center mb-8">VIP FAQ</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">How do VIP subscriptions work?</h4>
                  <p className="text-gray-300 text-sm">VIP subscriptions are paid monthly using SOL, USDC, or ALPHA tokens via Solana Pay. Your benefits activate immediately upon payment.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Can I cancel anytime?</h4>
                  <p className="text-gray-300 text-sm">Yes! VIP subscriptions can be cancelled at any time. You&apos;ll keep your benefits until the end of your current billing period.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Do I need to hold ALPHA tokens?</h4>
                  <p className="text-gray-300 text-sm">Yes, VIP benefits stack on top of your regular membership tier. You still need to hold ALPHA tokens to participate in rewards.</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">What payment methods are accepted?</h4>
                  <p className="text-gray-300 text-sm">We accept SOL, USDC, and ALPHA tokens. All payments are processed securely through Solana Pay.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Are there any long-term discounts?</h4>
                  <p className="text-gray-300 text-sm">Currently monthly only, but we&apos;re planning quarterly and annual options with significant discounts coming soon!</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">When do guaranteed payouts happen?</h4>
                  <p className="text-gray-300 text-sm">Silver VIP gets monthly guaranteed payouts, Diamond VIP gets weekly. These are in addition to regular daily draws.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ready to Upgrade CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-3xl p-12 border border-purple-500/20">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Go VIP?</h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join the exclusive VIP community and supercharge your ALPHA experience with premium benefits.
            </p>
            
            {!wallet.connected ? (
              <div className="space-y-4">
                <div className="inline-block px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-full text-white font-semibold animate-bounce">
                  👆 Connect Wallet to Get Started 👆
                </div>
                <p className="text-gray-400 text-sm">Connect your wallet to view available VIP plans</p>
              </div>
            ) : (
              <div className="space-y-4">
                <button 
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-xl opacity-50 cursor-not-allowed"
                  disabled
                >
                  Choose VIP Plan (Coming Soon)
                </button>
                <p className="text-gray-400 text-sm">VIP subscriptions launching soon with Solana Pay integration</p>
              </div>
            )}
            
            <div className="flex items-center justify-center space-x-6 mt-8 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Secure Payments</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Instant Activation</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>Cancel Anytime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Vip: NextPage = () => {
  return (
    <div>
      <Head>
        <title>VIP Club - ALPHA Premium Subscriptions</title>
        <meta
          name="description"
          content="Upgrade to ALPHA VIP for exclusive rewards, priority support, and premium benefits. Choose from Bronze, Silver, or Diamond VIP subscriptions."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <VipView />
    </div>
  );
};

export default Vip;