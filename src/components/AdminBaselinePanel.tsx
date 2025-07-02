// src/components/AdminBaselinePanel.tsx
import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface BaselineUser {
  wallet_address: string;
  vip_tier: string;
  baseline_entries_accumulated: number;
  months_subscribed: number;
  last_baseline_award: string | null;
  subscription_expiry: string;
}

interface BaselineAdjustment {
  id: string;
  user_wallet: string;
  admin_wallet: string;
  adjustment_amount: number;
  reason: string;
  previous_baseline: number;
  new_baseline: number;
  created_at: string;
}

export const AdminBaselinePanel: React.FC = () => {
  const { publicKey } = useWallet();
  const [users, setUsers] = useState<BaselineUser[]>([]);
  const [adjustments, setAdjustments] = useState<BaselineAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const fetchBaselineStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/manage-baseline-entries');
      const result = await response.json();

      if (result.success) {
        setUsers(result.data.usersWithBaseline || []);
        setAdjustments(result.data.recentAdjustments || []);
      }
    } catch (error) {
      console.error('Error fetching baseline stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustment = async () => {
    if (!selectedUser || !adjustmentAmount || !publicKey) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/admin/manage-baseline-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetWallet: selectedUser,
          adjustmentAmount: parseInt(adjustmentAmount),
          adminWallet: publicKey.toString(),
          reason: reason || 'Manual adjustment'
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Baseline entries adjusted successfully!');
        setSelectedUser('');
        setAdjustmentAmount('');
        setReason('');
        await fetchBaselineStats(); // Refresh data
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error adjusting baseline entries:', error);
      alert('Failed to adjust baseline entries');
    }
  };

  const awardMonthlyEntries = async () => {
    if (!confirm('Award monthly baseline entries to all eligible users?')) {
      return;
    }

    try {
      const response = await fetch('/api/award-monthly-baseline', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        alert(`Successfully awarded entries to ${result.usersAwarded} users (${result.totalEntriesAwarded} total entries)`);
        await fetchBaselineStats(); // Refresh data
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error awarding monthly entries:', error);
      alert('Failed to award monthly entries');
    }
  };

  useEffect(() => {
    fetchBaselineStats();
  }, []);

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Baseline Entry Management</h2>
        <div className="space-x-4">
          <button
            onClick={fetchBaselineStats}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-all"
          >
            🔄 Refresh
          </button>
          <button
            onClick={awardMonthlyEntries}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-all"
          >
            🎯 Award Monthly Entries
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400 mx-auto"></div>
          <span className="text-gray-300 mt-2">Loading...</span>
        </div>
      ) : (
        <>
          {/* Manual Adjustment Form */}
          <div className="bg-black/40 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Manual Baseline Adjustment</h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">User Wallet</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select user...</option>
                  {users.map(user => (
                    <option key={user.wallet_address} value={user.wallet_address}>
                      {user.wallet_address.slice(0, 8)}... ({user.baseline_entries_accumulated} entries)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Adjustment (+/-)</label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="e.g., +5 or -3"
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional reason"
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAdjustment}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm transition-all"
                >
                  Apply Adjustment
                </button>
              </div>
            </div>
          </div>

          {/* Users with Baseline Entries */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Users with Baseline Entries</h3>
            <div className="bg-black/40 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="py-3 px-4 text-gray-400 text-sm">Wallet</th>
                      <th className="py-3 px-4 text-gray-400 text-sm">VIP Tier</th>
                      <th className="py-3 px-4 text-gray-400 text-sm">Baseline Entries</th>
                      <th className="py-3 px-4 text-gray-400 text-sm">Months Subscribed</th>
                      <th className="py-3 px-4 text-gray-400 text-sm">Last Award</th>
                      <th className="py-3 px-4 text-gray-400 text-sm">Subscription Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.wallet_address} className="border-b border-gray-700">
                        <td className="py-3 px-4 text-white text-sm font-mono">
                          {user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-4)}
                        </td>
                        <td className="py-3 px-4 text-white text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.vip_tier === 'Platinum' ? 'bg-purple-600' :
                            user.vip_tier === 'Gold' ? 'bg-yellow-600' :
                            user.vip_tier === 'Silver' ? 'bg-gray-600' : 'bg-gray-800'
                          }`}>
                            {user.vip_tier}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white text-sm font-bold">
                          {user.baseline_entries_accumulated}
                        </td>
                        <td className="py-3 px-4 text-gray-300 text-sm">
                          {user.months_subscribed}
                        </td>
                        <td className="py-3 px-4 text-gray-300 text-sm">
                          {user.last_baseline_award ? new Date(user.last_baseline_award).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(user.subscription_expiry) > new Date() ? (
                            <span className="text-green-400">Active</span>
                          ) : (
                            <span className="text-red-400">Expired</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Adjustments */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Recent Adjustments</h3>
            <div className="bg-black/40 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="py-3 px-4 text-gray-400 text-sm">Date</th>
                      <th className="py-3 px-4 text-gray-400 text-sm">User</th>
                      <th className="py-3 px-4 text-gray-400 text-sm">Admin</th>
                      <th className="py-3 px-4 text-gray-400 text-sm">Adjustment</th>
                      <th className="py-3 px-4 text-gray-400 text-sm">Before → After</th>
                      <th className="py-3 px-4 text-gray-400 text-sm">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustments.slice(0, 10).map(adjustment => (
                      <tr key={adjustment.id} className="border-b border-gray-700">
                        <td className="py-3 px-4 text-gray-300 text-sm">
                          {new Date(adjustment.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-white text-sm font-mono">
                          {adjustment.user_wallet.slice(0, 8)}...
                        </td>
                        <td className="py-3 px-4 text-gray-300 text-sm font-mono">
                          {adjustment.admin_wallet.slice(0, 8)}...
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`font-bold ${
                            adjustment.adjustment_amount > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {adjustment.adjustment_amount > 0 ? '+' : ''}{adjustment.adjustment_amount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300 text-sm">
                          {adjustment.previous_baseline} → {adjustment.new_baseline}
                        </td>
                        <td className="py-3 px-4 text-gray-300 text-sm">
                          {adjustment.reason || 'No reason provided'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};