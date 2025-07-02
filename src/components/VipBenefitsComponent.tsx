// src/components/VipBenefitsComponent.tsx - VIP Exclusive Benefits
import { FC, useState } from 'react';
import Link from 'next/link';

interface Benefit {
  id: string;
  category: string;
  company: string;
  title: string;
  description: string;
  value: string;
  tier: 'Silver' | 'Gold' | 'Platinum';
  link: string;
  icon: string;
  featured?: boolean;
  comingSoon?: boolean;
}

interface VipBenefitsProps {
  userTier: 'Silver' | 'Gold' | 'Platinum';
  className?: string;
}

export const VipBenefitsComponent: FC<VipBenefitsProps> = ({ userTier, className = '' }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  // Complete benefits catalog - this would come from your database
  const allBenefits: Benefit[] = [
    // Silver Benefits
    {
      id: 'aws-silver',
      category: 'Cloud',
      company: 'AWS',
      title: 'AWS Activate Credits',
      description: '$100 in AWS credits for new accounts',
      value: '$100',
      tier: 'Silver',
      link: 'https://aws.amazon.com/activate/',
      icon: '☁️',
      featured: true
    },
    {
      id: 'tradingview-silver',
      category: 'Trading',
      company: 'TradingView',
      title: 'TradingView Pro',
      description: '20% off TradingView Pro subscription',
      value: '20% OFF',
      tier: 'Silver',
      link: 'https://www.tradingview.com/',
      icon: '📈'
    },
    {
      id: 'google-ads-silver',
      category: 'Marketing',
      company: 'Google',
      title: 'Google Ads Credits',
      description: '$200 in Google Ads promotional credits',
      value: '$200',
      tier: 'Silver',
      link: 'https://ads.google.com/',
      icon: '🎯'
    },
    {
      id: 'stripe-silver',
      category: 'Payments',
      company: 'Stripe',
      title: 'Stripe Reduced Fees',
      description: 'Reduced processing fees for first 6 months',
      value: 'REDUCED FEES',
      tier: 'Silver',
      link: 'https://stripe.com/',
      icon: '💳'
    },

    // Gold Benefits (includes Silver + more)
    {
      id: 'aws-gold',
      category: 'Cloud',
      company: 'AWS',
      title: 'AWS Activate Credits',
      description: '$250 in AWS credits for new accounts',
      value: '$250',
      tier: 'Gold',
      link: 'https://aws.amazon.com/activate/',
      icon: '☁️',
      featured: true
    },
    {
      id: 'tradingview-gold',
      category: 'Trading',
      company: 'TradingView',
      title: 'TradingView Pro+',
      description: '30% off TradingView Pro+ subscription',
      value: '30% OFF',
      tier: 'Gold',
      link: 'https://www.tradingview.com/',
      icon: '📈',
      featured: true
    },
    {
      id: 'digitalocean-gold',
      category: 'Cloud',
      company: 'DigitalOcean',
      title: 'DigitalOcean Credits',
      description: '$200 in DigitalOcean credits',
      value: '$200',
      tier: 'Gold',
      link: 'https://www.digitalocean.com/',
      icon: '🌊'
    },
    {
      id: 'mailchimp-gold',
      category: 'Marketing',
      company: 'Mailchimp',
      title: 'Mailchimp Premium',
      description: '50% off Mailchimp for 6 months',
      value: '50% OFF',
      tier: 'Gold',
      link: 'https://mailchimp.com/',
      icon: '📧'
    },
    {
      id: 'binance-gold',
      category: 'Trading',
      company: 'Binance',
      title: 'Binance Fee Reduction',
      description: 'Reduced trading fees on Binance',
      value: 'REDUCED FEES',
      tier: 'Gold',
      link: 'https://www.binance.com/',
      icon: '🔶'
    },

    // Platinum Benefits (includes Gold + exclusive)
    {
      id: 'aws-platinum',
      category: 'Cloud',
      company: 'AWS',
      title: 'AWS Activate Credits',
      description: '$500 in AWS credits for new accounts',
      value: '$500',
      tier: 'Platinum',
      link: 'https://aws.amazon.com/activate/',
      icon: '☁️',
      featured: true
    },
    {
      id: 'tradingview-platinum',
      category: 'Trading',
      company: 'TradingView',
      title: 'TradingView Premium',
      description: '50% off TradingView Premium subscription',
      value: '50% OFF',
      tier: 'Platinum',
      link: 'https://www.tradingview.com/',
      icon: '📈',
      featured: true
    },
    {
      id: 'hubspot-platinum',
      category: 'Business',
      company: 'HubSpot',
      title: 'HubSpot CRM',
      description: '3 months free HubSpot CRM Suite',
      value: '3 MONTHS FREE',
      tier: 'Platinum',
      link: 'https://www.hubspot.com/',
      icon: '🔧',
      featured: true
    },
    {
      id: 'atlas-platinum',
      category: 'Business',
      company: 'Stripe',
      title: 'Stripe Atlas',
      description: 'Free company incorporation via Stripe Atlas',
      value: 'FREE',
      tier: 'Platinum',
      link: 'https://stripe.com/atlas',
      icon: '🏢',
      featured: true
    },
    {
      id: 'exclusive-draws',
      category: 'Exclusive',
      company: 'ALPHA Club',
      title: 'Platinum-Only Draws',
      description: 'Exclusive weekly prize draws for Platinum members',
      value: 'EXCLUSIVE',
      tier: 'Platinum',
      link: '#',
      icon: '🎁',
      featured: true
    },

    // Coming Soon
    {
      id: 'figma-coming',
      category: 'Design',
      company: 'Figma',
      title: 'Figma Pro',
      description: 'Discounted Figma Pro subscription',
      value: 'COMING SOON',
      tier: 'Silver',
      link: '#',
      icon: '🎨',
      comingSoon: true
    },
    {
      id: 'notion-coming',
      category: 'Productivity',
      company: 'Notion',
      title: 'Notion Pro',
      description: 'Free Notion Pro for 6 months',
      value: 'COMING SOON',
      tier: 'Gold',
      link: '#',
      icon: '📝',
      comingSoon: true
    }
  ];

  // Filter benefits based on user tier
  const getAvailableBenefits = () => {
    const tierHierarchy = { 'Silver': 1, 'Gold': 2, 'Platinum': 3 };
    const userTierLevel = tierHierarchy[userTier];
    
    return allBenefits.filter(benefit => {
      const benefitTierLevel = tierHierarchy[benefit.tier];
      return benefitTierLevel <= userTierLevel;
    });
  };

  const availableBenefits = getAvailableBenefits();
  const categories = ['all', ...Array.from(new Set(availableBenefits.map(b => b.category)))];
  
  const filteredBenefits = activeCategory === 'all' 
    ? availableBenefits 
    : availableBenefits.filter(b => b.category === activeCategory);

  const featuredBenefits = availableBenefits.filter(b => b.featured && !b.comingSoon);

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">
          🎁 {userTier} VIP Benefits
        </h2>
        <p className="text-gray-300">
          Exclusive offers and perks for {userTier} VIP members
        </p>
        <div className="mt-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 inline-block">
          <p className="text-purple-200 text-sm">
            💡 <strong>Pro Tip:</strong> Benefits are cumulative - Gold members get Silver benefits too!
          </p>
        </div>
      </div>

      {/* Featured Benefits */}
      {featuredBenefits.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            ⭐ Featured Benefits
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredBenefits.slice(0, 3).map((benefit) => (
              <BenefitCard key={benefit.id} benefit={benefit} featured />
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all capitalize ${
              activeCategory === category
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {category === 'all' ? 'All Benefits' : category}
          </button>
        ))}
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBenefits.map((benefit) => (
          <BenefitCard key={benefit.id} benefit={benefit} />
        ))}
      </div>

      {/* Upgrade CTA for non-Platinum */}
      {userTier !== 'Platinum' && (
        <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-2xl p-8 border border-purple-500/30 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">
            🚀 Want Even More Benefits?
          </h3>
          <p className="text-purple-200 mb-6">
            Upgrade to {userTier === 'Silver' ? 'Gold' : 'Platinum'} VIP for exclusive perks and higher multipliers
          </p>
          <Link href="/vip">
            <button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black px-8 py-3 rounded-xl font-bold transition-all transform hover:scale-105">
              Upgrade VIP Tier 👑
            </button>
          </Link>
        </div>
      )}
    </div>
  );
};

