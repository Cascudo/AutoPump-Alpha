// src/components/VipBenefitsDisplay.tsx - Database-driven VIP benefits component
import { FC, useState, useEffect } from 'react';

interface VipBenefit {
  id: string;
  category: string;
  title: string;
  description: string;
  discountPercent?: number;
  creditAmount?: string;
  link: string;
  requiredTier: 'Silver' | 'Gold' | 'Platinum';
  isActive: boolean;
  partnerLogo?: string;
  instructions?: string;
}

interface VipBenefitsDisplayProps {
  vipTier: 'Silver' | 'Gold' | 'Platinum';
  vipActive: boolean;
  onUpgrade: () => void;
}

// For now, we'll use a comprehensive static dataset that can be easily moved to database later
const VIP_BENEFITS: VipBenefit[] = [
  // Silver Benefits
  {
    id: 'silver-tradingview',
    category: 'Trading',
    title: 'TradingView Pro',
    description: '20% off premium plans',
    discountPercent: 20,
    link: 'https://tradingview.com',
    requiredTier: 'Silver',
    isActive: true,
    instructions: 'Use code ALPHASILVER20 at checkout'
  },
  {
    id: 'silver-aws',
    category: 'Cloud',
    title: 'AWS Credits',
    description: '$100 in AWS credits for new accounts',
    creditAmount: '$100',
    link: 'https://aws.amazon.com',
    requiredTier: 'Silver',
    isActive: true,
    instructions: 'Apply through our partner portal'
  },
  {
    id: 'silver-google-ads',
    category: 'Marketing',
    title: 'Google Ads Credits',
    description: '$200 in advertising credits',
    creditAmount: '$200',
    link: 'https://ads.google.com',
    requiredTier: 'Silver',
    isActive: true,
    instructions: 'New accounts only, contact support'
  },
  {
    id: 'silver-stripe',
    category: 'Finance',
    title: 'Stripe Processing',
    description: 'Reduced processing fees',
    discountPercent: 15,
    link: 'https://stripe.com',
    requiredTier: 'Silver',
    isActive: true,
    instructions: 'Mention ALPHA Club membership'
  },

  // Gold Benefits (includes Silver + additional)
  {
    id: 'gold-tradingview',
    category: 'Trading',
    title: 'TradingView Pro+',
    description: '30% off premium plans',
    discountPercent: 30,
    link: 'https://tradingview.com',
    requiredTier: 'Gold',
    isActive: true,
    instructions: 'Use code ALPHAGOLD30 at checkout'
  },
  {
    id: 'gold-aws',
    category: 'Cloud',
    title: 'AWS Credits',
    description: '$250 in AWS credits',
    creditAmount: '$250',
    link: 'https://aws.amazon.com',
    requiredTier: 'Gold',
    isActive: true,
    instructions: 'Enhanced credit package for Gold members'
  },
  {
    id: 'gold-hubspot',
    category: 'CRM',
    title: 'HubSpot Discount',
    description: '25% off CRM and marketing plans',
    discountPercent: 25,
    link: 'https://hubspot.com',
    requiredTier: 'Gold',
    isActive: true,
    instructions: 'Annual plans only'
  },
  {
    id: 'gold-mailchimp',
    category: 'Email',
    title: 'Mailchimp Premium',
    description: '20% off premium email plans',
    discountPercent: 20,
    link: 'https://mailchimp.com',
    requiredTier: 'Gold',
    isActive: true,
    instructions: 'Applies to Standard and Premium plans'
  },

  // Platinum Benefits (includes all + exclusive)
  {
    id: 'platinum-tradingview',
    category: 'Trading',
    title: 'TradingView Premium',
    description: '40% off all plans + priority support',
    discountPercent: 40,
    link: 'https://tradingview.com',
    requiredTier: 'Platinum',
    isActive: true,
    instructions: 'Exclusive Platinum pricing'
  },
  {
    id: 'platinum-aws',
    category: 'Cloud',
    title: 'AWS Enterprise Credits',
    description: '$500 in AWS credits + technical support',
    creditAmount: '$500',
    link: 'https://aws.amazon.com',
    requiredTier: 'Platinum',
    isActive: true,
    instructions: 'Includes dedicated support engineer'
  },
  {
    id: 'platinum-binance',
    category: 'Exchange',
    title: 'Binance VIP Rates',
    description: 'Reduced trading fees on Binance',
    discountPercent: 25,
    link: 'https://binance.com',
    requiredTier: 'Platinum',
    isActive: true,
    instructions: 'VIP tier 1 equivalent rates'
  },
  {
    id: 'platinum-digitalocean',
    category: 'Cloud',
    title: 'DigitalOcean Credits',
    description: '$200 in cloud hosting credits',
    creditAmount: '$200',
    link: 'https://digitalocean.com',
    requiredTier: 'Platinum',
    isActive: true,
    instructions: 'Valid for 12 months'
  }
];

