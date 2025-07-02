// src/components/VipUpgradeFlow.tsx - Enhanced with dynamic pricing from marketDataService
import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMembershipStore } from '../stores/useMembershipStore';
import { MarketDataService } from '../utils/marketDataService';
import { SolanaPayIntegration } from './SolanaPayIntegration';

interface VipUpgradeFlowProps {
  onClose: () => void;
  initialStep?: 'selection' | 'payment' | 'success';
}

type VipTier = 'Silver' | 'Gold' | 'Platinum';
type PaymentCurrency = 'SOL' | 'USDC' | 'ALPHA';

interface VipPlan {
  tier: VipTier;
  monthlyPrice: number;
  multiplier: number;
  baselineEntries: number;
  features: string[];
  popular?: boolean;
  savings?: string;
}

interface DynamicPricing {
  solPrice: number;
  alphaPrice: number;
  lastUpdated: number;
}

const vipPlans: VipPlan[] = [
  {
    tier: 'Silver',
    monthlyPrice: 7.99,
    multiplier: 2,
    baselineEntries: 2,
    features: [
      '2x Entry Multiplier',
      '2 Baseline Entries/Month',
      'Basic VIP Benefits',
      'Community Badge',
      'Priority Support'
    ]
  },
  {
    tier: 'Gold',
    monthlyPrice: 17.99,
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
    savings: 'Most Popular'
  },
  {
    tier: 'Platinum',
    monthlyPrice: 27.99,
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
    savings: 'Best Value'
  }
];

