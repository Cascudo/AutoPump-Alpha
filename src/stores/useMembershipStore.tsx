// src/stores/useMembershipStore.tsx - FIXED: Proper VIP baseline entry handling
import create, { State } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { useVipSubscriptionStore } from './useVipSubscriptionStore';
import { MarketDataService } from '../utils/marketDataService';

export type MembershipDisplayTier = 'None' | 'Gamma' | 'Beta' | 'Alpha';
export type VipBusinessTier = 'None' | 'Silver' | 'Gold' | 'Platinum';

interface MembershipStore extends State {
  // Core membership data
  membershipDisplayTier: MembershipDisplayTier;
  vipTier: VipBusinessTier;
  isEligible: boolean;
  baseDailyEntries: number;
  baselineEntries: number;
  vipMultiplier: number;
  totalDailyEntries: number;
  
  // Extended data
  walletAddress: string;
  tokenBalance: number;
  usdValue: number;
  tokenEntries: number;
  vipBaselineEntries: number;
  vipActive: boolean;
  vipExpiresAt: Date | null;
  
  // Database sync status
  isDbSynced: boolean;
  lastDbUpdate: number;
  rateLimited: boolean;
  isUpdating: boolean;
  nextDrawTime: Date | null;
  
  // State management
  isLoading: boolean;
  error: string | null;
  
  winHistory: Array<{
    date: string;
    amount: number;
    txSignature: string;
    wasVipWin: boolean;
  }>;
  
  // Actions
  getMembershipStatus: (publicKey: PublicKey, connection: Connection) => Promise<void>;
  updateUserBalance: (publicKey: PublicKey, connection: Connection, forceUpdate?: boolean) => Promise<void>;
  calculateDisplayTier: (usdValue: number) => MembershipDisplayTier;
  calculateDailyEntries: (tokenBalance: number, tokenPriceUSD: number, vipBaselineEntries?: number, vipMultiplier?: number) => {
    tokenEntries: number;
    vipBaselineEntries: number;
    totalDailyEntries: number;
    isEligible: boolean;
  };
  refreshBalance: (publicKey: PublicKey, connection: Connection) => Promise<void>;
  getNextDrawCountdown: () => number;
  clearState: () => void;
  clearData: () => void; // 🎯 FIXED: Add clearData method for ContextProvider
}

