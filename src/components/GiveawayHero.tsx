// src/components/GiveawayHero.tsx
// Hero section with prize display and animated elements
import { FC } from 'react';
import { PromotionalGiveaway } from '../utils/supabaseClient';

interface GiveawayHeroProps {
  giveaway: PromotionalGiveaway;
  userEntries?: number;
  userConnected: boolean;
  onConnectWallet: () => void;
}

export const GiveawayHero: FC<GiveawayHeroProps> = ({
  giveaway,
  userEntries = 0,
  userConnected,
  onConnectWallet
}) => {
  
  const getPrizeEmoji = () => {
    const title = giveaway.title.toLowerCase();
    if (title.includes('macbook') || title.includes('laptop')) return '💻';
    if (title.includes('iphone') || title.includes('phone')) return '📱';
    if (title.includes('ps5') || title.includes('playstation')) return '🎮';
    if (title.includes('airpods') || title.includes('headphones')) return '🎧';
    if (title.includes('watch') || title.includes('apple watch')) return '⌚';
    if (title.includes('ipad') || title.includes('tablet')) return '📱';
    return '🎁';
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-purple-900/20 py-20">
      
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4">
        
        {/* Prize Showcase */}
        <div className="text-center mb-12">
          
          {/* Floating Prize Icon */}
          <div className="inline-block mb-8">
            <div 
              className="text-8xl lg:text-9xl animate-bounce"
              style={{ 
                animationDuration: '3s',
                animationIterationCount: 'infinite'
              }}
            >
              {getPrizeEmoji()}
            </div>
          </div>

          {/* Prize Title */}
          <h1 className="text-4xl lg:text-7xl font-black text-white mb-6 leading-tight">
            WIN A{' '}
            <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 bg-clip-text text-transparent animate-pulse">
              ${giveaway.prize_value.toLocaleString()}
            </span>
            <br />
            {giveaway.title}
          </h1>

          {/* Prize Description */}
          <p className="text-xl lg:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
            {giveaway.prize_description}
            {' '}
            <span className="text-cyan-400 font-bold">FREE shipping worldwide</span>
            {' or '}
            <span className="text-green-400 font-bold">cash equivalent</span>.
          </p>

          {/* Prize Value Display */}
          <div className="inline-block mb-12">
            <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 p-1 rounded-3xl">
              <div className="bg-black rounded-3xl px-8 lg:px-16 py-6 lg:py-8">
                <div className="text-5xl lg:text-7xl font-black text-white mb-2">
                  ${giveaway.prize_value.toLocaleString()}
                </div>
                <div className="text-yellow-400 font-bold text-xl lg:text-2xl">TOTAL PRIZE VALUE</div>
              </div>
            </div>
          </div>

          {/* User Entry Status */}
          {userConnected ? (
            <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 backdrop-blur-sm rounded-3xl p-8 border border-green-500/30 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-green-400 mb-4">🎯 You&apos;re Entered!</h3>
              <div className="text-4xl font-bold text-white mb-2">{userEntries}</div>
              <div className="text-green-400 font-bold text-lg">Your Current Entries</div>
              <div className="text-gray-300 mt-2">
                {userEntries > 0 ? 'Good luck! Buy more entries to increase your chances.' : 'Connect your wallet or buy entries to participate.'}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 backdrop-blur-sm rounded-3xl p-8 border border-orange-500/30 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-orange-400 mb-4">⚡ Enter to Win!</h3>
              <p className="text-gray-300 mb-6 text-lg">
                Connect your wallet to see your FREE entries from ALPHA holdings
              </p>
              <button 
                onClick={onConnectWallet}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 text-lg"
              >
                Connect Wallet & Enter
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};