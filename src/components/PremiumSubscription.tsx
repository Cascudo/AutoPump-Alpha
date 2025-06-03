// src/components/PremiumSubscription.tsx
import { FC, useState } from 'react';

interface SubscriptionTier {
  name: string;
  price: string | number;
  multiplier: number;
  bonus: string | number;
  features: string[];
  popular?: boolean;
  color: string;
  icon: string;
}

export const PremiumSubscription: FC = () => {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const subscriptionTiers: SubscriptionTier[] = [
    {
      name: 'VIP Bronze',
      price: 'TBC',
      multiplier: 2,
      bonus: 'TBC',
      features: [
        '2x daily chances',
        'Priority support',
        'Member badge',
        'Early notifications'
      ],
      color: 'from-orange-600 to-orange-500',
      icon: '🥉'
    },
    {
      name: 'VIP Silver',
      price: 'TBC',
      multiplier: 5,
      bonus: 'TBC',
      features: [
        '5x daily chances',
        'Exclusive chat access',
        'Monthly bonus draw',
        'Premium support',
        'Custom profile'
      ],
      popular: true,
      color: 'from-gray-400 to-gray-300',
      icon: '🥈'
    },
    {
      name: 'VIP Diamond',
      price: 'TBC',
      multiplier: 10,
      bonus: 'TBC',
      features: [
        '10x daily chances',
        'Direct dev access',
        'Weekly guaranteed win',
        'Exclusive events',
        'Custom rewards',
        'VIP-only draws'
      ],
      color: 'from-blue-400 to-purple-500',
      icon: '💎'
    }
  ];

  const handleSubscribe = (tierName: string) => {
    setSelectedTier(tierName);
    // TODO: Implement Solana Pay integration
    console.log(`Subscribing to ${tierName}`);
  };

  return (
    <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-3xl p-8 border border-purple-500/20">
      
      {/* Header */}
      <div className="text-center mb-12">
        <div className="text-4xl mb-4">⚡</div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Supercharge Your Rewards
        </h2>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          Multiply your daily chances with VIP subscriptions. Pay with SOL, USDC, or $ALPHA tokens.
        </p>
      </div>

      {/* Subscription Tiers */}
      <div className="grid md:grid-cols-3 gap-8 mb-8">
        {subscriptionTiers.map((tier, index) => (
          <div key={tier.name} className="relative group">
            
            {/* Popular Badge */}
            {tier.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-1 rounded-full text-sm font-bold">
                  MOST POPULAR
                </div>
              </div>
            )}

            <div className={`relative bg-gradient-to-br ${tier.color} p-1 rounded-2xl ${tier.popular ? 'scale-105' : ''} transition-transform group-hover:scale-105`}>
              <div className="bg-black/90 rounded-2xl p-6 h-full">
                
                {/* Tier Header */}
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">{tier.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                  <div className="text-3xl font-bold text-white">
                    {typeof tier.price === 'string' ? tier.price : `$${tier.price}`}
                    {typeof tier.price === 'string' ? '' : <span className="text-lg text-gray-400">/month</span>}
                  </div>
                </div>

                {/* Key Benefits */}
                <div className="mb-6">
                  <div className="bg-white/10 rounded-xl p-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">
                        {tier.multiplier}x
                      </div>
                      <div className="text-sm text-gray-300">Daily Chances</div>
                    </div>
                  </div>
                  
                  <div className="bg-green-900/30 rounded-xl p-3 text-center border border-green-500/20">
                    <div className="text-green-400 font-semibold">
                      {typeof tier.bonus === 'string' ? `${tier.bonus} Monthly Bonus` : `+$${tier.bonus} Monthly Bonus`}
                    </div>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-3 mb-8">
                  {tier.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Subscribe Button */}
                <button
                  onClick={() => handleSubscribe(tier.name)}
                  disabled
                  className={`w-full py-3 rounded-xl font-semibold transition-all transform hover:scale-105 opacity-50 cursor-not-allowed ${
                    tier.popular 
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:shadow-2xl' 
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                  }`}
                >
                  {selectedTier === tier.name ? 'Processing...' : 'Coming Soon'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Methods */}
      <div className="bg-white/5 rounded-2xl p-6 text-center">
        <h4 className="text-white font-semibold mb-4">Accepted Payment Methods</h4>
        <div className="flex justify-center items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
            <span className="text-gray-300">SOL</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-500 rounded-full"></div>
            <span className="text-gray-300">USDC</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
            <span className="text-gray-300">$ALPHA</span>
          </div>
        </div>
        <p className="text-gray-400 text-sm mt-4">
          Secure payments powered by Solana Pay • Pricing TBC
        </p>
      </div>
    </div>
  );
};