export const VipUpgradeFlow: FC<VipUpgradeFlowProps> = ({ 
  onClose, 
  initialStep = 'selection' 
}) => {
  const { publicKey } = useWallet();
  const { tokenEntries, totalDailyEntries } = useMembershipStore();
  
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [selectedPlan, setSelectedPlan] = useState<VipPlan | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<1 | 3 | 6 | 12>(1);
  const [selectedCurrency, setSelectedCurrency] = useState<PaymentCurrency>('SOL');
  const [processing, setProcessing] = useState(false);
  
  // Dynamic pricing state
  const [dynamicPricing, setDynamicPricing] = useState<DynamicPricing | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState<string | null>(null);

  // Fetch dynamic pricing data
  useEffect(() => {
    const fetchDynamicPricing = async () => {
      try {
        setPricingLoading(true);
        setPricingError(null);
        
        console.log('🔄 Fetching dynamic pricing for VIP upgrade flow...');
        const marketService = MarketDataService.getInstance();
        const marketData = await marketService.getMarketData();
        
        const pricing: DynamicPricing = {
          solPrice: marketData.solPriceUSD,
          alphaPrice: marketData.tokenPriceUSD,
          lastUpdated: Date.now()
        };
        
        console.log('✅ Dynamic pricing loaded:', {
          SOL: `$${pricing.solPrice.toFixed(2)}`,
          ALPHA: `$${pricing.alphaPrice.toFixed(6)}`,
        });
        
        setDynamicPricing(pricing);
      } catch (error) {
        console.error('❌ Failed to fetch dynamic pricing:', error);
        setPricingError('Failed to load current prices');
        
        // Fallback to reasonable default prices
        setDynamicPricing({
          solPrice: 160,
          alphaPrice: 0.000015,
          lastUpdated: Date.now()
        });
      } finally {
        setPricingLoading(false);
      }
    };

    fetchDynamicPricing();
    
    // Refresh pricing every 30 seconds
    const interval = setInterval(fetchDynamicPricing, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate potential entries increase
  const calculatePotentialEntries = (plan: VipPlan) => {
    const currentEntries = totalDailyEntries;
    const newEntries = (tokenEntries + plan.baselineEntries) * plan.multiplier;
    const increase = newEntries - currentEntries;
    const increasePercent = currentEntries > 0 ? 
      Math.round((increase / currentEntries) * 100) : 0;
    return { newEntries, increase, increasePercent };
  };

  // Calculate pricing with discounts
  const calculatePrice = (plan: VipPlan, duration: number) => {
    const basePrice = plan.monthlyPrice * duration;
    const discounts = { 1: 0, 3: 0.05, 6: 0.10, 12: 0.20 };
    const discount = discounts[duration] || 0;
    const finalPrice = basePrice * (1 - discount);
    return { basePrice, finalPrice, discount, savings: basePrice - finalPrice };
  };

  // Calculate currency-specific pricing
  const calculateCurrencyPrice = (usdPrice: number, currency: PaymentCurrency) => {
    if (!dynamicPricing) return { amount: 0, formatted: 'Loading...' };

    let amount: number;
    let symbol: string;
    let decimals: number;

    switch (currency) {
      case 'SOL':
        amount = usdPrice / dynamicPricing.solPrice;
        symbol = 'SOL';
        decimals = 3;
        break;
      case 'USDC':
        amount = usdPrice;
        symbol = 'USDC';
        decimals = 2;
        break;
      case 'ALPHA':
        amount = usdPrice / dynamicPricing.alphaPrice;
        symbol = 'ALPHA';
        decimals = 0;
        break;
      default:
        amount = usdPrice;
        symbol = 'USD';
        decimals = 2;
    }

    return {
      amount,
      formatted: `${amount.toLocaleString(undefined, { 
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals 
      })} ${symbol}`
    };
  };

  const handlePlanSelect = (plan: VipPlan) => {
    setSelectedPlan(plan);
    setCurrentStep('payment');
  };

  const handlePaymentSuccess = () => {
    setCurrentStep('success');
  };

  const handlePaymentCancel = () => {
    setCurrentStep('selection');
    setSelectedPlan(null);
  };

  // Loading state
  if (pricingLoading) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 border border-gray-700">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <div className="text-white font-semibold">Loading VIP Plans...</div>
            <div className="text-gray-400 text-sm">Fetching current market prices</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-900/90 to-pink-900/90 backdrop-blur-md p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                {currentStep === 'selection' && '👑 Upgrade to VIP'}
                {currentStep === 'payment' && '💳 Complete Your Order'}
                {currentStep === 'success' && '🎉 Welcome to VIP!'}
              </h2>
              <p className="text-purple-200 mt-2">
                {currentStep === 'selection' && 'Choose your VIP tier and multiply your rewards'}
                {currentStep === 'payment' && 'Secure payment via Solana Pay'}
                {currentStep === 'success' && 'Your VIP membership is now active!'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Real-time pricing indicator */}
          {dynamicPricing && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4 text-purple-200">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Live Pricing</span>
                </div>
                <div>SOL: ${dynamicPricing.solPrice.toFixed(2)}</div>
                <div>ALPHA: ${dynamicPricing.alphaPrice.toFixed(6)}</div>
              </div>
              <div className="text-xs text-purple-300">
                Updated: {new Date(dynamicPricing.lastUpdated).toLocaleTimeString()}
              </div>
            </div>
          )}

          {pricingError && (
            <div className="mt-2 text-yellow-400 text-sm">
              ⚠️ {pricingError} - Using fallback prices
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 'selection' && (
            <div className="space-y-8">
              {/* Plan Selection */}
              <div className="grid gap-6 md:grid-cols-3">
                {vipPlans.map((plan) => {
                  const potential = calculatePotentialEntries(plan);
                  
                  return (
                    <div
                      key={plan.tier}
                      className={`relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border-2 transition-all hover:scale-105 cursor-pointer ${
                        plan.popular 
                          ? 'border-purple-500 shadow-lg shadow-purple-500/20' 
                          : 'border-gray-700 hover:border-purple-500/50'
                      }`}
                      onClick={() => handlePlanSelect(plan)}
                    >
                      {/* Popular Badge */}
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                            Most Popular
                          </span>
                        </div>
                      )}

                      {/* Savings Badge */}
                      {plan.savings && !plan.popular && (
                        <div className="absolute -top-3 right-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            plan.savings === 'Best Value' 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                              : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                          }`}>
                            {plan.savings}
                          </span>
                        </div>
                      )}

                      {/* Plan Header */}
                      <div className="text-center mb-6">
                        <div className="text-3xl mb-2">
                          {plan.tier === 'Silver' && '🥈'}
                          {plan.tier === 'Gold' && '🥇'}
                          {plan.tier === 'Platinum' && '💎'}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{plan.tier} VIP</h3>
                        <div className="text-3xl font-bold text-purple-400">
                          ${plan.monthlyPrice}
                          <span className="text-lg text-gray-400">/month</span>
                        </div>
                      </div>

                      {/* Potential Increase */}
                      <div className="bg-black/40 rounded-xl p-4 mb-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-400 mb-1">Your New Entries</div>
                          <div className="text-2xl font-bold text-green-400 mb-1">
                            {potential.newEntries}
                          </div>
                          <div className="text-sm text-green-300">
                            +{potential.increase} entries (+{potential.increasePercent}%)
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Pricing Display */}
                      {dynamicPricing && (
                        <div className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 rounded-xl p-3 mb-4">
                          <div className="text-xs text-gray-400 mb-2">Payment Options:</div>
                          <div className="grid grid-cols-1 gap-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-300">SOL:</span>
                              <span className="text-white font-mono">
                                {calculateCurrencyPrice(plan.monthlyPrice, 'SOL').formatted}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">USDC:</span>
                              <span className="text-white font-mono">
                                {calculateCurrencyPrice(plan.monthlyPrice, 'USDC').formatted}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">ALPHA:</span>
                              <span className="text-white font-mono text-xs">
                                {calculateCurrencyPrice(plan.monthlyPrice, 'ALPHA').formatted}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Features */}
                      <div className="space-y-2 mb-6">
                        {plan.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-300">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA Button */}
                      <button className={`w-full py-3 rounded-xl font-bold transition-all ${
                        plan.popular
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                          : 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white'
                      }`}>
                        Choose {plan.tier}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 'payment' && selectedPlan && (
            <SolanaPayIntegration
              tier={selectedPlan.tier}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          )}

          {currentStep === 'success' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-6">🎉</div>
              <h3 className="text-3xl font-bold text-white mb-4">Welcome to VIP!</h3>
              <p className="text-gray-300 mb-8">
                Your {selectedPlan?.tier} membership is now active. Enjoy your enhanced rewards!
              </p>
              <button
                onClick={onClose}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-bold transition-all"
              >
                Start Earning More
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};