export const VipBenefitsDisplay: FC<VipBenefitsDisplayProps> = ({
  vipTier,
  vipActive,
  onUpgrade
}) => {
  const [claimedBenefits, setClaimedBenefits] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Filter benefits based on user's VIP tier
  const availableBenefits = VIP_BENEFITS.filter(benefit => {
    const tierOrder = ['Silver', 'Gold', 'Platinum'];
    const userTierIndex = tierOrder.indexOf(vipTier);
    const benefitTierIndex = tierOrder.indexOf(benefit.requiredTier);
    return userTierIndex >= benefitTierIndex && benefit.isActive;
  });

  // Load claimed benefits from localStorage (can be moved to database later)
  useEffect(() => {
    const saved = localStorage.getItem(`claimed-benefits-${vipTier}`);
    if (saved) {
      setClaimedBenefits(new Set(JSON.parse(saved)));
    }
  }, [vipTier]);

  const handleClaimBenefit = async (benefitId: string) => {
    setLoading(true);
    try {
      // Simulate claiming process (can be replaced with API call)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newClaimed = new Set(claimedBenefits);
      newClaimed.add(benefitId);
      setClaimedBenefits(newClaimed);
      
      // Save to localStorage (can be moved to database)
      localStorage.setItem(`claimed-benefits-${vipTier}`, JSON.stringify([...newClaimed]));
      
      // In future: API call to track benefit usage
      // await fetch('/api/claim-benefit', { method: 'POST', body: JSON.stringify({ benefitId }) });
      
    } catch (error) {
      console.error('Error claiming benefit:', error);
    } finally {
      setLoading(false);
    }
  };

  // If not VIP, show upgrade CTA
  if (!vipActive) {
    return (
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-3xl p-12 border border-purple-500/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 animate-pulse"></div>
          <div className="relative z-10">
            <div className="text-6xl mb-6">👑</div>
            <h2 className="text-4xl font-bold text-white mb-4">Unlock VIP Benefits</h2>
            <p className="text-xl text-purple-200 mb-8 max-w-2xl mx-auto">
              Join our exclusive VIP club to access premium benefits, enhanced rewards, and special offers from top partners.
            </p>
            <button
              onClick={onUpgrade}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-12 py-4 rounded-2xl font-bold text-xl transition-all transform hover:scale-105 shadow-2xl"
            >
              Become VIP Member 🚀
            </button>
          </div>
        </div>

        {/* Preview Benefits by Tier */}
        <div className="grid md:grid-cols-3 gap-6">
          {['Silver', 'Gold', 'Platinum'].map((tier) => {
            const tierBenefits = VIP_BENEFITS.filter(b => b.requiredTier === tier).slice(0, 3);
            const tierColors = {
              'Silver': 'from-gray-600 to-gray-700',
              'Gold': 'from-yellow-600 to-yellow-700',
              'Platinum': 'from-purple-600 to-purple-700'
            };
            
            return (
              <div key={tier} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 opacity-75">
                <div className="text-center mb-4">
                  <div className={`inline-block px-4 py-2 rounded-full text-white font-bold bg-gradient-to-r ${tierColors[tier]}`}>
                    {tier} VIP
                  </div>
                </div>
                <div className="space-y-2">
                  {tierBenefits.map((benefit) => (
                    <div key={benefit.id} className="text-sm text-gray-400">
                      • {benefit.title}
                    </div>
                  ))}
                  <div className="text-xs text-gray-500 pt-2">
                    +{VIP_BENEFITS.filter(b => b.requiredTier === tier).length} total benefits
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
          <p className="text-gray-400 text-center">
            🔒 VIP benefits are exclusive to paying members. Upgrade now to unlock all features!
          </p>
        </div>
      </div>
    );
  }

  // Show VIP benefits for active members
  return (
    <div className="space-y-8">
      {/* VIP Status Header */}
      <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-3xl p-8 border border-purple-500/20">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">
            {vipTier === 'Silver' && '🥈'}
            {vipTier === 'Gold' && '🥇'}
            {vipTier === 'Platinum' && '💎'}
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">{vipTier} VIP Member</h2>
          <p className="text-purple-200 mb-4">Welcome to your exclusive benefits portal</p>
          
          {/* Tier Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-black/30 rounded-xl p-4">
              <div className="text-purple-400 font-bold text-lg">
                {vipTier === 'Silver' ? '2x' : vipTier === 'Gold' ? '3x' : '5x'}
              </div>
              <div className="text-gray-400 text-sm">Entry Multiplier</div>
            </div>
            <div className="bg-black/30 rounded-xl p-4">
              <div className="text-teal-400 font-bold text-lg">
                {vipTier === 'Silver' ? '2' : vipTier === 'Gold' ? '3' : '5'}
              </div>
              <div className="text-gray-400 text-sm">Baseline Entries</div>
            </div>
            <div className="bg-black/30 rounded-xl p-4">
              <div className="text-green-400 font-bold text-lg">{availableBenefits.length}</div>
              <div className="text-gray-400 text-sm">Available Benefits</div>
            </div>
            <div className="bg-black/30 rounded-xl p-4">
              <div className="text-yellow-400 font-bold text-lg">{claimedBenefits.size}</div>
              <div className="text-gray-400 text-sm">Benefits Claimed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableBenefits.map((benefit) => {
          const isClaimed = claimedBenefits.has(benefit.id);
          
          return (
            <div key={benefit.id} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 hover:border-purple-500/30 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-purple-600/20 text-purple-400 px-3 py-1 rounded-full text-sm font-semibold">
                  {benefit.category}
                </div>
                <div className="text-2xl">
                  {isClaimed ? '✅' : '🎁'}
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">{benefit.title}</h3>
              <p className="text-gray-400 mb-3">{benefit.description}</p>
              
              {/* Benefit Value */}
              <div className="mb-4">
                {benefit.discountPercent && (
                  <div className="text-green-400 font-bold text-lg">
                    {benefit.discountPercent}% OFF
                  </div>
                )}
                {benefit.creditAmount && (
                  <div className="text-blue-400 font-bold text-lg">
                    {benefit.creditAmount} Credits
                  </div>
                )}
              </div>

              {/* Instructions */}
              {benefit.instructions && (
                <div className="bg-black/30 rounded-lg p-3 mb-4">
                  <div className="text-xs text-gray-400 mb-1">How to claim:</div>
                  <div className="text-sm text-gray-300">{benefit.instructions}</div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={() => handleClaimBenefit(benefit.id)}
                disabled={isClaimed || loading}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  isClaimed
                    ? 'bg-green-600 text-white cursor-default'
                    : loading
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                }`}
              >
                {isClaimed ? 'Benefit Claimed ✅' : loading ? 'Processing...' : 'Claim Benefit'}
              </button>

              {/* External Link */}
              {isClaimed && (
                <div className="mt-3 text-center">
                  <a
                    href={benefit.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 text-sm underline"
                  >
                    Visit Partner Site ↗
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Coming Soon Section */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
        <div className="text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h3 className="text-2xl font-bold text-white mb-4">More Benefits Coming Soon!</h3>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
          We&apos;re constantly adding new partner benefits and exclusive offers. Community members can also 
            submit their services for VIP member discounts.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="bg-black/40 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-2">Partner Submissions</h4>
              <p className="text-gray-400 text-sm mb-4">
                Have a service you&apos;d like to offer to our VIP community? Submit your proposal.
              </p>
              <button className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-semibold transition-all">
                Submit Service
              </button>
            </div>
            
            <div className="bg-black/40 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-2">Request Benefits</h4>
              <p className="text-gray-400 text-sm mb-4">
                Missing a service you&apos;d like to see? Let us know what benefits you&apos;d like added.
              </p>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-all">
                Request Benefit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Tier CTA for lower tier members */}
      {(vipTier === 'Silver' || vipTier === 'Gold') && (
        <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-2xl p-6 border border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-yellow-200 mb-2">
                {vipTier === 'Silver' ? 'Upgrade to Gold or Platinum' : 'Upgrade to Platinum'}
              </h4>
              <p className="text-yellow-100 text-sm">
                Get access to even more exclusive benefits and higher multipliers!
              </p>
            </div>
            <button
              onClick={onUpgrade}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-bold transition-all"
            >
              Upgrade Tier
            </button>
          </div>
        </div>
      )}
    </div>
  );
};