// src/components/PremiumSubscription.tsx - Fixed with proper wallet connection and Next.js Image
import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Image from 'next/image';
import { SolanaPayIntegration } from './SolanaPayIntegration';
import { useVipSubscriptionStore, VipTier } from '../stores/useVipSubscriptionStore';
import { MarketDataService } from '../utils/marketDataService';

interface TierInfo {
  name: VipTier;
  multiplier: number;
  baselineEntries: number;
  usdPrice: number;
  icon: string;
  color: string;
  features: string[];
  popular?: boolean;
  description: string;
}

export const PremiumSubscription: FC = () => {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { currentSubscription } = useVipSubscriptionStore();
  const [selectedTier, setSelectedTier] = useState<VipTier | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [priceData, setPriceData] = useState<{solPrice: number; alphaPrice: number} | null>(null);

  // Fetch real-time prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const marketService = MarketDataService.getInstance();
        const data = await marketService.getMarketData();
        setPriceData({
          solPrice: data.solPriceUSD,
          alphaPrice: data.tokenPriceUSD
        });
      } catch (error) {
        console.error('Price fetch error:', error);
        setPriceData({ solPrice: 200, alphaPrice: 0.00005 });
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const tiers: TierInfo[] = [
    {
      name: 'Silver',
      multiplier: 2,
      baselineEntries: 2,
      usdPrice: 7.99,
      icon: '🥈',
      color: 'from-gray-500 to-gray-400',
      features: ['2x daily chances', '+2 bonus entries/month', 'Partner deals', 'Cancel anytime'],
      description: 'Perfect for getting started'
    },
    {
      name: 'Gold',
      multiplier: 3,
      baselineEntries: 3,
      usdPrice: 17.99,
      icon: '🥇',
      color: 'from-yellow-500 to-orange-500',
      features: ['3x daily chances', '+3 bonus entries/month', 'Gold events', 'Premium support'],
      popular: true,
      description: 'Most popular choice'
    },
    {
      name: 'Platinum',
      multiplier: 5,
      baselineEntries: 5,
      usdPrice: 27.99,
      icon: '💎',
      color: 'from-purple-500 to-blue-500',
      features: ['5x daily chances', '+5 bonus entries/month', 'VIP-only draws', 'White-glove support'],
      description: 'Ultimate VIP experience'
    }
  ];

  const calculateDynamicPrice = (usdPrice: number) => {
    if (!priceData) return { sol: '...', alpha: '...' };
    
    return {
      sol: (usdPrice / priceData.solPrice).toFixed(3),
      alpha: Math.floor(usdPrice / priceData.alphaPrice).toLocaleString()
    };
  };

  const handleSubscribe = (tierName: VipTier) => {
    if (!connected) {
      setVisible(true); // Properly trigger wallet modal
      return;
    }
    setSelectedTier(tierName);
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setSelectedTier(null);
    window.location.reload();
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setSelectedTier(null);
  };

  // Show payment modal
  if (showPayment && selectedTier) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/20">
          <SolanaPayIntegration
            tier={selectedTier}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Current VIP Status */}
      {currentSubscription?.isActive && (
        <div className="bg-green-900/30 border border-green-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">✅</div>
          <h3 className="text-lg font-bold text-white mb-1">
            {currentSubscription.tier} VIP Active
          </h3>
          <p className="text-green-400 text-sm">
            {currentSubscription.multiplier}x multiplier until {currentSubscription.expiresAt?.toLocaleDateString()}
          </p>
        </div>
      )}

      {/* VIP Tier Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map((tier, index) => {
          const prices = calculateDynamicPrice(tier.usdPrice);
          const isActive = currentSubscription?.tier === tier.name;
          
          return (
            <div key={tier.name} className="relative">
              
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-1 rounded-full text-sm font-bold">
                    MOST POPULAR
                  </div>
                </div>
              )}

              <div className={`bg-gradient-to-br ${tier.color} p-1 rounded-2xl ${tier.popular ? 'scale-105' : ''} transition-transform hover:scale-105`}>
                <div className="bg-black/90 rounded-2xl p-6 h-full flex flex-col">
                  
                  {/* Tier Header */}
                  <div className="text-center mb-4">
                    <div className="text-3xl mb-2">{tier.icon}</div>
                    <h3 className="text-lg font-bold text-white mb-1">{tier.name} VIP</h3>
                    
                    {/* Main Multiplier Display */}
                    <div className="bg-white/10 rounded-lg p-3 mb-3">
                      <div className="text-2xl font-bold text-yellow-400">
                        {tier.multiplier}x
                      </div>
                      <div className="text-xs text-gray-300">Daily Chances</div>
                    </div>
                    
                    {/* Dynamic Pricing */}
                    <div className="space-y-1">
                      <div className="text-xl font-bold text-white">
                        ${tier.usdPrice}
                        <span className="text-sm text-gray-400">/month</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {prices.sol} SOL • {prices.alpha} ALPHA
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-1 mb-4 flex-1">
                    {tier.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-gray-300 text-xs">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Solana Pay Button */}
                  <button
                    onClick={() => handleSubscribe(tier.name)}
                    disabled={isActive}
                    className={`w-full py-2 rounded-lg font-semibold text-sm transition-all transform hover:scale-105 flex items-center justify-center space-x-2 ${
                      isActive
                        ? 'bg-green-600 text-white cursor-default'
                        : !connected
                        ? 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white cursor-pointer'
                        : 'bg-black text-white hover:bg-gray-900'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <span>✅</span>
                        <span>Active</span>
                      </>
                    ) : !connected ? (
                      <>
                        <span>🔗</span>
                        <span>Connect Wallet</span>
                      </>
                    ) : (
                      <>
                        <span>Continue with</span>
                        <Image 
                          src="/solana-pay-white.png" 
                          alt="Solana Pay" 
                          width={64}
                          height={16}
                          className="h-4 w-auto ml-1" 
                        />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Info - Compact */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 text-center">
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center justify-center space-x-1">
            <Image 
              src="/solana-pay-white.png" 
              alt="Solana Pay" 
              width={48}
              height={12}
              className="h-3 w-auto" 
            />
            <span className="text-gray-300">Secure</span>
          </div>
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-gray-300">Cancel Anytime</span>
          </div>
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span className="text-gray-300">No Credit Cards</span>
          </div>
        </div>
        
        {!connected && (
          <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400 text-xs">
              💡 Connect wallet above to activate VIP
            </p>
          </div>
        )}
      </div>

      {/* Price Update Info */}
      {priceData && (
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Live pricing • SOL: ${priceData.solPrice.toFixed(2)} • ALPHA: ${priceData.alphaPrice.toFixed(8)}
          </p>
        </div>
      )}
    </div>
  );
};