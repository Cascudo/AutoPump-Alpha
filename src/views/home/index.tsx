// src/views/home/index.tsx - CLEAN MODERN HERO VERSION
import { FC, useEffect, useState, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/router';
import { PublicKey } from '@solana/web3.js';
import { StatsOverview } from '../../components/StatsOverview';
import { useAlphaTokenStore } from '../../stores/useAlphaTokenStore';
import { useMembershipStore } from '../../stores/useMembershipStore';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { LiveStatsSection } from '../../components/LiveStatsSection';
import { VipUpgradeFlow } from '../../components/VipUpgradeFlow';
import { PromotionalGiveaway } from '../../utils/supabaseClient';
import { googleSheetsService } from '../../utils/googleSheetsService';
import { MarketDataService } from '../../utils/marketDataService';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';

const ALPHA_CONTRACT_ADDRESS = '4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump';

// VIP Plans - PRESERVED FROM WORKING VERSION
interface VipPlan {
  tier: 'Silver' | 'Gold' | 'Platinum';
  monthlyPrice: number;
  multiplier: number;
  baselineEntries: number;
  features: string[];
  popular?: boolean;
  savings?: string;
  icon: string;
  color: string;
}

const vipPlans: VipPlan[] = [
  {
    tier: 'Silver',
    monthlyPrice: 9.99,
    multiplier: 2,
    baselineEntries: 2,
    features: [
      '2x Entry Multiplier',
      '2 Baseline Entries/Month',
      'Basic VIP Benefits',
      'Community Badge',
      'Priority Support'
    ],
    icon: '🥈',
    color: 'from-gray-500 to-gray-700'
  },
  {
    tier: 'Gold',
    monthlyPrice: 19.99,
    multiplier: 3,
    baselineEntries: 3,
    features: [
      '3x Entry Multiplier',
      '3 Baseline Entries/Month',
      'Premium VIP Benefits',
      'Exclusive Gold Events',
      'Advanced Analytics',
      'Priority Support'
    ],
    popular: true,
    savings: 'Most Popular',
    icon: '🥇',
    color: 'from-yellow-500 to-yellow-700'
  },
  {
    tier: 'Platinum',
    monthlyPrice: 29.99,
    multiplier: 5,
    baselineEntries: 5,
    features: [
      '5x Entry Multiplier',
      '5 Baseline Entries/Month',
      'All Premium Benefits',
      'Early Access Features',
      'Exclusive Partner Deals',
      'Personal Account Manager'
    ],
    savings: 'Best Value',
    icon: '💎',
    color: 'from-purple-500 to-purple-700'
  }
];

export const AlphaHomeView: FC = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showVipFlow, setShowVipFlow] = useState(false);
  const [copiedCA, setCopiedCA] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [activeGiveaway, setActiveGiveaway] = useState<PromotionalGiveaway | null>(null);
  const [giveawayLoading, setGiveawayLoading] = useState(true);
  const [priceData, setPriceData] = useState<{ solPrice: number; alphaPrice: number } | null>(null);

  // ANIMATED WORDS - Same pattern as LoadingSpinner
  const [currentWord, setCurrentWord] = useState(0);
  const words = useMemo(() => ['REWARD', 'BURN', 'REPEAT'], []);

