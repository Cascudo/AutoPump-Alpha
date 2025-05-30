// src/stores/useMembershipStore.tsx
import create, { State } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { useAlphaTokenStore } from './useAlphaTokenStore';

export type MembershipTier = 'None' | 'Bronze' | 'Silver' | 'Gold';

interface MembershipStore extends State {
  membershipTier: MembershipTier;
  isEligible: boolean;
  dailyEntries: number;
  subscriptionTier: string | null;
  subscriptionMultiplier: number;
  totalDailyChances: number;
  nextDrawTime: Date | null;
  winHistory: Array<{
    date: string;
    amount: number;
    txSignature: string;
  }>;
  getMembershipStatus: (publicKey: PublicKey, connection: Connection) => Promise<void>;
  calculateTier: (tokenBalance: number, usdValue: number) => MembershipTier;
  getNextDrawCountdown: () => number;
}

const useMembershipStore = create<MembershipStore>((set, get) => ({
  membershipTier: 'None',
  isEligible: false,
  dailyEntries: 0,
  subscriptionTier: null,
  subscriptionMultiplier: 1,
  totalDailyChances: 0,
  nextDrawTime: null,
  winHistory: [],

  getMembershipStatus: async (publicKey: PublicKey, connection: Connection) => {
    try {
      // Get token balance from the alpha token store
      const alphaStore = useAlphaTokenStore.getState();
      const { tokenBalance, usdValue } = alphaStore;
      
      const tier = get().calculateTier(tokenBalance, usdValue);
      const isEligible = tier !== 'None';
      
      let dailyEntries = 0;
      switch (tier) {
        case 'Bronze':
          dailyEntries = 1;
          break;
        case 'Silver':
          dailyEntries = 3;
          break;
        case 'Gold':
          dailyEntries = 10;
          break;
        default:
          dailyEntries = 0;
      }

      // Calculate next draw time (11 AM UTC daily)
      const nextDraw = new Date();
      nextDraw.setUTCHours(11, 0, 0, 0);
      if (nextDraw.getTime() <= Date.now()) {
        nextDraw.setDate(nextDraw.getDate() + 1);
      }

      // TODO: Fetch subscription status from your backend/contract
      const subscriptionMultiplier = 1; // Default, will be updated based on subscription

      set({
        membershipTier: tier,
        isEligible,
        dailyEntries,
        totalDailyChances: dailyEntries * subscriptionMultiplier,
        nextDrawTime: nextDraw
      });

      // TODO: Fetch win history from Google Sheets API
      // This would be implemented in Phase 2
      
    } catch (error) {
      console.error('Error getting membership status:', error);
      set({
        membershipTier: 'None',
        isEligible: false,
        dailyEntries: 0,
        totalDailyChances: 0
      });
    }
  },

  calculateTier: (tokenBalance: number, usdValue: number): MembershipTier => {
    if (usdValue >= 1000) return 'Gold';
    if (usdValue >= 100) return 'Silver';
    if (usdValue >= 10) return 'Bronze';
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