export const useMembershipStore = create<MembershipStore>((set, get) => ({
  // Initial state
  membershipDisplayTier: 'None',
  vipTier: 'None',
  isEligible: false,
  baseDailyEntries: 0,
  baselineEntries: 0,
  vipMultiplier: 1,
  totalDailyEntries: 0,
  
  walletAddress: '',
  tokenBalance: 0,
  usdValue: 0,
  tokenEntries: 0,
  vipBaselineEntries: 0,
  vipActive: false,
  vipExpiresAt: null,
  
  isDbSynced: false,
  lastDbUpdate: 0,
  rateLimited: false,
  isUpdating: false,
  nextDrawTime: null,
  
  isLoading: false,
  error: null,
  winHistory: [],

  // 🎯 FIXED: Main function with proper VIP baseline entry handling
  getMembershipStatus: async (publicKey: PublicKey, connection: Connection) => {
    if (!publicKey) return;
    
    set({ isLoading: true, error: null });
    
    try {
      const walletAddress = publicKey.toString();
      const now = Date.now();
      
      console.log('🔍 FIXED: Starting membership status check for:', walletAddress.slice(0, 8) + '...');

      // 1. Get real-time token price
      const tokenPriceUSD = await MarketDataService.getTokenPrice();
      if (!tokenPriceUSD || tokenPriceUSD <= 0) {
        throw new Error('Unable to fetch token price');
      }
      
      console.log('💰 Current ALPHA price:', `$${tokenPriceUSD.toFixed(8)}`);

      // 2. Get user's token balance from blockchain
      console.log('🔍 Fetching token balance from blockchain...');
      await get().refreshBalance(publicKey, connection);
      const { tokenBalance } = get();

      // 3. 🎯 FIXED: Get VIP subscription status with proper database lookup
      console.log('👑 Checking VIP subscription status...');
      const vipStore = useVipSubscriptionStore.getState();
      await vipStore.checkSubscriptionStatus(publicKey, connection);
      
      const currentVipSubscription = vipStore.currentSubscription;
      const vipActive = currentVipSubscription?.isActive || false;
      const vipTier = currentVipSubscription?.tier || 'None';
      const vipMultiplier = currentVipSubscription?.multiplier || 1;
      const vipExpiresAt = currentVipSubscription?.expiresAt || null;

      console.log('👑 VIP Status:', { vipActive, vipTier, vipMultiplier });

      // 4. 🎯 FIXED: Get VIP baseline entries from database via API call
      let vipBaselineEntries = 0;
      if (vipActive) {
        try {
          console.log('📊 Fetching VIP baseline entries from database...');
          
          // Call the get-user-subscription API to get baseline entries
          const response = await fetch(`/api/get-user-subscription?walletAddress=${encodeURIComponent(walletAddress)}`);
          const result = await response.json();
          
          if (result.success && result.subscription) {
            vipBaselineEntries = result.subscription.baseline_entries_granted || 0;
            console.log('✅ VIP baseline entries from database:', vipBaselineEntries);
          } else {
            console.warn('⚠️ No subscription data found, using 0 baseline entries');
          }
        } catch (apiError) {
          console.error('❌ Error fetching VIP baseline entries:', apiError);
          // Fallback: calculate based on tier
          const tierBaselineMap = { 'Silver': 2, 'Gold': 3, 'Platinum': 5 };
          vipBaselineEntries = tierBaselineMap[vipTier as keyof typeof tierBaselineMap] || 0;
          console.log('📊 Using fallback baseline entries:', vipBaselineEntries);
        }
      }

      // 5. Calculate USD value and entries
      const usdValue = tokenBalance * tokenPriceUSD;
      const tokenEntries = Math.floor(usdValue / 10); // 1 entry per $10 USD
      const totalDailyEntries = (tokenEntries + vipBaselineEntries) * vipMultiplier;

      // 6. 🎯 FIXED: Proper eligibility calculation
      const tokenEligible = usdValue >= 10; // Has $10+ in tokens
      const vipEligible = vipActive && vipBaselineEntries > 0; // Has active VIP with baseline entries
      const isEligible = tokenEligible || vipEligible; // Either condition makes user eligible

      console.log('🎯 FIXED eligibility calculation:', {
        tokenEligible,
        vipEligible,
        isEligible,
        reasoning: isEligible ? 
          (tokenEligible ? 'Token holdings ≥ $10' : 'Active VIP with baseline entries') :
          'No tokens ≥ $10 and no active VIP'
      });

      // 7. Calculate display tier (separate from VIP tier)
      const membershipDisplayTier = get().calculateDisplayTier(usdValue);

      // 8. Calculate next draw time
      const nextDraw = new Date();
      nextDraw.setUTCHours(11, 0, 0, 0);
      if (nextDraw.getTime() <= Date.now()) {
        nextDraw.setDate(nextDraw.getDate() + 1);
      }

      // 9. 🎯 FIXED: Update database with correct entry calculation
      console.log('💾 Updating database with VIP baseline entries...');
      try {
        const response = await fetch('/api/update-user-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            tokenBalance,
            usdValue,
            tokenPriceUSD,
            vipMultiplier,
            baselineEntries: vipBaselineEntries, // 🎯 FIXED: Pass VIP baseline entries
            forceUpdate: false
          })
        });

        const updateResult = await response.json();
        if (!updateResult.success) {
          console.warn('⚠️ Database update failed:', updateResult.error);
        } else {
          console.log('✅ Database updated successfully');
        }
      } catch (dbError) {
        console.error('❌ Database update error:', dbError);
      }

      // 10. 🎯 FIXED: Update state with correct values
      set({
        walletAddress,
        tokenBalance,
        usdValue,
        membershipDisplayTier,
        vipTier: vipTier as VipBusinessTier,
        isEligible, // 🎯 FIXED: Now true for VIP users even with <$10 tokens
        baseDailyEntries: tokenEntries,
        baselineEntries: vipBaselineEntries, // 🎯 FIXED: VIP baseline entries
        vipMultiplier,
        totalDailyEntries,
        
        tokenEntries,
        vipBaselineEntries, // 🎯 FIXED: VIP baseline entries
        vipActive,
        vipExpiresAt,
        
        isDbSynced: true,
        lastDbUpdate: now,
        rateLimited: false,
        isUpdating: false,
        nextDrawTime: nextDraw,
        isLoading: false,
        error: null
      });

      console.log('✅ FIXED membership status complete:', {
        wallet: walletAddress.slice(0, 8) + '...',
        tokenBalance: tokenBalance.toLocaleString(),
        usdValue: `$${usdValue.toFixed(2)}`,
        displayTier: membershipDisplayTier,
        vipTier,
        tokenEntries,
        vipBaselineEntries, // 🎯 FIXED: Shows VIP baseline entries
        vipMultiplier,
        totalDailyEntries,
        isEligible, // 🎯 FIXED: True for VIP users even with <$10 tokens
        vipActive
      });

    } catch (error) {
      console.error('❌ Error in getMembershipStatus:', error);
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
        isUpdating: false
      });
    }
  },

    // Update user balance with rate limiting