useEffect(() => {
  const interval = setInterval(() => {
    setCurrentWord((prev) => (prev + 1) % words.length);
  }, 1200);

  return () => clearInterval(interval);
}, [words]);

  // --- FIX: Properly include words as dependency (not words.length) ---
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 1200);

    return () => clearInterval(interval);
  }, [words]); // <-- fix here

  const {
    tokenBalance,
    usdValue,
    getAlphaTokenBalance
  } = useAlphaTokenStore();

  const {
    membershipDisplayTier,
    vipTier,
    isEligible,
    tokenEntries,
    vipBaselineEntries,
    vipMultiplier,
    totalDailyEntries,
    vipActive,
    isLoading: membershipLoading,
    getMembershipStatus
  } = useMembershipStore();

  // --- FIX: Memoize handleWalletConnected to avoid re-declare & unwanted reruns ---
  const hasConnectedRef = useRef(false);
  const handleWalletConnected = useCallback(async () => {
    if (!wallet.publicKey || isLoading || hasConnectedRef.current) return;
    hasConnectedRef.current = true;
    setIsLoading(true);
    try {
      await Promise.all([
        getMembershipStatus(wallet.publicKey, connection),
        getAlphaTokenBalance(wallet.publicKey, connection)
      ]);

      setRedirecting(true);
      setTimeout(() => {
        setRedirecting(false);
      }, 5000);

    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [wallet.publicKey, isLoading, getMembershipStatus, getAlphaTokenBalance, connection]);

  // --- FIX: Remove isLoading from effect deps, add handleWalletConnected ---
  useEffect(() => {
    if (wallet.publicKey && wallet.connected) {
      handleWalletConnected();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.publicKey, wallet.connected, handleWalletConnected]);

  useEffect(() => {
    hasConnectedRef.current = false;
  }, [wallet.publicKey]);

  // Fetch price data - PRESERVED
  useEffect(() => {
    const fetchPriceData = async () => {
      try {
        const marketService = MarketDataService.getInstance();
        const data = await marketService.getMarketData();
        setPriceData({
          solPrice: data.solPriceUSD,
          alphaPrice: data.tokenPriceUSD
        });
      } catch (error) {
        console.error('Error fetching price data:', error);
      }
    };
    fetchPriceData();
  }, []);

  // Fetch single active giveaway - PRESERVED
  useEffect(() => {
    fetchActiveGiveaway();
  }, []);

  const fetchActiveGiveaway = async () => {
    try {
      setGiveawayLoading(true);
      const response = await fetch('/api/promotional-giveaways');

      if (response.ok) {
        const data = await response.json();
        const giveaways = Array.isArray(data) ? data : (data.giveaways || []);
        const active = giveaways.find((g: PromotionalGiveaway) => g.status === 'active');
        setActiveGiveaway(active || null);
      }
    } catch (error) {
      console.error('Error fetching giveaway:', error);
    } finally {
      setGiveawayLoading(false);
    }
  };

  const handleConnectWallet = () => {
    if (wallet.connected) {
      router.push('/dashboard');
    } else {
      setVisible(true);
    }
  };

  const handleCopyCA = async () => {
    try {
      await navigator.clipboard.writeText(ALPHA_CONTRACT_ADDRESS);
      setCopiedCA(true);
      setTimeout(() => setCopiedCA(false), 2000);
    } catch (err) {
      console.error('Failed to copy contract address:', err);
    }
  };

  const calculateDynamicPrice = (usdPrice: number) => {
    if (!priceData) return { sol: '...', alpha: '...' };

    return {
      sol: (usdPrice / priceData.solPrice).toFixed(3),
      alpha: Math.floor(usdPrice / priceData.alphaPrice).toLocaleString()
    };
  };

  const handleVipSelect = (tier: 'Silver' | 'Gold' | 'Platinum') => {
    setShowVipFlow(true);
  };

  // Show loading screen during wallet data loading - PRESERVED
  if (wallet.connected && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <div className="text-center">
          <div className="mb-8">
            <LoadingSpinner />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Welcome to ALPHA Club! 🎉
          </h2>
          <p className="text-xl text-gray-300 mb-6">
            Loading your account data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      
      {/* Redirect Notification - PRESERVED */}
      {redirecting && wallet.connected && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 rounded-xl border border-teal-500/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold mb-1">
                ✅ {vipTier && vipTier !== 'None' ? `Welcome Back, ${vipTier} VIP!` : 'Welcome Back!'}
              </div>
              <div className="text-sm">
                {vipTier && vipTier !== 'None' 
                  ? `${vipMultiplier}x multiplier active • Visit dashboard for details`
                  : 'Visit your dashboard for member features'
                }
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <Link
                href="/dashboard"
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-sm font-bold transition-all"
              >
                Dashboard
              </Link>
              <button
                onClick={() => setRedirecting(false)}
                className="text-white/70 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* CLEAN MODERN HERO SECTION - COMPACT */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-teal-900/20 py-12 lg:py-16">
        
        {/* Background Effects - SUBTLE */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            
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

            {/* CLEAN TAGLINE */}
            <div className="mb-8">
              <p className="text-xl lg:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                <strong className="text-white">$ALPHA works 24/7:</strong> Automatic entries from holdings, 
                deflationary token burns, and <strong className="text-yellow-400">premium rewards that scale</strong>.
              </p>
            </div>

            {/* Clean CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button
                onClick={handleConnectWallet}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xl py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                {wallet.connected ? '📊 View Dashboard' : '🚀 Connect Wallet'}
              </button>
              
              {activeGiveaway && (
                <button
                  onClick={() => router.push(`/giveaway/${activeGiveaway.id}`)}
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold text-xl py-4 px-8 rounded-xl transition-all duration-300 border-2 border-yellow-400/50"
                >
                  🎯 Live Giveaway
                </button>
              )}
              
              <button
                onClick={() => setShowVipFlow(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xl py-4 px-8 rounded-xl transition-all duration-300 border-2 border-purple-400/50"
              >
                ⭐ VIP Club
              </button>
            </div>
            {/* Premium Web3 Badge */}
            <div className="inline-flex items-center bg-gradient-to-r from-yellow-600/20 to-yellow-400/20 border border-yellow-400/40 rounded-full px-6 py-2 mb-8 backdrop-blur-sm">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse mr-3"></div>
              <span className="text-yellow-300 font-semibold text-sm tracking-wide uppercase">
                Rewards Club • Powered by Solana & Pumpfun Creator Rewards
              </span>
            </div>

            {/* Contract Address & Social Links - BIGGER & SAME LINE */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 mt-8">
              
              {/* Contract Address - BIGGER */}
              <div className="flex items-center bg-black/60 backdrop-blur-sm rounded-xl px-6 py-4 border border-gray-700/50">
                <div className="text-teal-400 text-lg font-semibold mr-4">$ALPHA CA:</div>
                <code className="text-gray-300 text-lg font-mono mr-4">
                  4eyM1...pump
                </code>
                <button
                  onClick={handleCopyCA}
                  className="bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 px-4 py-2 rounded text-lg font-bold transition-all"
                >
                  {copiedCA ? '✅' : '📋'}
                </button>
              </div>

              {/* Social Links - BIGGER */}
              <div className="flex items-center gap-6">
                <span className="text-gray-400 text-lg font-semibold">Follow Us:</span>
                <div className="flex items-center gap-4">
                  {[
                    { href: 'https://pump.fun/coin/4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump', src: '/pumpfun.png', alt: 'Pump.fun' },
                    { href: 'https://x.com/AutopumpAlpha', src: '/x.png', alt: 'X (Twitter)' },
                    { href: 'https://t.me/cascudox', src: '/telegram_logo.svg', alt: 'Telegram' },
                    { href: 'https://dexscreener.com/solana/4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump', src: '/dexs-b.png', alt: 'DexScreener' },
                  ].map(({ href, src, alt }, index) => (
                    <a
                      key={index}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-14 h-14 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-full border border-teal-500/20 hover:border-teal-400/50 transition-all duration-300 hover:bg-black/50 hover:scale-110"
                      aria-label={alt}
                    >
                      <Image
                        src={src}
                        alt={alt}
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    </a>
                  ))}
                  </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ENHANCED CURRENT GIVEAWAY SECTION */}
      {!giveawayLoading && activeGiveaway && (
        <section className="py-20 bg-gradient-to-br from-black via-purple-900/10 to-black">
          <div className="max-w-6xl mx-auto px-4">
            
            <div className="text-center mb-12">
              <div className="inline-flex items-center bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-500/40 rounded-full px-6 py-3 mb-6">
                <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse mr-3"></div>
                <span className="text-red-400 font-bold text-sm tracking-wide uppercase">
                  🔥 Live Premium Giveaway
                </span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">
                Current Premium Giveaway
              </h2>
              <p className="text-xl text-gray-300">
                Exclusive high-value prizes for ALPHA holders. Automatic entries from holdings, VIP multipliers for maximum winning potential.
              </p>
            </div>

            <SingleGiveawayCard 
              giveaway={activeGiveaway}
              onConnectWallet={handleConnectWallet}
              onUpgradeVip={() => setShowVipFlow(true)}
            />
          </div>
        </section>
      )}

      {/* VIP BENEFITS SECTION */}
      <section className="py-20 bg-gradient-to-br from-gray-900 via-black to-purple-900/20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/40 rounded-full px-6 py-3 mb-6">
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse mr-3"></div>
              <span className="text-purple-400 font-bold text-sm tracking-wide uppercase">
                👑 VIP Membership Benefits
              </span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              Multiply Your Winning Chances
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              <strong className="text-white">Same automatic entries</strong> from your $ALPHA holdings, 
              but <strong className="text-purple-400">VIP multiplies everything</strong> by 2x-5x. 
              Plus exclusive partner discounts and priority support.
            </p>
          </div>

          {/* Enhanced VIP Tiers Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {vipPlans.map((plan) => {
              const dynamicPrice = calculateDynamicPrice(plan.monthlyPrice);
              
              return (
                <div 
                  key={plan.tier}
                  className={`relative bg-gradient-to-br from-black/60 to-gray-900/20 backdrop-blur-xl rounded-3xl p-8 border border-gray-600/30 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 cursor-pointer ${
                    plan.popular ? 'ring-2 ring-yellow-400/50 scale-105' : ''
                  }`}
                  onClick={() => handleVipSelect(plan.tier)}
                >
                  
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-sm px-4 py-2 rounded-full">
                        ⭐ MOST POPULAR
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className="text-5xl mb-4">{plan.icon}</div>
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.tier} VIP</h3>
                    <div className="text-3xl font-black text-white mb-1">${plan.monthlyPrice}/mo</div>
                    <div className={`text-2xl font-bold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent mb-4`}>
                      {plan.multiplier}x MULTIPLIER
                    </div>
                    
                    {/* Clear Example */}
                    <div className="bg-black/60 rounded-xl p-4 mb-6 border border-gray-600/30">
                      <div className="text-sm text-gray-400 mb-1">Example:</div>
                      <div className="text-green-400 font-bold text-sm">
                        $100 ALPHA = {plan.multiplier * 10} entries (instead of 10)
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center space-x-3">
                        <div className="text-green-400 text-lg">✅</div>
                        <span className="text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVipSelect(plan.tier);
                    }}
                    className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-bold py-4 rounded-xl transition-all ${plan.popular ? 'transform hover:scale-105 shadow-lg' : ''}`}
                  >
                    Choose {plan.tier} VIP
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* LIVE STATS SECTION - MOVED BELOW THE FOLD */}
      <section className="py-20 bg-gradient-to-br from-black via-teal-900/10 to-black">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              📊 Live Platform Statistics
            </h2>
            <p className="text-gray-400">
              Real-time transparency. Every transaction tracked on-chain.
            </p>
          </div>
          <LiveStatsSection />
        </div>
      </section>

      {/* VIP Upgrade Flow Modal */}
      {showVipFlow && (
        <VipUpgradeFlow 
          onClose={() => setShowVipFlow(false)}
        />
      )}
    </div>
  );
};

// Single Giveaway Card Component - PRESERVED WITH ROBUST ERROR HANDLING
interface SingleGiveawayCardProps {
  giveaway: PromotionalGiveaway;
  onConnectWallet: () => void;
  onUpgradeVip: () => void;
}

const SingleGiveawayCard: FC<SingleGiveawayCardProps> = ({ 
  giveaway, 
  onConnectWallet, 
  onUpgradeVip 
}) => {
  const { connected } = useWallet();
  const router = useRouter();
  
  // Get hero image from database or use fallback based on title - PRESERVED
  const getHeroImage = () => {
    if (giveaway.prize_image_url) {
      return giveaway.prize_image_url;
    }
    
    const title = giveaway.title.toLowerCase();
    if (title.includes('ps5') || title.includes('playstation')) {
      return '/hero-ps5.jpg';
    }
    if (title.includes('macbook') || title.includes('mac')) {
      return '/hero-macbook.jpg';
    }
    if (title.includes('iphone')) {
      return '/hero-iphone.jpg';
    }
    
    return null;
  };

  const heroImage = getHeroImage();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-gray-900/80 to-purple-900/20 backdrop-blur-xl rounded-3xl border border-purple-500/30 shadow-2xl">
      
      {/* Live Status Banner */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-red-600 to-pink-600 text-center py-2 z-10">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <span className="font-bold text-sm text-white">
            🔥 LIVE DRAW • {giveaway.total_entries || 0} ENTRIES • ENDING SOON
          </span>
        </div>
      </div>

      <div className="pt-12 p-8">
        {/* ONE COLUMN DESIGN */}
        <div className="max-w-4xl mx-auto">
          
          {/* MUCH BIGGER HERO IMAGE - CLICKABLE */}
          <div className="text-center mb-8">
            <div 
              className="mb-6 cursor-pointer group"
              onClick={() => {
                if (connected) {
                  // If wallet connected, go directly to giveaway page (they can see buy packages there)
                  router.push(`/giveaway/${giveaway.id}`);
                } else {
                  // If not connected, go to giveaway page where they can connect
                  router.push(`/giveaway/${giveaway.id}`);
                }
              }}
            >
              {getHeroImage() ? (
                <div className="relative w-full max-w-2xl h-96 lg:h-[500px] mx-auto group-hover:scale-105 transition-transform duration-300">
                  <Image
                    src={getHeroImage()!}
                    alt={giveaway.title}
                    fill
                    className="object-contain drop-shadow-2xl rounded-2xl"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.dataset.fallbackAttempted) {
                        target.dataset.fallbackAttempted = 'true';
                        const title = giveaway.title.toLowerCase();
                        if (title.includes('ps5') || title.includes('playstation')) {
                          target.src = 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600&h=600&fit=crop&crop=center';
                        } else if (title.includes('macbook') || title.includes('mac')) {
                          target.src = 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&h=600&fit=crop&crop=center';
                        } else {
                          target.style.display = 'none';
                          const fallbackDiv = target.nextElementSibling as HTMLElement;
                          if (fallbackDiv) {
                            fallbackDiv.classList.remove('hidden');
                          }
                        }
                      }
                    }}
                  />
                  <div className="hidden w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-8xl mb-6">🎮</div>
                      <div className="text-3xl font-bold">{giveaway.title}</div>
                    </div>
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl flex items-center justify-center">
                    <div className="text-white font-bold text-xl">
                      Click to Enter Giveaway
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-2xl h-96 lg:h-[500px] mx-auto bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 relative">
                  <div className="text-center text-white">
                    <div className="text-8xl mb-6">🎮</div>
                    <div className="text-3xl font-bold">{giveaway.title}</div>
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl flex items-center justify-center">
                    <div className="text-white font-bold text-xl">
                      Click to Enter Giveaway
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Choose Prize or CASH - From DB */}
            <h3 className="text-4xl lg:text-5xl font-bold text-white mb-4">Choose Prize or CASH</h3>
            
            {/* Prize Value - From DB - CLICKABLE */}
            <div 
              className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-2xl p-8 mb-8 border border-yellow-400/50 inline-block cursor-pointer hover:scale-105 transition-transform duration-300 group"
              onClick={() => {
                if (connected) {
                  // If wallet connected, go directly to giveaway page
                  router.push(`/giveaway/${giveaway.id}`);
                } else {
                  // If not connected, go to giveaway page where they can connect
                  router.push(`/giveaway/${giveaway.id}`);
                }
              }}
            >
              <div className="text-5xl lg:text-6xl font-black text-white mb-2">
                ${giveaway.prize_value?.toLocaleString()}
              </div>
              <div className="text-yellow-100 font-semibold tracking-wide text-xl mb-2">
                TOTAL PRIZE VALUE
              </div>
              <div className="text-yellow-200 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Click to {connected ? 'buy entries' : 'connect & enter'}
              </div>
            </div>
            
            <p className="text-gray-300 text-xl mb-8 max-w-2xl mx-auto">{giveaway.prize_description}</p>
          </div>

          {/* Entry Info Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-teal-500/30 text-center">
              <div className="text-3xl mb-3">💎</div>
              <div className="text-teal-400 font-bold text-lg mb-2">Hold $ALPHA</div>
              <div className="text-gray-300">1 entry per $10 held</div>
            </div>
            
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30 text-center">
              <div className="text-3xl mb-3">👑</div>
              <div className="text-purple-400 font-bold text-lg mb-2">Get VIP</div>
              <div className="text-gray-300">Up to 5x multiplier</div>
            </div>
            
            <div 
              className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-yellow-500/30 text-center cursor-pointer hover:bg-yellow-900/20 transition-all"
              onClick={() => router.push(`/giveaway/${giveaway.id}`)}
            >
              <div className="text-3xl mb-3">🚀</div>
              <div className="text-yellow-400 font-bold text-lg mb-2">Buy Extra Entries</div>
              <div className="text-gray-300">Boost your winning chances</div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={() => {
                if (connected) {
                  router.push(`/giveaway/${giveaway.id}`);
                } else {
                  onConnectWallet();
                }
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xl py-6 px-12 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl border-2 border-purple-400/50"
            >
              {!connected 
                ? '🚀 Connect Wallet to Enter' 
                : '🎯 View My Entries & Buy More'
              }
            </button>
            
            <button
              onClick={onUpgradeVip}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold text-xl py-6 px-12 rounded-2xl transition-all border-2 border-yellow-400/50"
            >
              👑 Upgrade VIP for 5x
            </button>
          </div>

          {/* Countdown Timer - FIXED DATE FIELD */}
          <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-red-500/30 text-center">
            <h4 className="text-lg font-bold text-red-400 mb-3">⏰ Draw Ending</h4>
            <div className="text-xl font-mono text-white">
              {giveaway.entry_end_date ? (
                <>
                  {new Date(giveaway.entry_end_date).toLocaleDateString()} at {new Date(giveaway.entry_end_date).toLocaleTimeString()}
                </>
              ) : (
                'Date TBA'
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};