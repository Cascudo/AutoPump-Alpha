// src/components/RecentWinners.tsx
// OPTIMIZED: Updated with new platform messaging
import { FC, useState, useEffect } from 'react';

interface Winner {
  id: string;
  title: string;
  prize_value: number;
  winner_wallet: string;
  winner_selected_at: string;
  prize_description: string;
}

export const RecentWinners: FC = () => {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentWinners();
  }, []);

  const fetchRecentWinners = async () => {
    try {
      const response = await fetch('/api/promotional-giveaways');
      const data = await response.json();
      
      // Filter for completed giveaways with winners
      const completedWinners = data.giveaways?.filter((g: any) => 
        g.status === 'completed' && g.winner_wallet
      ) || [];
      
      setWinners(completedWinners.slice(0, 6)); // Show last 6 winners
    } catch (error) {
      console.error('Error fetching recent winners:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPrizeEmoji = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('macbook') || t.includes('laptop')) return '💻';
    if (t.includes('iphone') || t.includes('phone')) return '📱';
    if (t.includes('ps5') || t.includes('playstation')) return '🎮';
    if (t.includes('airpods') || t.includes('headphones')) return '🎧';
    if (t.includes('watch')) return '⌚';
    if (t.includes('ipad')) return '📱';
    return '🏆';
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-6"></div>
        <div className="text-white text-lg">Loading recent winners...</div>
      </div>
    );
  }

  if (winners.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="mb-8">
          <div className="text-7xl mb-6">🚀</div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              ALPHA CLUB
            </span>
          </h2>
          <div className="text-2xl text-gray-300 mb-8">
            Powered by <span className="text-yellow-400 font-bold">Solana</span> & 
            <span className="text-purple-400 font-bold"> Pump.fun Creator Rewards</span>
          </div>
        </div>
        
        {/* Platform Features - Updated to reflect actual availability */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
          <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/20 rounded-2xl p-6 border border-teal-500/30">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-white mb-3">Solana-Powered</h3>
            <p className="text-gray-300 text-sm">
              Lightning-fast transactions with minimal fees on the Solana blockchain
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 rounded-2xl p-6 border border-purple-500/30">
            <div className="text-4xl mb-4">💎</div>
            <h3 className="text-xl font-bold text-white mb-3">Creator Rewards</h3>
            <p className="text-gray-300 text-sm">
              Integrated with Pump.fun creator reward ecosystem for maximum benefits
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/20 rounded-2xl p-6 border border-yellow-500/30">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-white mb-3">Premium Platform</h3>
            <p className="text-gray-300 text-sm">
              Exclusive rewards, deflationary tokenomics, and VIP membership benefits
            </p>
          </div>
        </div>

        {/* Platform Features - Updated to reflect actual availability */}
        <div className="bg-gradient-to-br from-gray-900/80 to-purple-900/20 backdrop-blur-xl rounded-3xl p-8 border border-purple-500/30 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-white mb-6">🎁 Enter draws by simply holding $ALPHA!</h3>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="space-y-3">
              <div className="flex items-center text-green-400">
                <span className="mr-3">✅</span>
                <span>Automatic entry system</span>
              </div>
              <div className="flex items-center text-green-400">
                <span className="mr-3">✅</span>
                <span>VIP multiplier benefits</span>
              </div>
              <div className="flex items-center text-green-400">
                <span className="mr-3">✅</span>
                <span>High-value prize giveaways</span>
              </div>
              <div className="flex items-center text-green-400">
                <span className="mr-3">✅</span>
                <span>Partner discount marketplace</span>
              </div>
              <div className="flex items-center text-green-400">
                <span className="mr-3">✅</span>
                <span>Exclusive VIP experiences</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center text-yellow-400">
                <span className="mr-3">⏳</span>
                <span>Enhanced mobile app</span>
              </div>
              <div className="flex items-center text-yellow-400">
                <span className="mr-3">⏳</span>
                <span>NFT integration</span>
              </div>
              <div className="flex items-center text-yellow-400">
                <span className="mr-3">⏳</span>
                <span>Advanced analytics dashboard</span>
              </div>
              <div className="flex items-center text-yellow-400">
                <span className="mr-3">⏳</span>
                <span>Cross-chain expansion</span>
              </div>
              <div className="flex items-center text-yellow-400">
                <span className="mr-3">⏳</span>
                <span>DAO governance system</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-gray-300 mb-4">
              Experience the future of Web3 rewards - most features are already live!
            </p>
            <div className="inline-block bg-gradient-to-r from-green-600 to-emerald-600 rounded-full px-6 py-2 text-white font-bold">
              🚀 Platform Fully Operational
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">🏆 Recent Winners</h2>
        <p className="text-xl text-gray-300 mb-6">
          Real winners, real prizes, real addresses. You could be next.
        </p>
        <div className="inline-block bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-full px-6 py-3 border border-green-500/30">
          <span className="text-green-400 font-bold text-lg">
            ✨ ${winners.reduce((total, w) => total + w.prize_value, 0).toLocaleString()} in prizes distributed!
          </span>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {winners.map((winner, index) => (
          <div 
            key={winner.id} 
            className="group hover:scale-105 transition-all duration-300"
          >
            <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-3xl p-8 border border-yellow-500/30 hover:border-yellow-400/60 transition-all h-full">
              <div className="text-center">
                <div className="text-6xl mb-6 group-hover:animate-bounce">
                  {getPrizeEmoji(winner.title)}
                </div>
                
                <h3 className="text-xl font-bold text-white mb-4">{winner.title}</h3>
                
                <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-6 py-3 rounded-full font-bold text-lg mb-6 inline-block">
                  ${winner.prize_value.toLocaleString()}
                </div>
                
                <div className="bg-black/50 rounded-xl p-6 border border-gray-600/30 mb-4">
                  <div className="text-xs text-gray-400 mb-2">🎯 WINNER</div>
                  <div className="font-mono text-yellow-400 text-sm mb-2">
                    {formatWallet(winner.winner_wallet)}
                  </div>
                  <div className="text-xs text-gray-400">
                    Won {formatDate(winner.winner_selected_at)}
                  </div>
                </div>
                
                <div className="text-sm text-green-400 font-semibold opacity-75 group-hover:opacity-100 transition-opacity">
                  ✨ This could be you next!
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="text-center mt-16">
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30 max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-white mb-4">Ready to Win?</h3>
          <p className="text-gray-300 mb-6">
            Hold $ALPHA tokens and you&apos;re automatically entered in all future giveaways!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg px-6 py-3 text-white font-bold">
              🎯 Automatic Entry System
            </div>
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg px-6 py-3 text-white font-bold">
              💎 Premium Rewards
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};