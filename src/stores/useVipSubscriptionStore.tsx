// src/stores/useVipSubscriptionStore.tsx - Enhanced Final Version with Secure API Integration
import create, { State } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { DatabaseService } from '../utils/databaseService';

export type VipTier = 'None' | 'VIP Bronze' | 'VIP Silver' | 'VIP Diamond' | 'Silver' | 'Gold' | 'Platinum';

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
  
  // Database sync status
  isDbSynced: boolean;
  dbSubscriptionId: string | null;
  
  // Available subscription tiers
  availableTiers: Record<VipTier, VipSubscription>;
  
  // Actions
  checkSubscriptionStatus: (publicKey: PublicKey, connection: Connection) => Promise<void>;
  calculateTotalMultiplier: (baseDailyEntries: number) => number;
  getTotalDailyChances: (baseDailyEntries: number) => number;
  initiateSubscription: (tier: VipTier) => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
  
  // Database operations
  createDatabaseSubscription: (
    publicKey: PublicKey, 
    tier: 'Silver' | 'Gold' | 'Platinum',
    paymentTx: string,
    paymentAmount: number,
    paymentCurrency: string
  ) => Promise<boolean>;
}

const useVipSubscriptionStore = create<VipSubscriptionStore>((set, get) => ({
  currentSubscription: null,
  isLoading: false,
  lastChecked: 0,
  isDbSynced: false,
  dbSubscriptionId: null,

  // VIP tiers with exciting multipliers for dynamic entry system
  availableTiers: {
    'None': {
      tier: 'None',
      multiplier: 1,
      price: 0,
      features: ['Standard daily chances', 'Community access'],
      isActive: false,
      expiresAt: null,
      renewsAt: null
    },
    'VIP Bronze': {
      tier: 'VIP Bronze',
      multiplier: 2,
      price: 9.9,
      features: [
        '2x daily chances multiplier',
        'Priority support',
        'VIP member badge',
        'Early notifications',
        'Exclusive chat access'
      ],
      isActive: false,
      expiresAt: null,
      renewsAt: null
    },
    'VIP Silver': {
      tier: 'VIP Silver',
      multiplier: 3,
      price: 19.9,
      features: [
        '3x daily chances multiplier',
        'Exclusive VIP events',
        'Monthly bonus draws',
        'Premium support',
        'Custom profile features',
        'Early feature access'
      ],
      isActive: false,
      expiresAt: null,
      renewsAt: null
    },
    'VIP Diamond': {
      tier: 'VIP Diamond',
      multiplier: 5,
      price: 29.9,
      features: [
        '5x daily chances multiplier',
        'Direct developer access',
        'Weekly guaranteed rewards',
        'Exclusive Diamond events',
        'VIP-only special draws',
        'Maximum reward potential',
        'Priority everything'
      ],
      isActive: false,
      expiresAt: null,
      renewsAt: null
    },
    // Database-compatible tiers (same as UI tiers but cleaner names)
    'Silver': {
      tier: 'Silver',
      multiplier: 2,
      price: 9.9,
      features: [
        '2x daily chances multiplier',
        'Priority support',
        'VIP member badge',
        'Early notifications'
      ],
      isActive: false,
      expiresAt: null,
      renewsAt: null
    },
    'Gold': {
      tier: 'Gold',
      multiplier: 3,
      price: 19.9,
      features: [
        '3x daily chances multiplier',
        'Exclusive VIP access',
        'Premium support',
        'Monthly bonus draws'
      ],
      isActive: false,
      expiresAt: null,
      renewsAt: null
    },
    'Platinum': {
      tier: 'Platinum',
      multiplier: 5,
      price: 29.9,
      features: [
        '5x daily chances multiplier',
        'Maximum reward potential',
        'Direct developer access',
        'Weekly guaranteed rewards'
      ],
      isActive: false,
      expiresAt: null,
      renewsAt: null
    }
  },

  // UPDATED: Secure API-based subscription checking
  checkSubscriptionStatus: async (publicKey: PublicKey, connection: Connection) => {
    set({ isLoading: true });
    
    try {
      console.log('💎 Checking VIP subscription via secure API:', publicKey.toString().slice(0, 8) + '...');
      
      const walletAddress = publicKey.toString();
      
      // Call secure API endpoint with error handling
      const response = await fetch(`/api/get-user-subscription?walletAddress=${encodeURIComponent(walletAddress)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status === 400) {
          throw new Error('Invalid wallet address format.');
        } else {
          throw new Error(`API request failed with status ${response.status}`);
        }
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch subscription data');
      }
      
      const dbSubscription = result.subscription;
      
      if (dbSubscription) {
        const uiTier = dbSubscription.tier; // 'Silver', 'Gold', 'Platinum'
        const tierConfig = get().availableTiers[uiTier];
        
        if (!tierConfig) {
          throw new Error(`Unknown subscription tier: ${uiTier}`);
        }
        
        // Validate subscription is still active
        const expiryDate = new Date(dbSubscription.end_date);
        const isStillActive = expiryDate > new Date();
        
        if (!isStillActive) {
          console.log('⚠️ Subscription found but expired:', expiryDate.toLocaleDateString());
          // Treat as no subscription
          set({
            currentSubscription: get().availableTiers['None'],
            isDbSynced: true,
            dbSubscriptionId: null,
            lastChecked: Date.now(),
            isLoading: false
          });
          return;
        }
        
        const subscription: VipSubscription = {
          tier: uiTier,
          multiplier: tierConfig.multiplier,
          price: tierConfig.price,
          features: tierConfig.features,
          isActive: true,
          expiresAt: expiryDate,
          renewsAt: expiryDate
        };

        set({
          currentSubscription: subscription,
          isDbSynced: true,
          dbSubscriptionId: dbSubscription.id,
          lastChecked: Date.now(),
          isLoading: false
        });

        console.log('✅ Active VIP subscription loaded:', {
          tier: uiTier,
          multiplier: subscription.multiplier,
          expires: subscription.expiresAt?.toLocaleDateString(),
          cached: result.cached
        });
        
      } else {
        // No active subscription found
        set({
          currentSubscription: get().availableTiers['None'],
          isDbSynced: true,
          dbSubscriptionId: null,
          lastChecked: Date.now(),
          isLoading: false
        });

        console.log('ℹ️ No active VIP subscription found');
      }
      
    } catch (error) {
      console.error('❌ Error checking VIP subscription:', error);
      
      // Set error state but don't completely fail
      set({
        currentSubscription: get().availableTiers['None'],
        isDbSynced: false,
        isLoading: false
      });
      
      // Optional: Show user-friendly error notification
      // You could integrate with your notification system here
    }
  },

  calculateTotalMultiplier: (baseDailyEntries: number): number => {
    const { currentSubscription } = get();
    return currentSubscription?.isActive ? currentSubscription.multiplier : 1;
  },

  getTotalDailyChances: (baseDailyEntries: number): number => {
    const multiplier = get().calculateTotalMultiplier(baseDailyEntries);
    return baseDailyEntries * multiplier;
  },

  createDatabaseSubscription: async (
    publicKey: PublicKey,
    tier: 'Silver' | 'Gold' | 'Platinum',
    paymentTx: string,
    paymentAmount: number,
    paymentCurrency: string
  ): Promise<boolean> => {
    try {
      const walletAddress = publicKey.toString();
      
      console.log('💳 Creating VIP subscription:', {
        wallet: walletAddress.slice(0, 8) + '...',
        tier,
        amount: paymentAmount,
        currency: paymentCurrency
      });

      const subscription = await DatabaseService.createSubscription(
        walletAddress,
        tier,
        paymentTx,
        paymentAmount,
        paymentCurrency,
        30 // 30 days duration
      );

      if (subscription) {
        const tierConfig = get().availableTiers[tier];
        const activeSubscription: VipSubscription = {
          tier,
          multiplier: tierConfig.multiplier,
          price: tierConfig.price,
          features: tierConfig.features,
          isActive: true,
          expiresAt: new Date(subscription.expires_at),
renewsAt: new Date(subscription.expires_at)
        };

        set({
          currentSubscription: activeSubscription,
          isDbSynced: true,
          dbSubscriptionId: subscription.id
        });

        console.log('✅ VIP subscription created:', tier);
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Error creating VIP subscription:', error);
      return false;
    }
  },

  initiateSubscription: async (tier: VipTier): Promise<boolean> => {
    try {
      console.log(`🚀 Initiating ${tier} subscription...`);
      
      // TODO: Implement Solana Pay integration here
      // This is where payment processing will happen
      
      const { availableTiers } = get();
      const selectedTier = availableTiers[tier];
      
      if (!selectedTier || tier === 'None') {
        throw new Error('Invalid subscription tier');
      }

      // For now, simulate successful subscription (development mode)
      console.log('🔄 Simulating payment for development...');
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const activatedSubscription: VipSubscription = {
        ...selectedTier,
        isActive: true,
        expiresAt,
        renewsAt: expiresAt
      };

      set({ 
        currentSubscription: activatedSubscription,
        isDbSynced: false // Will sync when Solana Pay is implemented
      });
      
      console.log(`✅ ${tier} subscription activated (simulated)`);
      return true;
      
    } catch (error) {
      console.error('❌ Error initiating subscription:', error);
      return false;
    }
  },

  cancelSubscription: async (): Promise<boolean> => {
    try {
      // TODO: Implement cancellation in database
      set({
        currentSubscription: get().availableTiers['None'],
        isDbSynced: false,
        dbSubscriptionId: null
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