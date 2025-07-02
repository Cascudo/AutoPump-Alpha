// ===============================================
// ENHANCED giveawayHelpers.ts - MERGED WITH HYBRID PRICING SYSTEM
// Single source of truth for all giveaway utilities
// ===============================================

// ===============================================
// EXISTING INTERFACES (Your original code)
// ===============================================

export interface EntryCalculation {
  holdingEntries: number;
  vipBaselineEntries: number;
  totalFreeEntries: number;
  purchasedEntries: number;
  finalTotalEntries: number;
  vipMultiplier: number;
}

export interface WinningOdds {
  userEntries: number;
  totalEntries: number;
  percentage: number;
  ratio: string;
  tier: 'excellent' | 'good' | 'fair' | 'low';
}

// ===============================================
// NEW INTERFACES (For hybrid pricing system)
// ===============================================

export interface EntryPackage {
  id: number;
  name: string;
  price: number;
  entries: number;
  popular?: boolean;
  discount?: string;
  description?: string;
  pricePerEntry?: number;
}

export interface GiveawayPricing {
  minEntryPrice: number;
  maxEntryPrice: number;
  entriesPerDollar: number;
}

// ===============================================
// EXISTING FUNCTIONS (Your original code - preserved exactly)
// ===============================================

/**
 * Calculate user's entry breakdown for a giveaway
 */
export const calculateUserEntries = (
  userUsdValue: number,
  vipBaselineEntries: number,
  vipMultiplier: number,
  purchasedEntries: number = 0
): EntryCalculation => {
  const holdingEntries = Math.floor(userUsdValue / 10);
  const baseFreeEntries = holdingEntries + vipBaselineEntries;
  const totalFreeEntries = Math.floor(baseFreeEntries * vipMultiplier);
  const finalPurchasedEntries = Math.floor(purchasedEntries * vipMultiplier);
  const finalTotalEntries = totalFreeEntries + finalPurchasedEntries;

  return {
    holdingEntries,
    vipBaselineEntries,
    totalFreeEntries,
    purchasedEntries: finalPurchasedEntries,
    finalTotalEntries,
    vipMultiplier
  };
};

/**
 * Calculate winning odds and tier
 */
export const calculateWinningOdds = (
  userEntries: number,
  totalGiveawayEntries: number
): WinningOdds => {
  if (totalGiveawayEntries === 0 || userEntries === 0) {
    return {
      userEntries: 0,
      totalEntries: totalGiveawayEntries,
      percentage: 0,
      ratio: '0',
      tier: 'low'
    };
  }

  const percentage = (userEntries / totalGiveawayEntries) * 100;
  const ratio = `1 in ${Math.ceil(totalGiveawayEntries / userEntries)}`;
  
  let tier: 'excellent' | 'good' | 'fair' | 'low';
  if (percentage >= 10) tier = 'excellent';
  else if (percentage >= 5) tier = 'good';
  else if (percentage >= 1) tier = 'fair';
  else tier = 'low';

  return {
    userEntries,
    totalEntries: totalGiveawayEntries,
    percentage,
    ratio,
    tier
  };
};

/**
 * Get VIP tier multiplier
 */
export const getVipMultiplier = (vipTier: string): number => {
  switch (vipTier.toLowerCase()) {
    case 'silver':
      return 2;
    case 'gold':
      return 3;
    case 'platinum':
      return 5;
    default:
      return 1;
  }
};

/**
 * Get VIP tier baseline entries
 */
export const getVipBaselineEntries = (vipTier: string): number => {
  switch (vipTier.toLowerCase()) {
    case 'silver':
      return 2;
    case 'gold':
      return 3;
    case 'platinum':
      return 5;
    default:
      return 0;
  }
};

/**
 * Format time remaining until giveaway ends
 */