// Individual Benefit Card Component
const BenefitCard: FC<{ benefit: Benefit; featured?: boolean }> = ({ benefit, featured = false }) => {
  const [claimed, setClaimed] = useState(false);

  const handleClaim = () => {
    if (benefit.comingSoon) return;
    
    // Track the claim in analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'vip_benefit_claim', {
        benefit_id: benefit.id,
        benefit_company: benefit.company,
        user_tier: benefit.tier
      });
    }
    
    setClaimed(true);
    setTimeout(() => setClaimed(false), 3000); // Reset after 3 seconds
  };

  return (
    <div className={`
      bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border transition-all transform hover:scale-105
      ${featured 
        ? 'border-purple-500/50 shadow-lg shadow-purple-500/20' 
        : 'border-gray-700 hover:border-purple-500/30'
      }
      ${benefit.comingSoon ? 'opacity-75' : ''}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-purple-400 bg-purple-900/30 px-2 py-1 rounded-full">
            {benefit.category}
          </span>
          {featured && (
            <span className="text-xs font-semibold text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded-full">
              ⭐ FEATURED
            </span>
          )}
        </div>
        <span className="text-2xl">{benefit.icon}</span>
      </div>

      {/* Content */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-white">{benefit.company}</h3>
          <span className={`text-sm font-bold px-2 py-1 rounded ${
            benefit.comingSoon 
              ? 'bg-gray-600 text-gray-300'
              : 'bg-green-900/30 text-green-400'
          }`}>
            {benefit.value}
          </span>
        </div>
        <h4 className="text-md font-semibold text-gray-200 mb-2">{benefit.title}</h4>
        <p className="text-gray-400 text-sm">{benefit.description}</p>
      </div>

      {/* Action Button */}
      <button
        onClick={handleClaim}
        disabled={benefit.comingSoon}
        className={`
          w-full py-3 px-4 rounded-lg font-semibold transition-all
          ${benefit.comingSoon
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : claimed
            ? 'bg-green-600 text-white'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
          }
        `}
      >
        {benefit.comingSoon 
          ? 'Coming Soon' 
          : claimed 
          ? '✅ Opening...' 
          : 'Claim Benefit'
        }
      </button>

      {/* Tier indicator */}
      <div className="mt-3 text-center">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          benefit.tier === 'Silver' ? 'bg-gray-600 text-gray-300' :
          benefit.tier === 'Gold' ? 'bg-yellow-600 text-yellow-200' :
          'bg-purple-600 text-purple-200'
        }`}>
          {benefit.tier} VIP
        </span>
      </div>
    </div>
  );
};