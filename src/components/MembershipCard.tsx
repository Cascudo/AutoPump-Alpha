// src/components/MembershipCard.tsx
import { FC } from 'react';

type MembershipTier = 'Gold' | 'Silver' | 'Bronze' | 'None';

interface MembershipCardProps {
  tokenBalance: number;
  usdValue: number;
  membershipTier: MembershipTier;
  isEligible: boolean;
  dailyEntries: number;
}

export const MembershipCard: FC<MembershipCardProps> = ({
  tokenBalance,
  usdValue,
  membershipTier,
  isEligible,
  dailyEntries
}) => {
  const getTierGradient = (tier: MembershipTier) => {
    switch (tier) {
      case 'Gold':
        return 'from-teal-600 via-teal-500 to-cyan-400';
      case 'Silver':
        return 'from-gray-500 via-gray-400 to-gray-300';
      case 'Bronze':
        return 'from-orange-700 via-orange-600 to-orange-500';
      default:
        return 'from-gray-700 via-gray-600 to-gray-500';
    }
  };

  const getTierIcon = (tier: MembershipTier) => {
    switch (tier) {
      case 'Gold':
        return '👑';
      case 'Silver':
        return '🥈';
      case 'Bronze':
        return '🥉';
      default:
        return '⭕';
    }
  };

  const getTierBenefits = (tier: MembershipTier) => {
    switch (tier) {
      case 'Gold':
        return ['10 daily entries', 'Priority support', 'Exclusive events', 'Max rewards chance'];
      case 'Silver':
        return ['3 daily entries', 'Member support', 'Early access', 'Higher rewards'];
      case 'Bronze':
        return ['1 daily entry', 'Basic support', 'Member access', 'Daily rewards'];
      default:
        return ['Hold $10+ worth of $ALPHA to unlock membership benefits'];
    }
  };

  const getRequiredAmount = (tier: MembershipTier) => {
    switch (tier) {
      case 'Gold':
        return '$1,000+';
      case 'Silver':
        return '$100 - $999';
      case 'Bronze':
        return '$10 - $99';
      default:
        return 'Under $10';
    }
  };

  return (
    <div className="relative">
      {/* Premium Card */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${getTierGradient(membershipTier)} p-1`}>
        <div className="bg-black/80 backdrop-blur-sm rounded-3xl p-8">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">{getTierIcon(membershipTier)}</div>
              <div>
                <h2 className="text-2xl font-bold text-white">{membershipTier} Member</h2>
                <p className="text-gray-300">{getRequiredAmount(membershipTier)} Value</p>
              </div>
            </div>
            
            {isEligible && (
              <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-semibold">
                ✅ ACTIVE
              </div>
            )}
          </div>

          {/* Balance Display */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/5 rounded-2xl p-6">
              <div className="text-gray-400 text-sm mb-2">$ALPHA Balance</div>
              <div className="text-3xl font-bold text-white">
                {tokenBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div className="text-teal-400 text-lg font-semibold">
                ${usdValue.toFixed(2)} USD
              </div>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-6">
              <div className="text-gray-400 text-sm mb-2">Daily Entries</div>
              <div className="text-3xl font-bold text-white">
                {dailyEntries}
              </div>
              <div className="text-cyan-400 text-lg font-semibold">
                {dailyEntries > 0 ? 'Chances per Day' : 'Not Eligible'}
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {isEligible ? 'Your Benefits' : 'Unlock Benefits'}
            </h3>
            <div className="space-y-2">
              {getTierBenefits(membershipTier).map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${isEligible ? 'bg-green-400' : 'bg-gray-500'}`} />
                  <span className={`${isEligible ? 'text-gray-300' : 'text-gray-500'}`}>
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade Path */}
          {membershipTier !== 'Gold' && (
            <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 rounded-2xl p-4 border border-teal-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">
                    {membershipTier === 'None' ? 'Become a Member' : 'Upgrade to ' + (membershipTier === 'Bronze' ? 'Silver' : 'Gold')}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {membershipTier === 'None' 
                      ? 'Hold $10+ worth of $ALPHA tokens' 
                      : membershipTier === 'Bronze' 
                      ? 'Hold $100+ for Silver tier' 
                      : 'Hold $1,000+ for Gold tier'
                    }
                  </div>
                </div>
                <div className="text-2xl">
                  {membershipTier === 'None' ? '🚀' : '⬆️'}
                </div>
              </div>
            </div>
          )}

          {/* Special Effects for Premium Tiers */}
          {membershipTier === 'Gold' && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-cyan-300 to-teal-400 animate-pulse" />
          )}
          
        </div>
      </div>

      {/* Floating Elements */}
      {isEligible && (
        <>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full border-4 border-black animate-bounce" />
          <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-cyan-400 rounded-full border-2 border-black animate-pulse" />
        </>
      )}
    </div>
  );
};