// src/stores/useVipSubscriptionStore.tsx
import create, { State } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';

export type VipTier = 'None' | 'VIP Bronze' | 'VIP Silver' | 'VIP Diamond';

export interface VipSubscription {
  tier: VipTier;
  multiplier: number;
  price: number;
  features: string[];
  isActive: boolean;
  expiresAt: Date | null;
  renewsAt: Date | null;
}

interface VipSubscriptionStore extends State {
  currentSubscription: VipSubscription | null;
  isLoading: boolean;
  lastChecked: number;
  
  // Subscription tiers
  availableTiers: Record<VipTier, VipSubscription>;
  
  // Actions
  checkSubscriptionStatus: (publicKey: PublicKey, connection: Connection) => Promise<void>;
  calculateTotalMultiplier: (baseDailyEntries: number) => number;
  getTotalDailyChances: (baseDailyEntries: number) => number;
  initiateSubscription: (tier: VipTier) => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
}

const useVipSubscriptionStore = create<VipSubscriptionStore>((set, get) => ({
  currentSubscription: null,
  isLoading: false,
  lastChecked: 0,

  // Define available VIP tiers
  availableTiers: {
    'None': {
      tier: 'None',
      multiplier: 1,
      price: 0,
      features: [],
      isActive: false,
      expiresAt: null,
      renewsAt: null
    },
    'VIP Bronze': {
      tier: 'VIP Bronze',
      multiplier: 3,
      price: 19,
      features: [
        '3x daily chances',
        'Priority support',
        'Member badge',
        'Early notifications',
        'Exclusive chat access'
      ],
      isActive: false,
      expiresAt: null,
      renewsAt: null
    },
    'VIP Silver': {
      tier: 'VIP Silver',
      multiplier: 5,
      price: 29,
      features: [
        '5x daily chances',
        'Exclusive chat access',
        'Monthly bonus draw',
        'Premium support',
        'Custom profile',
        'Early feature access'
      ],
      isActive: false,
      expiresAt: null,
      renewsAt: null
    },
    'VIP Diamond': {
      tier: 'VIP Diamond',
      multiplier: 10,
      price: 39,
      features: [
        '10x daily chances',
        'Direct dev access',
        'Weekly guaranteed rewards',
        'Exclusive events',
        'Custom rewards',
        'VIP-only draws',
        'Priority customer success'
      ],
      isActive: false,
      expiresAt: null,
      renewsAt: null
    }
  },

  checkSubscriptionStatus: async (publicKey: PublicKey, connection: Connection) => {
    set({ isLoading: true });
    
    try {
      console.log('💎 Checking VIP subscription status for:', publicKey.toString().slice(0, 8) + '...');
      
      // TODO: Query your database/API for subscription status
      // For now, simulate checking subscription status
      
      // In production, this would be:
      // const response = await fetch(`/api/subscriptions/status?walletAddress=${publicKey.toString()}`);
      // const data = await response.json();
      
      // For now, return no active subscription
      const mockSubscription: VipSubscription = {
        tier: 'None',
        multiplier: 1,
        price: 0,
        features: [],
        isActive: false,
        expiresAt: null,
        renewsAt: null
      };

      set({
        currentSubscription: mockSubscription,
        lastChecked: Date.now(),
        isLoading: false
      });

      console.log('✅ VIP subscription status checked - No active subscription');
      
    } catch (error) {
      console.error('❌ Error checking VIP subscription:', error);
      set({
        currentSubscription: get().availableTiers['None'],
        isLoading: false
      });
    }
  },

  calculateTotalMultiplier: (baseDailyEntries: number): number => {
    const { currentSubscription } = get();
    if (!currentSubscription?.isActive) return 1;
    return currentSubscription.multiplier;
  },

  getTotalDailyChances: (baseDailyEntries: number): number => {
    const multiplier = get().calculateTotalMultiplier(baseDailyEntries);
    return baseDailyEntries * multiplier;
  },

  initiateSubscription: async (tier: VipTier): Promise<boolean> => {
    try {
      console.log(`🚀 Initiating ${tier} subscription...`);
      
      // TODO: Implement Solana Pay integration
      // For development, simulate successful subscription
      const { availableTiers } = get();
      const selectedTier = availableTiers[tier];
      
      if (!selectedTier) {
        throw new Error('Invalid subscription tier');
      }

      // Simulate subscription activation
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const activatedSubscription: VipSubscription = {
        ...selectedTier,
        isActive: true,
        expiresAt,
        renewsAt: expiresAt
      };

      set({ currentSubscription: activatedSubscription });
      
      console.log(`✅ ${tier} subscription activated (simulated)`);
      return true;
      
    } catch (error) {
      console.error('❌ Error initiating subscription:', error);
      return false;
    }
  },

  cancelSubscription: async (): Promise<boolean> => {
    try {
      set({
        currentSubscription: get().availableTiers['None']
      });
      
      console.log('✅ Subscription cancelled');
      return true;
      
    } catch (error) {
      console.error('❌ Error cancelling subscription:', error);
      return false;
    }
  }
}));

export default useVipSubscriptionStore;
export { useVipSubscriptionStore };