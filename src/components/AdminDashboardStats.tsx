// src/components/AdminDashboardStats.tsx
// Real-time admin dashboard to see entries and pick winners
// FIXED: useEffect dependency warning and changed refresh to 60 seconds

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface AdminStats {
  realTimeStats: {
    totalHolders: number;
    eligibleHolders: number;
    totalEntries: number;
    totalUsdValue: number;
    activeVipSubscriptions: number;
    totalVipRevenue: number;
  };
  todayActivity: {
    increased: number;
    reduced: number;
    newHolders: number;
    totalActivity: number;
  };
  topHolders: Array<{
    wallet: string;
    usdValue: number;
    entries: number;
    vipTier: string;
    lastActive: string;
  }>;
  recentActivitySample: Array<{
    wallet: string;
    type: string;
    usdChange: number;
    entriesChange: number;
    timestamp: string;
  }>;
}

export const AdminDashboardStats: React.FC = () => {
  const { publicKey } = useWallet();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Wrap fetchStats in useCallback to prevent unnecessary re-renders
  const fetchStats = useCallback(async () => {
    if (!publicKey) {
      setError('Please connect your admin wallet');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📊 Fetching admin dashboard stats...');
      
      const response = await fetch(`/api/admin/dashboard-stats?adminWallet=${publicKey.toString()}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setStats(data);
        setLastRefresh(new Date());
        console.log('✅ Admin stats loaded:', data.realTimeStats);
      } else {
        setError(data.error || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('❌ Error fetching admin stats:', err);
      setError('Failed to connect to admin API');
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]); // publicKey is the only dependency

  // Test database connection
  const testDatabase = async () => {
    try {
      console.log('🧪 Testing database connection...');
      const response = await fetch('/api/test-database');
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Database test passed:', data);
        alert(`Database test passed!\n\nUsers found: ${data.tests.usersTableRead}\nAudit tables: ${data.auditTablesExist ? 'Yes' : 'No'}`);
      } else {
        console.error('❌ Database test failed:', data);
        alert('Database test failed: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Database test error:', error);
      alert('Database test error: ' + error.message);
    }
  };

  // Simulate winner selection
  const selectWinner = () => {
    if (!stats || stats.realTimeStats.totalEntries === 0) {
      alert('No entries available for drawing');
      return;
    }

    const totalEntries = stats.realTimeStats.totalEntries;
    const winningEntry = Math.floor(Math.random() * totalEntries) + 1;
    
    // In a real implementation, this would:
    // 1. Create a snapshot of all entries
    // 2. Use cryptographically secure randomness
    // 3. Map the winning entry to the correct wallet
    // 4. Record the draw in the database
    
    alert(`🎉 Winner Selected!\n\nWinning Entry: ${winningEntry} out of ${totalEntries}\n\n(This is a simulation - real implementation would map to actual wallet)`);
  };

  // Auto-refresh every 60 seconds (changed from 30 seconds)
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Changed to 60 seconds
    return () => clearInterval(interval);
  }, [fetchStats]); // Now includes fetchStats in dependencies

  if (!publicKey) {
    return (
      <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 rounded-2xl p-6 border border-red-500/20">
        <h2 className="text-xl font-bold text-white mb-2">⚠️ Admin Access Required</h2>
        <p className="text-red-400">Please connect your admin wallet to access the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-2xl p-6 border border-blue-500/20">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">📊 Admin Dashboard</h2>
            <p className="text-blue-400">Real-time ALPHA Club statistics and controls</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={testDatabase}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all"
            >
              🧪 Test Database
            </button>
            <button
              onClick={fetchStats}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
            >
              {isLoading ? '⏳' : '🔄'} Refresh
            </button>
          </div>
        </div>
        {lastRefresh && (
          <div className="mt-2 text-xs text-gray-400">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-gradient-to-br from-red-900/30 to-red-800/30 rounded-2xl p-6 border border-red-500/20">
          <h3 className="text-lg font-bold text-red-400 mb-2">❌ Error</h3>
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
            <p className="text-gray-400">Loading admin dashboard...</p>
          </div>
        </div>
      )}

      {/* Stats Display */}
      {stats && (
        <>
          {/* Real-time Statistics */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-500/20">
              <h3 className="text-lg font-bold text-white mb-4">👥 Holders</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Holders:</span>
                  <span className="text-green-400 font-bold">{stats.realTimeStats.totalHolders.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Eligible (≥$10):</span>
                  <span className="text-green-400 font-bold">{stats.realTimeStats.eligibleHolders.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">VIP Members:</span>
                  <span className="text-purple-400 font-bold">{stats.realTimeStats.activeVipSubscriptions.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-2xl p-6 border border-blue-500/20">
              <h3 className="text-lg font-bold text-white mb-4">🎯 Daily Draw</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Entries:</span>
                  <span className="text-blue-400 font-bold text-xl">{stats.realTimeStats.totalEntries.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total USD Value:</span>
                  <span className="text-cyan-400 font-bold">${stats.realTimeStats.totalUsdValue.toLocaleString()}</span>
                </div>
                <button
                  onClick={selectWinner}
                  disabled={stats.realTimeStats.totalEntries === 0}
                  className="w-full mt-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-2 px-4 rounded-lg font-bold transition-all"
                >
                  🎲 Select Winner
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl p-6 border border-purple-500/20">
              <h3 className="text-lg font-bold text-white mb-4">💰 Revenue</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">VIP Revenue:</span>
                  <span className="text-purple-400 font-bold">${stats.realTimeStats.totalVipRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                <span className="text-gray-300">Today&apos;s Activity:</span>
                  <span className="text-pink-400 font-bold">{stats.todayActivity.totalActivity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">New Holders:</span>
                  <span className="text-green-400 font-bold">+{stats.todayActivity.newHolders}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Holders */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">🏆 Top Holders</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left p-2">Wallet</th>
                    <th className="text-right p-2">USD Value</th>
                    <th className="text-right p-2">Entries</th>
                    <th className="text-center p-2">VIP</th>
                    <th className="text-center p-2">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topHolders.map((holder, index) => (
                    <tr key={index} className="border-b border-gray-800">
                      <td className="text-white p-2 font-mono">{holder.wallet}</td>
                      <td className="text-green-400 p-2 text-right font-bold">${holder.usdValue.toLocaleString()}</td>
                      <td className="text-blue-400 p-2 text-right font-bold">{holder.entries.toLocaleString()}</td>
                      <td className="text-purple-400 p-2 text-center">{holder.vipTier}</td>
                      <td className="text-gray-400 p-2 text-center text-xs">{new Date(holder.lastActive).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">📈 Recent Activity</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.recentActivitySample.map((activity, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-800/50 rounded">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm text-gray-300">{activity.wallet}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      activity.type === 'INCREASED_HOLDINGS' ? 'bg-green-600/20 text-green-400' :
                      activity.type === 'REDUCED_HOLDINGS' ? 'bg-red-600/20 text-red-400' :
                      'bg-blue-600/20 text-blue-400'
                    }`}>
                      {activity.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${activity.usdChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {activity.usdChange >= 0 ? '+' : ''}${activity.usdChange.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};