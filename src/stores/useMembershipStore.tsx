// src/stores/useMembershipStore.tsx - Enhanced with VIP integration
import create, { State } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { useAlphaTokenStore } from './useAlphaTokenStore';
// Import the VIP store (make sure this import works)
import { useVipSubscriptionStore, VipTier } from './useVipSubscriptionStore';

export type MembershipTier = 'None' | 'Bronze' | 'Silver' | 'Gold';

interface MembershipStore extends State {
  // Basic membership
  membershipTier: MembershipTier;
  isEligible: boolean;
  baseDailyEntries: number; // Base entries from token holdings
  
  // VIP integration
  vipTier: VipTier;
  vipMultiplier: number;
  totalDailyEntries: number; // Base entries × VIP multiplier
  
  // Legacy field for backward compatibility
  dailyEntries: number; // Same as totalDailyEntries
  
  // Timing
  subscriptionTier: string | null;
  subscriptionMultiplier: number;
  nextDrawTime: Date | null;
  
  // History
  winHistory: Array<{
    date: string;
    amount: number;
    txSignature: string;
    wasVipWin: boolean;
  }>;
  
  // Actions
  getMembershipStatus: (publicKey: PublicKey, connection: Connection) => Promise<void>;
  calculateTier: (tokenBalance: number, usdValue: number) => MembershipTier;
  getNextDrawCountdown: () => number;
}

const useMembershipStore = create<MembershipStore>((set, get) => ({
  membershipTier: 'None',
  isEligible: false,
  baseDailyEntries: 0,
  vipTier: 'None',
  vipMultiplier: 1,
  totalDailyEntries: 0,
  dailyEntries: 0, // Legacy compatibility
  subscriptionTier: null,
  subscriptionMultiplier: 1,
  nextDrawTime: null,
  winHistory: [],

  getMembershipStatus: async (publicKey: PublicKey, connection: Connection) => {
    try {
      console.log('🎯 Getting enhanced membership status...');
      
      // Get token balance from the alpha token store
      const alphaStore = useAlphaTokenStore.getState();
      const { tokenBalance, usdValue } = alphaStore;
      
      console.log('📊 Token data:', { tokenBalance, usdValue });
      
      // Get VIP subscription status
      const vipStore = useVipSubscriptionStore.getState();
      await vipStore.checkSubscriptionStatus(publicKey, connection);
      const { currentSubscription } = vipStore;
      
      console.log('💎 VIP data:', { 
        tier: currentSubscription?.tier || 'None', 
        isActive: currentSubscription?.isActive || false,
        multiplier: currentSubscription?.multiplier || 1
      });
      
      // Calculate basic membership tier from token holdings
      const tier = get().calculateTier(tokenBalance, usdValue);
      const isEligible = tier !== 'None';
      
      // Calculate base daily entries from token holdings
      let baseDailyEntries = 0;
      switch (tier) {
        case 'Bronze':
          baseDailyEntries = 1;
          break;
        case 'Silver':
          baseDailyEntries = 3;
          break;
        case 'Gold':
          baseDailyEntries = 10;
          break;
        default:
          baseDailyEntries = 0;
      }

      // Apply VIP multiplier
      const vipMultiplier = currentSubscription?.isActive ? currentSubscription.multiplier : 1;
      const totalDailyEntries = baseDailyEntries * vipMultiplier;

      // Calculate next draw time (11 AM UTC daily)
      const nextDraw = new Date();
      nextDraw.setUTCHours(11, 0, 0, 0);
      if (nextDraw.getTime() <= Date.now()) {
        nextDraw.setDate(nextDraw.getDate() + 1);
      }

      // Update state with all the calculated values
      set({
        membershipTier: tier,
        isEligible,
        baseDailyEntries,
        vipTier: currentSubscription?.tier || 'None',
        vipMultiplier,
        totalDailyEntries,
        dailyEntries: totalDailyEntries, // Legacy compatibility
        nextDrawTime: nextDraw
      });

      console.log('✅ Enhanced membership status updated:', {
        tier,
        baseDailyEntries,
        vipTier: currentSubscription?.tier || 'None',
        vipMultiplier,
        totalDailyEntries,
        isEligible
      });

      // TODO: Fetch win history from Google Sheets API in Phase 2
      
    } catch (error) {
      console.error('❌ Error getting enhanced membership status:', error);
      set({
        membershipTier: 'None',
        isEligible: false,
        baseDailyEntries: 0,
        vipTier: 'None',
        vipMultiplier: 1,
        totalDailyEntries: 0,
        dailyEntries: 0
      });
    }
  },

  calculateTier: (tokenBalance: number, usdValue: number): MembershipTier => {
    console.log('🧮 Calculating tier for:', { tokenBalance, usdValue });
    
    if (usdValue >= 1000) {
      console.log('👑 Gold tier (≥$1000)');
      return 'Gold';
    }
    if (usdValue >= 100) {
      console.log('🥈 Silver tier (≥$100)');
      return 'Silver';
    }
    if (usdValue >= 10) {
      console.log('🥉 Bronze tier (≥$10)');
      return 'Bronze';
    }
    
    console.log('❌ No tier ($' + usdValue.toFixed(2) + ' < $10)');
    return 'None';
  },

  getNextDrawCountdown: (): number => {
    const { nextDrawTime } = get();
    if (!nextDrawTime) return 0;
    
    const now = Date.now();
    const drawTime = nextDrawTime.getTime();
    return Math.max(0, drawTime - now);
  }
}));

export default useMembershipStore;
export { useMembershipStore };