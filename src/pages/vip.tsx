// src/pages/vip.tsx - FIXED: Add wallet modal functionality
import type { NextPage } from "next";
import Head from "next/head";
import { FC, useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PremiumSubscription } from '../components/PremiumSubscription';
import { useVipSubscriptionStore } from '../stores/useVipSubscriptionStore';
import Image from 'next/image';

const VipView: FC = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const { currentSubscription, checkSubscriptionStatus } = useVipSubscriptionStore();

  // Check subscription status when wallet connects
  useEffect(() => {
    if (wallet.publicKey && wallet.connected) {
      checkSubscriptionStatus(wallet.publicKey, connection);
    }
  }, [wallet.publicKey, wallet.connected, checkSubscriptionStatus, connection]);

  // Handler for wallet connection
  const handleConnectWallet = () => {
    setVisible(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Compact Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            👑 VIP CLUB
          </h1>
          <h2 className="text-xl text-white mb-4">
            Get 2x-5x More Chances to Win Daily
          </h2>
          
          {/* Compact Value Props */}
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl p-4 mb-6 border border-purple-500/20">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl">💰</span>
                <span className="text-gray-300">40% pump.fun fees &rarr; Daily rewards</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl">⚡</span>
                <span className="text-gray-300">Same $10/entry &bull; VIP multiplies chances</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-gray-300"><Image src="/solana-pay-white.png" alt="Solana Pay" width={60} height={12} className="inline" /></span>
                <span className="text-gray-300"> &bull; Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Early Bird - Compact */}
          <div className="bg-gradient-to-r from-orange-900/40 to-yellow-900/40 rounded-xl p-3 mb-6 border border-orange-500/20">
            <div className="flex items-center justify-center space-x-3">
              <span className="text-2xl">🎯</span>
              <div>
                <span className="text-white font-bold">Early Bird: +1 Bonus Entry</span>
                <span className="text-orange-400 ml-2">&bull; Next 48h only</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current VIP Status - if active */}
        {currentSubscription?.isActive && (
          <div className="mb-8 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-center space-x-4">
              <div className="text-4xl">👑</div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white">
                  {currentSubscription.tier} VIP Active
                </h3>
                <p className="text-purple-400">
                  {currentSubscription.multiplier}x multiplier active until {currentSubscription.expiresAt?.toLocaleDateString()}
                </p>
              </div>
              <div className="text-4xl">⚡</div>
            </div>
          </div>
        )}

        {/* VIP Subscription Plans - MOVED TO TOP */}
        <div className="mb-12" id="vip-plans">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Choose Your VIP Level</h2>
          <PremiumSubscription />
        </div>

        {/* Quick Value Demo - Compact */}
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-500/20 mb-12">
          <h3 className="text-xl font-bold text-white mb-4 text-center">💡 See the Impact</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-black/40 rounded-xl p-4 text-center">
              <div className="text-gray-400 font-semibold">$100 ALPHA</div>
              <div className="text-white">10 regular entries</div>
              <div className="text-green-400 font-bold">&rarr; 50 with Platinum VIP</div>
            </div>
            <div className="bg-black/40 rounded-xl p-4 text-center">
              <div className="text-gray-400 font-semibold">$500 ALPHA</div>
              <div className="text-white">50 regular entries</div>
              <div className="text-green-400 font-bold">&rarr; 250 with Platinum VIP</div>
            </div>
            <div className="bg-black/40 rounded-xl p-4 text-center">
              <div className="text-gray-400 font-semibold">$2000 ALPHA</div>
              <div className="text-white">200 regular entries</div>
              <div className="text-green-400 font-bold">&rarr; 1000 with Platinum VIP</div>
            </div>
          </div>
          <div className="text-center mt-4">
            <p className="text-gray-300 text-sm">
              🎯 Same fair $10/entry system &bull; VIP multiplies your chances
            </p>
          </div>
        </div>

        {/* Testimonials - Compact */}
        <div className="mb-12">
          <h3 className="text-xl font-bold text-white text-center mb-6">What Our Community Says</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="text-yellow-400 text-sm mb-2">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-300 text-xs italic mb-2">
                &ldquo;Holding $ALPHA is like a perma lottery ticket&rdquo;
              </p>
              <div className="text-white text-sm font-semibold">fortress_a</div>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="text-yellow-400 text-sm mb-2">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-300 text-xs italic mb-2">
                &ldquo;Most active dev on pumpfun, delivering the goods&rdquo;
              </p>
              <div className="text-white text-sm font-semibold">acdc</div>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="text-yellow-400 text-sm mb-2">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-300 text-xs italic mb-2">
                &ldquo;Will go to billions once big names notice&rdquo;
              </p>
              <div className="text-white text-sm font-semibold">Rdf5</div>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="text-yellow-400 text-sm mb-2">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-300 text-xs italic mb-2">
                &ldquo;Low risk, pure math. Best project in long time&rdquo;
              </p>
              <div className="text-white text-sm font-semibold">Aloyn9</div>
            </div>
          </div>
        </div>

        {/* Compact FAQ */}
        <div className="mb-12">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white text-center mb-6">Quick FAQ</h3>
            
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="text-white font-semibold mb-2">How do VIP multipliers work?</h4>
                <p className="text-gray-300">VIP multiplies your base entries (1 per $10 ALPHA). Silver=2x, Gold=3x, Platinum=5x your chances.</p>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-2">What are baseline entries?</h4>
                <p className="text-gray-300">Monthly bonus entries that accumulate: +2/+3/+5 per month. Grows your advantage over time.</p>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-2">Can I cancel anytime?</h4>
                <p className="text-gray-300">Yes! Cancel anytime, no refunds. Keep benefits until end of current billing period.</p>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-2">How secure are payments?</h4>
                <p className="text-gray-300">Solana Pay = blockchain secure. No credit cards, no personal data stored.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA - Compact */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-2xl p-6 border border-purple-500/20">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to 5x Your Chances?</h3>
            
            {!wallet.connected ? (
              <div className="space-y-3">
                <p className="text-gray-300">Connect wallet to get started with VIP</p>
                <button 
                  onClick={handleConnectWallet}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105"
                >
                  🔗 Connect Wallet
                </button>
                <div className="text-green-400 text-sm flex items-center justify-center space-x-4">
                  <span>✅ Instant activation</span>
                  <span>&bull;</span>
                  <span className="flex items-center space-x-1">
                    <span>Powered by</span>
                    <Image src="/solana-pay-white.png" alt="Solana Pay" width={60} height={12} className="inline" />
                  </span>
                  <span>&bull;</span>
                  <span>Cancel anytime</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button 
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105"
                  onClick={() => document.getElementById('vip-plans')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  🚀 Choose Your VIP Plan Above
                </button>
                <div className="text-green-400 text-sm flex items-center justify-center space-x-4">
                  <span>✅ Instant activation</span>
                  <span>&bull;</span>
                  <span className="flex items-center space-x-1">
                    <span>Powered by</span>
                    <Image src="/solana-pay-logo.png" alt="Solana Pay" width={60} height={12} className="inline" />
                  </span>
                  <span>&bull;</span>
                  <span>Cancel anytime</span>
                </div>
              </div>
            )}
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
        <title>VIP Club - 2x-5x More Chances | ALPHA</title>
        <meta
          name="description"
          content="Get 2x-5x more chances to win daily rewards. Same fair system, VIP just multiplies your odds. Solana Pay secure."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <VipView />
    </div>
  );
};

export default Vip;