updateUserBalance: async (publicKey: PublicKey, connection: Connection, forceUpdate: boolean = false) => {
  if (get().isUpdating && !forceUpdate) return;
  
  set({ isUpdating: true });
  
  try {
    await get().getMembershipStatus(publicKey, connection);
  } finally {
    set({ isUpdating: false });
  }
},

  // Calculate display tier based on USD value
  calculateDisplayTier: (usdValue: number): MembershipDisplayTier => {
    if (usdValue >= 1000) return 'Alpha';
    if (usdValue >= 100) return 'Beta';
    if (usdValue >= 10) return 'Gamma';
    return 'None';
  },

  // 🎯 FIXED: Calculate daily entries with proper VIP baseline handling
  calculateDailyEntries: (tokenBalance: number, tokenPriceUSD: number, vipBaselineEntries: number = 0, vipMultiplier: number = 1) => {
    const usdValue = tokenBalance * tokenPriceUSD;
    const tokenEntries = Math.floor(usdValue / 10);
    const totalDailyEntries = (tokenEntries + vipBaselineEntries) * vipMultiplier;
    
    // 🎯 FIXED: Eligibility includes VIP baseline entries
    const tokenEligible = usdValue >= 10;
    const vipEligible = vipBaselineEntries > 0;
    const isEligible = tokenEligible || vipEligible;
    
    return {
      tokenEntries,
      vipBaselineEntries,
      totalDailyEntries,
      isEligible
    };
  },

  // 🎯 FIXED: Refresh balance from blockchain using existing working logic
  refreshBalance: async (publicKey: PublicKey, connection: Connection) => {
    try {
      const walletAddress = publicKey.toString();
      console.log('💰 Refreshing ALPHA balance from blockchain...');

      const ALPHA_MINT = new PublicKey('4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump');
      
      // 🎯 FIXED: Use the same working logic from useAlphaTokenStore
      let tokenBalance = 0;
      try {
        console.log('🔍 Querying token accounts for ALPHA mint...');
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { mint: ALPHA_MINT },
          'confirmed'
        );
        
        if (tokenAccounts.value.length > 0) {
          const parsedInfo = tokenAccounts.value[0].account.data.parsed.info;
          tokenBalance = parsedInfo.tokenAmount.uiAmount || 0;
          
          console.log('✅ ALPHA token account found:', {
            balance: tokenBalance.toLocaleString(),
            mint: parsedInfo.mint,
            decimals: parsedInfo.tokenAmount.decimals
          });
        } else {
          console.log('ℹ️ No ALPHA token account found for this wallet');
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch ALPHA balance from blockchain:', error);
      }

      // Update local state with blockchain data
      set({ tokenBalance });

      console.log('✅ Balance refreshed from blockchain:', {
        wallet: walletAddress.slice(0, 8) + '...',
        tokenBalance: tokenBalance.toLocaleString(),
        hasTokens: tokenBalance > 0
      });

    } catch (error) {
      console.error('❌ Error refreshing balance:', error);
      // Don't throw - this is non-critical
    }
  },

  // Get countdown to next draw in milliseconds
  getNextDrawCountdown: (): number => {
    const nextDraw = new Date();
    nextDraw.setUTCHours(11, 0, 0, 0); // 11:00 UTC daily draw
    
    // If today's draw already happened, set for tomorrow
    if (nextDraw.getTime() <= Date.now()) {
      nextDraw.setDate(nextDraw.getDate() + 1);
    }
    
    return Math.max(0, nextDraw.getTime() - Date.now());
  },

  // Clear state
  clearState: () => {
    set({
      membershipDisplayTier: 'None',
      vipTier: 'None',
      isEligible: false,
      baseDailyEntries: 0,
      baselineEntries: 0,
      vipMultiplier: 1,
      totalDailyEntries: 0,
      walletAddress: '',
      tokenBalance: 0,
      usdValue: 0,
      tokenEntries: 0,
      vipBaselineEntries: 0,
      vipActive: false,
      vipExpiresAt: null,
      isDbSynced: false,
      lastDbUpdate: 0,
      rateLimited: false,
      isUpdating: false,
      nextDrawTime: null,
      isLoading: false,
      error: null,
      winHistory: []
    });
  },

  // 🎯 FIXED: Add clearData method for ContextProvider compatibility
  clearData: () => {
    console.log('🗑️ Clearing membership data for wallet disconnect');
    set({
      membershipDisplayTier: 'None',
      vipTier: 'None',
      isEligible: false,
      baseDailyEntries: 0,
      baselineEntries: 0,
      vipMultiplier: 1,
      totalDailyEntries: 0,
      walletAddress: '',
      tokenBalance: 0,
      usdValue: 0,
      tokenEntries: 0,
      vipBaselineEntries: 0,
      vipActive: false,
      vipExpiresAt: null,
      isDbSynced: false,
      lastDbUpdate: 0,
      rateLimited: false,
      isUpdating: false,
      nextDrawTime: null,
      isLoading: false,
      error: null,
      winHistory: []
    });
  }
}));