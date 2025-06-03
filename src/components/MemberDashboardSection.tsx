// src/components/MemberDashboardSection.tsx
import { FC } from 'react';
import { MembershipTier } from '../stores/useMembershipStore';

interface MemberDashboardSectionProps {
  tokenBalance: number;
  usdValue: number;
  membershipTier: MembershipTier;
  isEligible: boolean;
  dailyEntries: number;
}

export const MemberDashboardSection: FC<MemberDashboardSectionProps> = ({
  tokenBalance,
  usdValue,
  membershipTier,
  isEligible,
  dailyEntries
}) => {
  
  const getNextDrawTime = () => {
    const now = new Date();
    const nextDraw = new Date();
    nextDraw.setUTCHours(11, 0, 0, 0);
    if (nextDraw.getTime() <= now.getTime()) {
      nextDraw.setDate(nextDraw.getDate() + 1);
    }
    return nextDraw;
  };

  const getTimeUntilDraw = () => {
    const nextDraw = getNextDrawTime();
    const now = new Date();
    const diff = nextDraw.getTime() - now.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const winHistory = [
    { date: '2024-01-26', amount: 247, tx: '5x7K...9mRp' },
    { date: '2024-01-25', amount: 189, tx: '8nB2...k5Wp' },
    { date: '2024-01-24', amount: 356, tx: '3mX4...j7Qs' }
  ];

  return (
    <div className="w-full py-16 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Welcome Message */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Welcome back, {membershipTier} Member! 
            {membershipTier === 'Gold' && '👑'}
            {membershipTier === 'Silver' && '🥈'}
            {membershipTier === 'Bronze' && '🥉'}
          </h2>
          <p className="text-xl text-gray-300">
            {isEligible 
              ? `You have ${dailyEntries} ${dailyEntries === 1 ? 'entry' : 'entries'} in today's reward draw`
              : 'Hold $10+ worth of $ALPHA to participate in daily rewards'
            }
          </p>
        </div>

        {isEligible ? (
          <>
            {/* Member Status Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              
              {/* Portfolio Overview */}
              <div className="lg:col-span-2">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
                  <h3 className="text-2xl font-bold text-white mb-6">Your ALPHA Portfolio</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-black/40 rounded-2xl p-6">
                      <div className="text-gray-400 text-sm mb-2">Token Balance</div>
                      <div className="text-3xl font-bold text-white mb-1">
                        {tokenBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-teal-400 text-lg font-semibold">
                        $ALPHA
                      </div>
                    </div>
                    
                    <div className="bg-black/40 rounded-2xl p-6">
                      <div className="text-gray-400 text-sm mb-2">USD Value</div>
                      <div className="text-3xl font-bold text-white mb-1">
                        ${usdValue.toFixed(2)}
                      </div>
                      <div className="text-cyan-400 text-lg font-semibold">
                        Current Value
                      </div>
                    </div>
                  </div>

                  {/* Membership Benefits */}
                  <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 rounded-2xl p-6 border border-teal-500/20">
                    <h4 className="text-lg font-semibold text-white mb-4">Your {membershipTier} Member Benefits</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                        <span className="text-gray-300">{dailyEntries} daily reward {dailyEntries === 1 ? 'entry' : 'entries'}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                        <span className="text-gray-300">Member support</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                        <span className="text-gray-300">Exclusive announcements</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                        <span className="text-gray-300">Early access features</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Draw Countdown */}
              <div className="space-y-8">
                <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 rounded-3xl p-8 border border-teal-500/20">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-4">🏆</div>
                    <h3 className="text-xl font-bold text-white mb-2">Next Reward Draw</h3>
                    <p className="text-gray-300 text-sm">Daily at 11:00 UTC</p>
                  </div>

                  <div className="bg-black/40 rounded-2xl p-6 mb-6 text-center">
                    <div className="text-gray-400 text-sm mb-2">Time Until Draw</div>
                    <div className="text-3xl font-mono font-bold text-teal-400 tracking-wider">
                      {getTimeUntilDraw()}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">{dailyEntries}</div>
                    <div className="text-gray-300 text-sm">Your {dailyEntries === 1 ? 'Entry' : 'Entries'} Today</div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 border border-gray-700">
                  <h4 className="text-lg font-semibold text-white mb-4">Quick Actions</h4>
                  <div className="space-y-3">
                    <button className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white py-3 rounded-xl font-semibold transition-all">
                      View Reward History
                    </button>
                    <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-xl font-semibold transition-all">
                      Upgrade to VIP
                    </button>
                    <button className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-all">
                      View Burns
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Win History */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-6">Recent Reward Winners</h3>
              <div className="space-y-4">
                {winHistory.map((win, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-black/40 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-semibold">${win.amount}</div>
                        <div className="text-gray-400 text-sm">{win.date}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-teal-400 font-mono text-sm">{win.tx}</div>
                      <div className="text-gray-500 text-xs">Transaction</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Non-Member View */
          <div className="text-center">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-12 border border-gray-700 max-w-2xl mx-auto">
              <div className="text-6xl mb-6">🚀</div>
              <h3 className="text-3xl font-bold text-white mb-6">Become an ALPHA Member</h3>
              <p className="text-xl text-gray-300 mb-8">
                Hold $10+ worth of $ALPHA tokens to unlock daily rewards, exclusive benefits, and VIP access.
              </p>
              <div className="bg-black/40 rounded-2xl p-6 mb-8">
                <div className="text-gray-400 text-sm mb-2">You currently hold</div>
                <div className="text-2xl font-bold text-white mb-1">
                  {tokenBalance.toLocaleString()} $ALPHA
                </div>
                <div className="text-red-400">
                  ${(10 - usdValue).toFixed(2)} more needed for membership
                </div>
              </div>
              <button className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105">
                Get More $ALPHA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};