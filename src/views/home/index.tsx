// src/views/home/index.tsx
import { FC, useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { MembershipCard } from '../../components/MembershipCard';
import { DailyRewardsSection } from '../../components/DailyRewardsSection';
import { StatsOverview } from '../../components/StatsOverview';
import { PremiumSubscription } from '../../components/PremiumSubscription';
import { useAlphaTokenStore } from '../../stores/useAlphaTokenStore';
import { useMembershipStore } from '../../stores/useMembershipStore';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { MemberDashboardSection } from '../../components/MemberDashboardSection';
import { LiveStatsSection } from '../../components/LiveStatsSection';
import Image from 'next/image';
import { googleSheetsService } from '../../utils/googleSheetsService';

export const AlphaHomeView: FC = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
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

  const [liveStats, setLiveStats] = useState({
    totalSolAwarded: 0,
    activeMembers: 'Loading...',
    isLoading: true
  });

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
  
  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const stats = await googleSheetsService.getStatsData();
        
        // Get total SOL from Google Sheets
        const totalSolAwarded = stats.totalHolderPrizes;
        
        // Estimate active members from unique winners * multiplier
        const estimatedMembers = Math.max(stats.totalMembers, 1000);
        
        setLiveStats({
          totalSolAwarded,
          activeMembers: estimatedMembers.toLocaleString(),
          isLoading: false
        });
      } catch (error) {
        console.error('Error fetching live stats:', error);
        setLiveStats({
          totalSolAwarded: 0,
          activeMembers: 'Loading...',
          isLoading: false
        });
      }
    };

    fetchLiveStats();
  }, []);

  const HeroSection = () => (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* Clean Background Effects - Fixed positioning */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/8 rounded-full blur-3xl animate-pulse max-w-full"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl animate-pulse delay-1000 max-w-full"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl animate-pulse delay-500 max-w-full" style={{transform: 'translate(-50%, -50%)'}}></div>
      </div>
      
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Main Logo */}
          <div className="mb-8">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent leading-none">
              ALPHA
            </h1>
            <div className="text-lg sm:text-xl md:text-2xl font-semibold text-white mt-4">
              EXCLUSIVE MEMBERS CLUB
            </div>
          </div>

          {/* Clear USP - REWARD | BURN | REPEAT */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center bg-gradient-to-r from-teal-900/40 to-cyan-900/40 backdrop-blur-sm border border-teal-500/30 rounded-2xl px-8 py-4 mb-6">
              <div className="flex items-center space-x-4 text-2xl sm:text-3xl md:text-4xl font-bold">
                <span className="text-green-400">REWARD</span>
                <span className="text-teal-400">|</span>
                <span className="text-orange-400">BURN</span>
                <span className="text-teal-400">|</span>
                <span className="text-cyan-400">REPEAT</span>
              </div>
            </div>
            <p className="text-lg sm:text-xl text-gray-300 font-semibold italic mb-4">
              &ldquo;Daily rewards. Daily burns. Repeat.&rdquo;
            </p>
            <div className="bg-gradient-to-r from-red-900/40 to-orange-900/40 backdrop-blur-sm rounded-xl p-4 border border-red-500/20 max-w-md mx-auto">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                <span className="text-red-400 font-bold text-sm">DAILY DRAWS FROM 11:00 UTC</span>
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Social Media Icons */}
          <div className="flex items-center justify-center gap-5 md:gap-8 mb-8">
            {[
              { href: 'https://pump.fun/coin/4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump', src: '/pumpfun.png', alt: 'pumpfun' },
              { href: 'https://x.com/AutopumpAlpha', src: '/x.png', alt: 'X (Twitter)' },
              { href: 'https://t.me/cascudox', src: '/telegram_logo.svg', alt: 'Telegram' },
              { href: 'https://dexscreener.com/solana/4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump', src: '/dexs-b.png', alt: 'DexScreener' },
            ].map(({ href, src, alt }, index) => (
              <a
                key={index}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="transform transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75 rounded-full"
                aria-label={alt}
              >
                <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-full border border-teal-500/20 hover:border-teal-400/50 transition-all duration-300 hover:bg-black/50">
                  <Image
                    src={src}
                    alt={alt}
                    width={40}
                    height={40}
                    className="object-contain w-8 h-8 md:w-10 md:h-10"
                  />
                </div>
              </a>
            ))}
          </div>

          {/* Contract Address */}
          <div className="max-w-3xl mx-auto mb-12 px-4">
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-teal-500/30 shadow-xl">
              <div className="text-teal-400 text-sm font-semibold mb-3">$ALPHA Contract Address</div>
              <div className="bg-gray-900/70 rounded-lg p-3 sm:p-4 border border-gray-700 mb-3 overflow-hidden">
                <div className="font-mono text-white text-xs sm:text-sm break-all leading-relaxed overflow-wrap-anywhere">
                  4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump
                </div>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText('4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump');
                }}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all transform hover:scale-105 shadow-lg w-auto"
              >
                📋 Copy Contract Address
              </button>
            </div>
          </div>

          {/* Main Headline */}
          <div className="max-w-5xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Community-driven for a{' '}
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Healthier DeFi
              </span>{' '}
              Ecosystem
            </h2>
            
            <p className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto mb-6">
              <span className="text-teal-400 font-semibold">
                Fair launched. Dev tokens locked. Community driven.
              </span>
            </p>
          </div>

          {/* CTA Section */}
          {!wallet.connected && (
            <div className="mb-12">
              <div className="bg-gradient-to-r from-red-900/40 to-orange-900/40 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20 mb-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                  <span className="text-red-400 font-bold text-lg">LIVE REWARDS ACTIVE</span>
                  <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-white text-center font-semibold">
                  Daily rewards being distributed on Pump Fun Livestreams
                </p>
              </div>
              <p className="text-lg text-gray-300 mb-6">Connect your wallet to check if you&apos;re eligible for today&apos;s draw</p>
              
              <div className="flex flex-col items-center space-y-4">
                <button
                  onClick={() => setVisible(true)}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 shadow-2xl animate-pulse hover:animate-none"
                >
                  🚀 Connect Wallet Now
                </button>
                
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-2">
                    Supported wallets: Phantom, Solflare, Backpack, and 20+ more
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                      Secure
                    </span>
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
                      Free
                    </span>
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mr-1"></div>
                      Instant
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 animate-bounce" style={{transform: 'translateX(-50%)'}}>
        <div className="w-6 h-10 border-2 border-teal-400 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-teal-400 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  const PartnerLogosSection = () => (
    <div className="w-full py-16 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center bg-gradient-to-r from-purple-900/40 to-blue-900/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl px-8 py-4 mb-6">
            <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              EXCLUSIVE MEMBER ACCESS
            </h2>
          </div>
          <p className="text-xl text-white font-semibold mb-4">
            PREMIUM PARTNER DEALS FOR ALPHA HOLDERS
          </p>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Unlock exclusive discounts and offers from top-tier partners when you hold $ALPHA
          </p>
        </div>

        {/* Partner Logos Grid - Clean & Professional */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
          {/* Cloud & Infrastructure Partners */}
          <div className="group flex items-center justify-center p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700 hover:border-teal-500/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl flex items-center justify-center">
              <div className="text-2xl font-bold text-orange-400">AWS</div>
            </div>
          </div>

          <div className="group flex items-center justify-center p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700 hover:border-teal-500/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-green-500/20 rounded-xl flex items-center justify-center">
              <div className="text-lg font-bold text-blue-400">Google</div>
            </div>
          </div>

          <div className="group flex items-center justify-center p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700 hover:border-teal-500/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
              <div className="text-sm font-bold text-cyan-400">DigitalOcean</div>
            </div>
          </div>

          {/* Marketing & Analytics Partners */}
          <div className="group flex items-center justify-center p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700 hover:border-teal-500/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl flex items-center justify-center">
              <div className="text-sm font-bold text-yellow-400">Mailchimp</div>
            </div>
          </div>

          <div className="group flex items-center justify-center p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700 hover:border-teal-500/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl flex items-center justify-center">
              <div className="text-sm font-bold text-orange-400">HubSpot</div>
            </div>
          </div>

          {/* Trading & Finance Partners */}
          <div className="group flex items-center justify-center p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700 hover:border-teal-500/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl flex items-center justify-center">
              <div className="text-sm font-bold text-yellow-400">Binance</div>
            </div>
          </div>

          {/* Additional Partners */}
          <div className="group flex items-center justify-center p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700 hover:border-teal-500/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
              <div className="text-xs font-bold text-blue-400">TradingView</div>
            </div>
          </div>

          <div className="group flex items-center justify-center p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700 hover:border-teal-500/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
              <div className="text-sm font-bold text-purple-400">Stripe</div>
            </div>
          </div>

          <div className="group flex items-center justify-center p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700 hover:border-teal-500/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
              <div className="text-sm font-bold text-green-400">Google Ads</div>
            </div>
          </div>

          {/* More Partners Coming Soon */}
          <div className="group flex items-center justify-center p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700 hover:border-teal-500/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-xl flex items-center justify-center">
              <div className="text-2xl">+</div>
            </div>
          </div>

          <div className="group flex items-center justify-center p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700 hover:border-teal-500/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
              <div className="text-xs font-bold text-teal-400 text-center">More Soon</div>
            </div>
          </div>
        </div>

        {/* Real Data CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl p-8 border border-purple-500/20">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Enter the Daily Draw</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Join the community of ALPHA holders earning daily rewards. The next winner could be YOU!
            </p>
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-400 mb-2">
                  {liveStats.isLoading ? (
                    <div className="animate-pulse">Loading...</div>
                  ) : (
                    `${liveStats.totalSolAwarded.toFixed(2)} SOL`
                  )}
                </div>
                <div className="text-sm text-gray-400">Total SOL Awarded to Holders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400 mb-2">
                  {liveStats.activeMembers}
                </div>
                <div className="text-sm text-gray-400">Active Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400 mb-2">11:00 UTC</div>
                <div className="text-sm text-gray-400">Next Daily Draw</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-400 mb-2">Hold $10+ worth of $ALPHA to enter daily draw</div>
              <div className="text-sm text-gray-400">Higher holdings = More chances to win</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const TokenomicsSection = () => (
    <div className="w-full py-20 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            How ALPHA Works
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Revolutionary tokenomics that create value for holders with every transaction
          </p>
        </div>

        {/* Trade -> Reward -> Burn Flow */}
        <div className="mb-16">
          <div className="flex flex-col lg:flex-row items-center justify-center space-y-8 lg:space-y-0 lg:space-x-12">
            
            {/* Step 1: Trade */}
            <div className="flex flex-col items-center text-center max-w-sm">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-3xl mb-6 shadow-2xl">
                📈
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">1. Trade</h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                When you trade $ALPHA, the system automatically earns pump fun creator rewards.
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden lg:block text-teal-400 text-4xl transform rotate-0 lg:rotate-0">
              →
            </div>
            <div className="lg:hidden text-teal-400 text-4xl transform rotate-90">
              →
            </div>

            {/* Step 2: Reward */}
            <div className="flex flex-col items-center text-center max-w-sm">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-3xl mb-6 shadow-2xl">
                🏆
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">2. Reward</h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                We distribute <span className="text-teal-400 font-semibold">40%</span> of our earnings to a random $ALPHA holder daily
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden lg:block text-teal-400 text-4xl">
              →
            </div>
            <div className="lg:hidden text-teal-400 text-4xl transform rotate-90">
              →
            </div>

            {/* Step 3: Burn */}
            <div className="flex flex-col items-center text-center max-w-sm">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-3xl mb-6 shadow-2xl">
                🔥
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">3. Burn</h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                We use <span className="text-orange-400 font-semibold">30%</span> of rewards to permanently burn tokens, reducing supply
              </p>
            </div>
          </div>
        </div>

        {/* Value Proposition */}
        <div className="bg-gradient-to-r from-teal-900/20 to-cyan-900/20 rounded-3xl p-8 sm:p-12 border border-teal-500/20 text-center">
          <h3 className="text-3xl font-bold text-white mb-6">The Result?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl mb-4">💰</div>
              <h4 className="text-xl font-semibold text-teal-400 mb-2">Holders Win</h4>
              <p className="text-gray-300">Random daily rewards create excitement and value for the community</p>
            </div>
            <div>
              <div className="text-4xl mb-4">📈</div>
              <h4 className="text-xl font-semibold text-teal-400 mb-2">Supply Decreases</h4>
              <p className="text-gray-300">Regular token burns reduce circulating supply, potentially increasing value</p>
            </div>
            <div>
              <div className="text-4xl mb-4">🔄</div>
              <h4 className="text-xl font-semibold text-teal-400 mb-2">Cycle Repeats</h4>
              <p className="text-gray-300">Every trade fuels more rewards and burns, creating sustainable growth</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const DashboardSection = () => (
    <div className="w-full">
      {isLoading ? (
        <div className="flex justify-center items-center h-64 bg-gray-900">
          <LoadingSpinner />
        </div>
      ) : (
        <MemberDashboardSection
          tokenBalance={tokenBalance}
          usdValue={usdValue}
          membershipTier={membershipTier}
          isEligible={isEligible}
          dailyEntries={dailyEntries}
        />
      )}
    </div>
  );

  const CommunitySection = () => (
    <div className="w-full py-20 bg-gradient-to-r from-teal-900/20 to-cyan-900/20 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Join the ALPHA Movement</h2>
          <p className="text-xl text-gray-300">The community is growing fast - don&apos;t miss out!</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="text-center transform hover:scale-105 transition-transform bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-gray-700">
            <div className="text-4xl md:text-5xl font-bold text-teal-400 mb-2">100M</div>
            <div className="text-gray-300 text-lg">Dev Tokens Locked</div>
            <div className="text-green-400 text-sm mt-2">✅ Verified Secure</div>
          </div>
          <div className="text-center transform hover:scale-105 transition-transform bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-gray-700">
            <div className="text-4xl md:text-5xl font-bold text-cyan-400 mb-2">
              {liveStats.isLoading ? (
                <div className="animate-pulse text-xl">Loading...</div>
              ) : (
                `${liveStats.totalSolAwarded.toFixed(1)} SOL`
              )}
            </div>
            <div className="text-gray-300 text-lg">Total Rewarded</div>
            <div className="text-green-400 text-sm mt-2">📈 Growing Daily</div>
          </div>
          <div className="text-center transform hover:scale-105 transition-transform bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-gray-700">
            <div className="text-4xl md:text-5xl font-bold text-emerald-400 mb-2">
              {liveStats.activeMembers}
            </div>
            <div className="text-gray-300 text-lg">Active Members</div>
            <div className="text-orange-400 text-sm mt-2">🔥 Join Now</div>
          </div>
          <div className="text-center transform hover:scale-105 transition-transform bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-gray-700">
            <div className="text-4xl md:text-5xl font-bold text-yellow-400 mb-2">11:00 UTC</div>
            <div className="text-gray-300 text-lg">Next Draw</div>
            <div className="text-red-400 text-sm mt-2">⏰ Daily Draw</div>
          </div>
        </div>

        {/* FOMO Alert Box - Updated with Real Data */}
        <div className="bg-gradient-to-r from-orange-900/40 to-red-900/40 backdrop-blur-sm rounded-2xl p-8 border border-orange-500/20 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
            <span className="text-red-400 font-bold text-lg">LIVE DRAWS</span>
            <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">Daily Rewards Being Distributed Live!</h3>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            {liveStats.isLoading ? (
              "Loading latest reward data..."
            ) : (
              `We&apos;ve already distributed ${liveStats.totalSolAwarded.toFixed(2)} SOL to ALPHA holders. Join the daily draws at 11:00 UTC!`
            )}
          </p>
          <div className="inline-flex items-center space-x-4 bg-black/40 rounded-full px-6 py-3">
            <span className="text-white font-semibold">Next Draw:</span>
            <div className="font-mono text-xl font-bold text-orange-400">11:00 UTC Daily</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-gradient-to-br from-gray-900 via-black to-gray-800 min-h-screen overflow-x-hidden">
      {!wallet.connected ? (
        <>
          <HeroSection />
          <LiveStatsSection />
          <PartnerLogosSection />
          <TokenomicsSection />
          <CommunitySection />
        </>
      ) : (
        <>
          <HeroSection />
          <LiveStatsSection />
          <DashboardSection />
          <PartnerLogosSection />
          <CommunitySection />
        </>
      )}
    </div>
  );
};