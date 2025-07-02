// src/components/StatsOverview.tsx
import { FC } from 'react';

export const StatsOverview: FC = () => {
  const stats = [
    {
      title: 'Total Rewards Distributed',
      value: '$124,892',
      change: '+$2,847',
      changeLabel: 'Today',
      icon: '💰',
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Tokens Burned',
      value: '45.2M',
      change: '+89K',
      changeLabel: 'Today',
      icon: '🔥',
      color: 'from-red-500 to-orange-500'
    },
    {
      title: 'Active Members',
      value: '3,847',
      change: '+23',
      changeLabel: '24h',
      icon: '👥',
      color: 'from-blue-500 to-purple-500'
    },
    {
      title: 'Average Win Rate',
      value: '12.4%',
      change: '+0.8%',
      changeLabel: 'This week',
      icon: '📈',
      color: 'from-purple-500 to-pink-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="relative group">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 transform hover:scale-105">
            
            {/* Icon */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl">{stat.icon}</div>
              <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl opacity-20 group-hover:opacity-30 transition-opacity`} />
            </div>

            {/* Main Value */}
            <div className="mb-2">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-gray-400 text-sm">{stat.title}</div>
            </div>

            {/* Change Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`text-sm font-semibold ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                {stat.change}
              </div>
              <div className="text-gray-500 text-xs">{stat.changeLabel}</div>
            </div>

            {/* Hover Effect */}
            <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
          </div>
        </div>
      ))}
    </div>
  );
};