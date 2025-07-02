// src/utils/membershipCalculator.ts
import { PublicKey } from '@solana/web3.js';

export interface MarketData {
  tokenPriceUSD: number;
  tokenPriceSOL: number;
  solPriceUSD: number;
  marketCapUSD: number;
  totalSupply: number;
  circulatingSupply: number;
  volume24h: number;
  priceChange24h: number;
  lastUpdated: number;
  dataSource: string;
}

export interface MembershipData {
  tokenBalance: number;
  usdValue: number;
  tier: 'None' | 'Bronze' | 'Silver' | 'Gold';
  dailyEntries: number;
  multiplier: number;
  isEligible: boolean;
  nextTierRequirement?: {
    tier: string;
    usdNeeded: number;
    tokensNeeded: number;
  };
}

export interface DashboardData {
  membership: MembershipData;
  market: MarketData;
  portfolio: {
    percentageOfSupply: number;
    percentageOfCirculating: number;
    holderRank?: number;
    averageBuyPrice?: number;
    profitLoss?: number;
  };
  rewards: {
    totalWins: number;
    totalEarned: number;
    winRate: number;
    lastWin?: {
      amount: number;
      date: string;
      txHash: string;
    };
  };
}

export class MembershipCalculator {
  // Tier thresholds in USD
  private static readonly TIER_THRESHOLDS = {
    BRONZE: 10,     // $10+
    SILVER: 100,    // $100+ 
    GOLD: 1000      // $1000+
  };

  // Base daily entries per tier
  private static readonly BASE_ENTRIES = {
    NONE: 0,
    BRONZE: 1,
    SILVER: 3,
    GOLD: 10
  };

  /**
   * Calculate membership tier based on USD value
   */
  static calculateTier(usdValue: number): 'None' | 'Bronze' | 'Silver' | 'Gold' {
    if (usdValue >= this.TIER_THRESHOLDS.GOLD) return 'Gold';
    if (usdValue >= this.TIER_THRESHOLDS.SILVER) return 'Silver';
    if (usdValue >= this.TIER_THRESHOLDS.BRONZE) return 'Bronze';
    return 'None';
  }

  /**
   * Calculate daily entries with progressive scaling
   * More tokens = more entries (with diminishing returns)
   */
  static calculateDailyEntries(usdValue: number, tier: string): number {
    const baseTierEntries = this.BASE_ENTRIES[tier.toUpperCase()] || 0;
    
    if (tier === 'None') return 0;

    // Progressive bonus: extra entries for higher values
    let bonusEntries = 0;
    
    if (tier === 'Gold') {
      // Gold tier: 1 extra entry per $1000 above the minimum (up to 50 total)
      const goldExcess = usdValue - this.TIER_THRESHOLDS.GOLD;
      bonusEntries = Math.min(40, Math.floor(goldExcess / 1000)); // Max 40 bonus = 50 total
    } else if (tier === 'Silver') {
      // Silver tier: 1 extra entry per $100 above the minimum (up to 7 total)
      const silverExcess = usdValue - this.TIER_THRESHOLDS.SILVER;
      bonusEntries = Math.min(4, Math.floor(silverExcess / 100)); // Max 4 bonus = 7 total
    } else if (tier === 'Bronze') {
      // Bronze tier: 1 extra entry per $50 above the minimum (up to 3 total)
      const bronzeExcess = usdValue - this.TIER_THRESHOLDS.BRONZE;
      bonusEntries = Math.min(2, Math.floor(bronzeExcess / 50)); // Max 2 bonus = 3 total
    }

    return baseTierEntries + bonusEntries;
  }

  /**
   * Calculate next tier requirements
   */
  static getNextTierRequirement(currentTier: string, tokenPriceUSD: number): {
    tier: string;
    usdNeeded: number;
    tokensNeeded: number;
  } | null {
    const nextTiers = {
      'None': { tier: 'Bronze', threshold: this.TIER_THRESHOLDS.BRONZE },
      'Bronze': { tier: 'Silver', threshold: this.TIER_THRESHOLDS.SILVER },
      'Silver': { tier: 'Gold', threshold: this.TIER_THRESHOLDS.GOLD },
      'Gold': null
    };

    const next = nextTiers[currentTier];
    if (!next || tokenPriceUSD <= 0) return null;

    return {
      tier: next.tier,
      usdNeeded: next.threshold,
      tokensNeeded: Math.ceil(next.threshold / tokenPriceUSD)
    };
  }

  /**
   * Get tier benefits description
   */
  static getTierBenefits(tier: string): string[] {
    const benefits = {
      'None': [
        'Hold $10+ worth of $ALPHA tokens to unlock daily rewards',
        'Join the community for updates and announcements'
      ],
      'Bronze': [
        '1-3 daily reward entries (based on holdings)',
        'Member support access',
        'Community announcements',
        'Exclusive member badge'
      ],
      'Silver': [
        '3-7 daily reward entries (based on holdings)',
        'Priority member support',
        'Early access to features',
        'Silver member badge',
        'Enhanced community access'
      ],
      'Gold': [
        '10-50 daily reward entries (based on holdings)',
        'VIP support with direct access',
        'Exclusive Gold events',
        'Gold member badge',
        'Maximum reward chances',
        'Special recognition in community'
      ]
    };

    return benefits[tier] || benefits['None'];
  }

  /**
   * Format tier display with emoji
   */
  static formatTierDisplay(tier: string): { name: string; emoji: string; color: string } {
    const displays = {
      'None': { name: 'Not a Member', emoji: '⭕', color: 'text-gray-400' },
      'Bronze': { name: 'Bronze Member', emoji: '🥉', color: 'text-orange-400' },
      'Silver': { name: 'Silver Member', emoji: '🥈', color: 'text-gray-300' },
      'Gold': { name: 'Gold Member', emoji: '👑', color: 'text-yellow-400' }
    };

    return displays[tier] || displays['None'];
  }

  /**
   * Calculate win probability (rough estimate)
   */
  static calculateWinProbability(userEntries: number, estimatedTotalEntries: number): number {
    if (userEntries === 0 || estimatedTotalEntries === 0) return 0;
    return Math.min(100, (userEntries / estimatedTotalEntries) * 100);
  }

  /**
   * Generate membership summary for display
   */
  static generateMembershipSummary(membershipData: MembershipData): string {
    const { tier, dailyEntries, usdValue } = membershipData;
    
    if (tier === 'None') {
      return `Hold $${this.TIER_THRESHOLDS.BRONZE}+ worth of $ALPHA to become a Bronze member and unlock daily rewards.`;
    }

    return `As a ${tier} member with $${usdValue.toFixed(2)} in holdings, you get ${dailyEntries} daily entries in the reward draw.`;
  }
}