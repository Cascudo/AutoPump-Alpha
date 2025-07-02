// src/components/SubscriptionRenewalManager.tsx
import { FC, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Subscription {
  id: string;
  tier: 'Silver' | 'Gold' | 'Platinum';
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  auto_renew: boolean;
  payment_amount: number;
  payment_currency: string;
  baseline_entries_granted: number;
}

interface SubscriptionRenewalManagerProps {
  walletAddress: string;
  className?: string;
}

export const SubscriptionRenewalManager: FC<SubscriptionRenewalManagerProps> = ({
  walletAddress,
  className = ''
}) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/get-user-subscription?wallet=${walletAddress}`);
      
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      fetchSubscription();
    }
  }, [walletAddress, fetchSubscription]);

  const toggleAutoRenewal = async () => {
    if (!subscription) return;
    
    try {
      setUpdating(true);
      const response = await fetch('/api/update-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          autoRenew: !subscription.auto_renew
        })
      });

      if (response.ok) {
        setSubscription(prev => prev ? { ...prev, auto_renew: !prev.auto_renew } : null);
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getDaysUntilExpiry = () => {
    if (!subscription) return 0;
    const now = new Date();
    const expiry = new Date(subscription.end_date);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'expired': return 'text-red-400';
      case 'cancelled': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Silver': return 'text-gray-400 bg-gray-700';
      case 'Gold': return 'text-yellow-400 bg-yellow-900';
      case 'Platinum': return 'text-purple-400 bg-purple-900';
      default: return 'text-gray-400 bg-gray-700';
    }
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-4">🎫</div>
          <h3 className="text-xl font-bold text-white mb-2">No Active Subscription</h3>
          <p className="text-gray-400 mb-6">Join VIP Club to get multipliers and exclusive benefits</p>
          <Link 
            href="/vip"
            className="inline-block bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105"
          >
            Get VIP Membership 🚀
          </Link>
        </div>
      </div>
    );
  }

  const daysLeft = getDaysUntilExpiry();
  const isExpiring = daysLeft <= 7;
  const isExpired = daysLeft <= 0;

  return (
    <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700 ${className}`}>
      <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
        <span className="mr-3">👑</span>
        VIP Subscription
      </h3>

      {/* Subscription Status */}
      <div className="bg-black/40 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getTierColor(subscription.tier)}`}>
              {subscription.tier} VIP
            </span>
            <span className={`text-sm font-medium ${getStatusColor(subscription.status)}`}>
              {subscription.status.toUpperCase()}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Expires</div>
            <div className="text-white font-mono text-sm">
              {new Date(subscription.end_date).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Expiry Warning */}
        {!isExpired && isExpiring && (
          <div className="bg-yellow-900/30 border border-yellow-500/20 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400 text-xl">⚠️</span>
              <div>
                <div className="text-yellow-200 font-semibold">
                  Subscription expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                </div>
                <div className="text-yellow-300 text-sm">
                  Renew now to keep your VIP benefits
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expired Notice */}
        {isExpired && (
          <div className="bg-red-900/30 border border-red-500/20 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-red-400 text-xl">🚫</span>
              <div>
                <div className="text-red-200 font-semibold">Subscription Expired</div>
                <div className="text-red-300 text-sm">
                  Your VIP benefits are no longer active
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Days Remaining */}
        {!isExpired && (
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-teal-400 mb-1">
              {daysLeft}
            </div>
            <div className="text-gray-400 text-sm">
              day{daysLeft !== 1 ? 's' : ''} remaining
            </div>
          </div>
        )}

        {/* Benefits Summary */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-gray-400 text-sm">Multiplier</div>
            <div className="text-xl font-bold text-purple-400">
              {subscription.tier === 'Silver' ? '2x' : 
               subscription.tier === 'Gold' ? '3x' : '5x'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-sm">Baseline Entries</div>
            <div className="text-xl font-bold text-teal-400">
              {subscription.baseline_entries_granted}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Renewal Toggle */}
      <div className="bg-black/40 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-semibold mb-1">Auto-Renewal</div>
            <div className="text-gray-400 text-sm">
              {subscription.auto_renew 
                ? 'Subscription will auto-renew before expiry' 
                : 'Manual renewal required'
              }
            </div>
          </div>
          <button
            onClick={toggleAutoRenewal}
            disabled={updating}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              subscription.auto_renew ? 'bg-teal-600' : 'bg-gray-600'
            } ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                subscription.auto_renew ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {(isExpiring || isExpired) && (
          <Link
            href="/vip"
            className="block w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-center py-3 px-4 rounded-xl font-bold transition-all transform hover:scale-105"
          >
            {isExpired ? 'Reactivate VIP' : 'Renew Subscription'} 🚀
          </Link>
        )}
        
        <Link
          href="/vip"
          className="block w-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-center py-3 px-4 rounded-xl font-medium transition-colors"
        >
          Manage Subscription
        </Link>
      </div>

      {/* Payment History Link */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="text-center">
          <div className="text-gray-400 text-xs mb-2">
            Last payment: {subscription.payment_amount} {subscription.payment_currency}
          </div>
          <Link
            href="/dashboard#payment-history"
            className="text-teal-400 hover:text-teal-300 text-sm underline"
          >
            View Payment History
          </Link>
        </div>
      </div>
    </div>
  );
};