export const formatTimeRemaining = (endDate: string): string => {
  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const difference = end - now;

  if (difference <= 0) return 'Ended';

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

/**
 * Get urgency level based on time remaining
 */
export const getUrgencyLevel = (endDate: string): 'critical' | 'high' | 'medium' | 'low' => {
  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const difference = end - now;

  if (difference <= 0) return 'critical';
  
  const hours = difference / (1000 * 60 * 60);
  
  if (hours <= 6) return 'critical';
  if (hours <= 24) return 'high';
  if (hours <= 72) return 'medium';
  return 'low';
};

/**
 * Get appropriate emoji for prize type
 */
export const getPrizeEmoji = (title: string): string => {
  const t = title.toLowerCase();
  if (t.includes('macbook') || t.includes('laptop')) return '💻';
  if (t.includes('iphone') || t.includes('phone')) return '📱';
  if (t.includes('ps5') || t.includes('playstation')) return '🎮';
  if (t.includes('xbox')) return '🎮';
  if (t.includes('airpods') || t.includes('headphones')) return '🎧';
  if (t.includes('watch') || t.includes('apple watch')) return '⌚';
  if (t.includes('ipad') || t.includes('tablet')) return '📱';
  if (t.includes('tv') || t.includes('monitor')) return '📺';
  if (t.includes('camera')) return '📷';
  if (t.includes('speaker')) return '🔊';
  return '🎁';
};

/**
 * Format wallet address for display
 */
export const formatWalletAddress = (address: string, chars: number = 4): string => {
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

/**
 * Calculate entry package value
 */
export const calculatePackageValue = (
  baseEntries: number,
  packagePrice: number,
  vipMultiplier: number = 1
): {
  finalEntries: number;
  pricePerEntry: number;
  savings: number;
  bonusPercentage: number;
} => {
  const finalEntries = Math.floor(baseEntries * vipMultiplier);
  const pricePerEntry = packagePrice / finalEntries;
  
  // Calculate savings compared to hypothetical $10 per entry
  const standardPrice = finalEntries * 10;
  const savings = standardPrice - packagePrice;
  const bonusPercentage = savings > 0 ? Math.round((savings / packagePrice) * 100) : 0;

  return {
    finalEntries,
    pricePerEntry,
    savings,
    bonusPercentage
  };
};

/**
 * Get conversion optimization messaging based on user state
 */
export const getConversionMessage = (
  userConnected: boolean,
  userEntries: number,
  totalEntries: number,
  vipTier: string
): {
  message: string;
  cta: string;
  urgency: 'high' | 'medium' | 'low';
} => {
  if (!userConnected) {
    return {
      message: "Connect your wallet to see your FREE entries from ALPHA holdings!",
      cta: "Connect Wallet",
      urgency: 'high'
    };
  }

  if (userEntries === 0) {
    return {
      message: "You need ALPHA tokens or entry purchases to participate!",
      cta: "Buy Entry Package",
      urgency: 'high'
    };
  }

  const odds = calculateWinningOdds(userEntries, totalEntries);
  
  if (odds.tier === 'excellent') {
    return {
      message: "Excellent position! You're in the top tier of participants!",
      cta: "Add More Entries",
      urgency: 'low'
    };
  }

  if (odds.tier === 'good') {
    return {
      message: "Good chances! Consider boosting your position with VIP status.",
      cta: vipTier === 'None' ? "Upgrade to VIP" : "Buy More Entries",
      urgency: 'medium'
    };
  }

  return {
    message: "Increase your winning chances with more entries or VIP status!",
    cta: vipTier === 'None' ? "Upgrade to VIP" : "Buy Entry Package",
    urgency: 'high'
  };
};

// ===============================================
// NEW FUNCTIONS (Hybrid pricing system)
// ===============================================

/**
 * Generate description for packages
 */
const generatePackageDescription = (name: string, entries: number): string => {
  const descriptions: Record<string, string> = {
    'Starter': 'Perfect for first-time participants',
    'Popular': 'Most popular choice - best value',
    'Value': 'Great value with bonus entries',
    'Premium': 'Maximum entries for serious players',
    'Basic': 'Simple entry package',
    'Standard': 'Standard entry option',
    'Pro': 'Professional tier with extras'
  };
  
  return descriptions[name] || `${entries} entries for enhanced chances`;
};

/**
 * HYBRID APPROACH: Use database entry_packages if available, otherwise generate dynamically
 * @param giveaway - Complete giveaway object from database
 * @returns Array of entry packages
 */
export const resolveEntryPackages = (giveaway: any): EntryPackage[] => {
  // PRIORITY 1: Use custom entry_packages from database (your advanced system)
  if (giveaway.entry_packages && Array.isArray(giveaway.entry_packages)) {
    console.log('🎯 Using custom entry_packages from database:', giveaway.title);
    
    return giveaway.entry_packages.map((pkg: any, index: number) => ({
      id: pkg.id || index + 1,
      name: pkg.name || `Package ${index + 1}`,
      price: pkg.price || 9.99,
      entries: pkg.entries || 1,
      popular: pkg.popular || false,
      discount: pkg.discount || undefined,
      description: pkg.description || generatePackageDescription(pkg.name, pkg.entries),
      pricePerEntry: pkg.price / pkg.entries
    }));
  }
  
  // PRIORITY 2: Fallback to dynamic generation (legacy support)
  console.log('⚡ Generating dynamic packages from pricing fields:', giveaway.title);
  const pricing = extractGiveawayPricing(giveaway);
  return generateEntryPackages(pricing);
};

/**
 * Extract pricing from promotional giveaway data (legacy support)
 */
export const extractGiveawayPricing = (giveaway: any): GiveawayPricing => {
  return {
    minEntryPrice: giveaway.min_entry_price || 15,
    maxEntryPrice: giveaway.max_entry_price || 100,
    entriesPerDollar: giveaway.entries_per_dollar || 0.2
  };
};

/**
 * Generate dynamic entry packages from pricing fields (fallback)
 */
export const generateEntryPackages = (pricing: GiveawayPricing): EntryPackage[] => {
  const { minEntryPrice, maxEntryPrice, entriesPerDollar } = pricing;
  
  const packages: EntryPackage[] = [];
  
  // Package 1: Minimum entry (Starter)
  const starterAmount = minEntryPrice;
  const starterEntries = Math.floor(starterAmount * entriesPerDollar);
  packages.push({
    id: 1,
    name: 'Starter Pack',
    price: starterAmount,
    entries: starterEntries,
    popular: false,
    description: 'Perfect for first-time participants',
    pricePerEntry: starterAmount / starterEntries
  });
  
  // Package 2: Popular choice (25% of range)
  const popularAmount = Math.round(minEntryPrice + (maxEntryPrice - minEntryPrice) * 0.25);
  const popularEntries = Math.floor(popularAmount * entriesPerDollar);
  packages.push({
    id: 2,
    name: 'Popular Pack',
    price: popularAmount,
    entries: popularEntries,
    popular: true,
    description: 'Most popular choice - best value',
    pricePerEntry: popularAmount / popularEntries
  });
  
  // Package 3: Power pack (50% of range)
  const powerAmount = Math.round(minEntryPrice + (maxEntryPrice - minEntryPrice) * 0.5);
  const powerEntries = Math.floor(powerAmount * entriesPerDollar * 1.25); // 25% bonus
  packages.push({
    id: 3,
    name: 'Power Pack',
    price: powerAmount,
    entries: powerEntries,
    popular: false,
    discount: '25% Bonus',
    description: 'Extra entries for serious players',
    pricePerEntry: powerAmount / powerEntries
  });
  
  // Package 4: VIP pack (Maximum)
  const vipAmount = maxEntryPrice;
  const vipEntries = Math.floor(vipAmount * entriesPerDollar * 2.5); // 150% bonus
  packages.push({
    id: 4,
    name: 'VIP Pack',
    price: vipAmount,
    entries: vipEntries,
    popular: false,
    discount: '150% Bonus',
    description: 'Maximum entries for maximum chances',
    pricePerEntry: vipAmount / vipEntries
  });
  
  return packages;
};

// ===============================================
// ENHANCED INTEGRATION FUNCTIONS
// ===============================================

/**
 * Calculate complete user entry breakdown with package resolution
 * Combines existing entry calculation with new package system
 */
export const calculateCompleteUserEntries = (
  giveaway: any,
  userUsdValue: number,
  vipTier: string,
  purchasedEntries: number = 0
): EntryCalculation & {
  availablePackages: EntryPackage[];
  recommendedPackage: EntryPackage | null;
} => {
  const vipMultiplier = getVipMultiplier(vipTier);
  const vipBaselineEntries = getVipBaselineEntries(vipTier);
  
  // Get base calculation
  const baseCalculation = calculateUserEntries(
    userUsdValue,
    vipBaselineEntries,
    vipMultiplier,
    purchasedEntries
  );
  
  // Get available packages for this giveaway
  const availablePackages = resolveEntryPackages(giveaway);
  
  // Recommend best value package based on user's current position
  const odds = calculateWinningOdds(baseCalculation.finalTotalEntries, giveaway.total_entries || 100);
  let recommendedPackage: EntryPackage | null = null;
  
  if (odds.tier === 'low' || odds.tier === 'fair') {
    // Recommend popular package for low-tier users
    recommendedPackage = availablePackages.find(pkg => pkg.popular) || availablePackages[1];
  } else if (odds.tier === 'good') {
    // Recommend power package for good-tier users
    recommendedPackage = availablePackages[2] || availablePackages.find(pkg => pkg.discount);
  }
  // Excellent tier users don't need recommendations
  
  return {
    ...baseCalculation,
    availablePackages,
    recommendedPackage
  };
};

/**
 * Get comprehensive giveaway display data
 * Combines all helper functions for complete UI data
 */
export const getGiveawayDisplayData = (
  giveaway: any,
  userUsdValue: number,
  vipTier: string,
  userConnected: boolean,
  purchasedEntries: number = 0
) => {
  const completeEntryData = calculateCompleteUserEntries(
    giveaway,
    userUsdValue,
    vipTier,
    purchasedEntries
  );
  
  const timeRemaining = formatTimeRemaining(giveaway.entry_end_date);
  const urgencyLevel = getUrgencyLevel(giveaway.entry_end_date);
  const prizeEmoji = getPrizeEmoji(giveaway.title);
  const conversionMessage = getConversionMessage(
    userConnected,
    completeEntryData.finalTotalEntries,
    giveaway.total_entries || 0,
    vipTier
  );
  
  return {
    ...completeEntryData,
    timeRemaining,
    urgencyLevel,
    prizeEmoji,
    conversionMessage,
    packageSource: giveaway.entry_packages ? 'custom' : 'dynamic'
  };
};