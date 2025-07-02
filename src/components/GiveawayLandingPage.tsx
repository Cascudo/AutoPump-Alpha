// src/components/GiveawayLandingPage.tsx
// FIXED: All useEffect dependencies, unescaped entities, and image optimization
import { FC, useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Image from 'next/image';
import { useMembershipStore } from '../stores/useMembershipStore';
import { useVipSubscriptionStore } from '../stores/useVipSubscriptionStore';
import useNotificationStore from '../stores/useNotificationStore';
import { notify } from '../utils/notifications';
import { GiveawayHero } from './GiveawayHero';
import { GiveawayStats } from './GiveawayStats';
import { EntryPurchaseSection } from './EntryPurchaseSection';
import { GiveawayCountdown } from './GiveawayCountdown';
import { RecentWinners } from './RecentWinners';
import { VipUpgradeFlow } from './VipUpgradeFlow';

interface GiveawayLandingPageProps {
  giveaway: any;
}

// FOMO notifications with crypto-friendly cities
const fomoNotifications = [
  "Someone in Dubai bought 10 entries", "Someone in New York bought 3 entries", 
  "Someone in London bought 3 entries", "Someone in Singapore bought 1 entries",
  "Someone in Tokyo bought 10 entries", "Someone in Miami bought 3 entries",
  "Someone in Berlin bought 1 entries", "Someone in Hong Kong bought 10 entries",
  "Someone in Los Angeles bought 3 entries", "Someone in Paris bought 3 entries",
  "Someone in Sydney bought 10 entries", "Someone in Toronto bought 1 entries",
  "Someone in Seoul bought 3 entries", "Someone in Amsterdam bought 3 entries",
  "Someone in Barcelona bought 3 entries", "Someone in Tel Aviv bought 1 entries",
  "Someone in Austin bought 10 entries", "Someone in Zurich bought 3 entries",
  "Someone in Stockholm bought 1 entries", "Someone near you bought 10 entries"
];

export const GiveawayLandingPage: FC<GiveawayLandingPageProps> = ({ giveaway }) => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  // Use existing stores properly (enhanced from current architecture)
  const {
    walletAddress,
    tokenBalance,
    usdValue,
    tokenEntries,
    vipBaselineEntries,
    vipMultiplier,
    totalDailyEntries,
    vipTier,
    vipActive,
    isEligible,
    isLoading,
    error,
    getMembershipStatus,
    updateUserBalance
  } = useMembershipStore();

  // Component state
  const [userEntries, setUserEntries] = useState<any>(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [balanceRefreshed, setBalanceRefreshed] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fomoNotification, setFomoNotification] = useState<string | null>(null);
  const [showFomo, setShowFomo] = useState(false);
  const [showVipFlow, setShowVipFlow] = useState(false);

  // Get carousel images from giveaway data with proper fallbacks
  const carouselImages = giveaway?.prize_images?.length > 0 
    ? giveaway.prize_images 
    : [
        'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=1200&h=600&fit=crop',
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&h=600&fit=crop',
        'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1200&h=600&fit=crop'
      ];

  // Carousel auto-advance
  useEffect(() => {
    if (carouselImages.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [carouselImages.length]);

  // FOMO notifications system
  useEffect(() => {
    const showFomoNotification = () => {
      const randomNotification = fomoNotifications[Math.floor(Math.random() * fomoNotifications.length)];
      setFomoNotification(randomNotification);
      setShowFomo(true);
      
      setTimeout(() => {
        setShowFomo(false);
        setTimeout(() => setFomoNotification(null), 500);
      }, 4000);
    };

    const interval = setInterval(showFomoNotification, Math.random() * 15000 + 15000); // 15-30s
    return () => clearInterval(interval);
  }, []);

  // FIXED: Use callback to avoid dependency warning
  const refreshUserData = useCallback(async () => {
    if (!publicKey || !connection) return;

    try {
      setLoadingEntries(true);
      
      console.log('🔍 Step 1: Getting membership status...');
      // This triggers the complete balance refresh from blockchain
      await getMembershipStatus(publicKey, connection);
      
      console.log('🔍 Step 2: Force updating user balance in database...');
      // Force update the database with latest balance
      const response = await fetch('/api/update-user-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          forceUpdate: true,
          skipBlockchainUpdates: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Balance updated in database:', data.data);
        
        notify({
          type: 'success',
          message: 'Balance Refreshed!',
          description: `Updated: ${data.data?.tokenBalance?.toLocaleString()} ALPHA tokens`
        });
      }

      setBalanceRefreshed(true);

    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
      notify({
        type: 'error',
        message: 'Refresh Failed',
        description: 'Unable to refresh balance. Please try again.'
      });
    } finally {
      setLoadingEntries(false);
    }
  }, [publicKey, connection, getMembershipStatus]);

  // FIXED: Use callback to avoid dependency warning
  const fetchUserGiveawayEntries = useCallback(async () => {
    if (!publicKey || !giveaway?.id) return;

    try {
      console.log('🎯 Fetching user giveaway entries...');
      const response = await fetch(`/api/promotional-giveaways/${giveaway.id}/my-entries`, {
        headers: { 
          'x-wallet-address': publicKey.toString() 
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserEntries(data.entries);
        console.log('✅ User giveaway entries:', data.entries);
      }
    } catch (error) {
      console.error('❌ Error fetching user entries:', error);
    }
  }, [publicKey, giveaway?.id]);

  // FIXED: Use callbacks to avoid dependency warnings
  const getUserAutoEntries = useCallback(() => {
    if (!connected || !isEligible) return 0;
    
    // For promotional giveaways, users get entries from holdings + VIP baseline, multiplied by VIP tier
    const holdingEntries = Math.floor(usdValue / 10);
    const totalFreeEntries = (holdingEntries + vipBaselineEntries) * vipMultiplier;
    
    return totalFreeEntries;
  }, [connected, isEligible, usdValue, vipBaselineEntries, vipMultiplier]);

  const getUserTotalEntries = useCallback(() => {
    // Priority 1: Use database final_entries if available (already includes auto + purchased)
    if (userEntries?.final_entries) {
      return userEntries.final_entries;
    }
    
    // Priority 2: Use auto entries only (no database data means no purchases yet)
    return getUserAutoEntries();
  }, [userEntries, getUserAutoEntries]);

  // Enhanced balance refresh system (from existing architecture)
  useEffect(() => {
    if (publicKey && connected && !balanceRefreshed) {
      console.log('🔄 Wallet connected - refreshing balance and membership status...');
      refreshUserData();
    }
  }, [publicKey, connected, balanceRefreshed, refreshUserData]);

  // Fetch user's giveaway entries when wallet connects (from existing)
  useEffect(() => {
    if (publicKey && giveaway?.id && balanceRefreshed) {
      fetchUserGiveawayEntries();
    }
  }, [publicKey, giveaway?.id, balanceRefreshed, fetchUserGiveawayEntries]);

  // 🎯 DEBUG: Add temporary logging to troubleshoot calculations
  useEffect(() => {
    if (userEntries) {
      console.log('🔍 GiveawayLandingPage Debug:', {
        userEntries,
        autoEntries: getUserAutoEntries(),
        totalEntries: getUserTotalEntries(),
        breakdown: {
          final_entries: userEntries.final_entries,
          base_entries: userEntries.base_entries,
          purchased_entries: userEntries.purchased_entries
        }
      });
    }
  }, [userEntries, getUserAutoEntries, getUserTotalEntries]);

  // Handle entry purchase completion (from existing)
  const handleEntryPurchased = () => {
    console.log('🎯 Entry purchase completed - refreshing data...');
    refreshUserData();
    fetchUserGiveawayEntries();
  };

  // Enhanced connect wallet handler
  const handleConnectWallet = () => {
    setVisible(true);
  };

  // VIP upgrade handler
  const handleUpgradeVip = () => {
    setShowVipFlow(true);
  };

  // Check if user is already VIP
  const isVipMember = vipTier && vipTier !== 'None';

  // FIXED: Handle inactive giveaway status (from existing)
  if (giveaway.status !== 'active') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-8">⏰</div>
          <h1 className="text-4xl font-bold text-white mb-4">Giveaway Ended</h1>
          <p className="text-xl text-gray-300">
            This giveaway has ended. Check back for new giveaways!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      
      {/* FOMO Notification */}
      {fomoNotification && (
        <div className={`fixed top-20 right-4 z-50 bg-gradient-to-r from-green-600 to-teal-600 text-white p-4 rounded-xl border border-green-500/30 shadow-lg transform transition-all duration-500 ${
          showFomo ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🔥</div>
            <div>
              <div className="font-bold text-sm">{fomoNotification}</div>
              <div className="text-green-100 text-xs">Just now</div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Hero Carousel Section */}
      <section className="relative">
        <div className={`relative overflow-hidden transition-all duration-500 ${
          connected ? 'h-[500px] sm:h-[600px] md:h-[700px]' : 'h-80 sm:h-96 md:h-[500px]'
        }`}>
          {carouselImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="relative w-full h-full">
                <Image
                  src={image}
                  alt={`${giveaway?.title} - Image ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.fallbackAttempted) {
                      target.dataset.fallbackAttempted = 'true';
                      target.src = 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=1200&h=600&fit=crop';
                    }
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            </div>
          ))}
          
          {/* Carousel Controls */}
          {carouselImages.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImageIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length)}
                className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-all text-sm sm:text-base"
              >
                ←
              </button>
              <button
                onClick={() => setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length)}
                className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-all text-sm sm:text-base"
              >
                →
              </button>
              
              {/* Carousel Indicators */}
              <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1 sm:space-x-2">
                {carouselImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                      index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
          
          {/* Enhanced Hero Content Overlay - MOBILE OPTIMIZED */}
          <div className="absolute inset-0 flex items-center justify-center px-2 sm:px-4">
            <div className="max-w-6xl mx-auto w-full">
              <div className="text-center">
                <h1 className="text-2xl sm:text-4xl md:text-6xl font-black text-white mb-4 sm:mb-6">
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                    {giveaway?.title || 'Win Amazing Prize!'}
                  </span>
                </h1>
                
                {giveaway?.prize_value && (
                  <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl sm:rounded-2xl p-3 sm:p-6 mb-4 sm:mb-8 border border-yellow-400/50 inline-block">
                    <div className="text-lg sm:text-2xl md:text-3xl font-black text-white mb-1 sm:mb-2">
                      Choose Prize or ${giveaway.prize_value.toLocaleString()} Cash
                    </div>
                    <div className="text-yellow-100 font-semibold tracking-wide text-xs sm:text-sm">
                      Winner&apos;s Choice - Prize or Cash Equivalent
                    </div>
                  </div>
                )}
                
                <div className="text-sm sm:text-xl text-gray-200 mb-4 sm:mb-8 max-w-3xl mx-auto bg-black/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-white/20">
                  <div className="text-white font-bold text-lg sm:text-2xl mb-2 sm:mb-3">
                    Hold $ALPHA tokens and you&apos;re automatically entered!
                  </div>
                  <div className="text-yellow-400 font-semibold text-sm sm:text-lg">
                    The best Solana token for passive rewards.
                  </div>
                </div>

                {!connected ? (
                  <button
                    onClick={handleConnectWallet}
                    className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-base sm:text-xl py-3 sm:py-4 px-6 sm:px-12 rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl w-full sm:w-auto"
                  >
                    Connect Wallet to Enter
                  </button>
                ) : (
                  <div className="space-y-3 sm:space-y-4 max-w-2xl mx-auto">
                    {/* 🎯 ISSUE 1 FIX: Enhanced hero section with purchase display */}
                    <div className="bg-gradient-to-r from-green-900/80 to-teal-900/80 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border-2 border-green-500/50 shadow-2xl">
                      <div className="text-green-300 font-bold text-sm sm:text-lg">
                        ✅ You&apos;re Automatically Entered!
                      </div>
                      <div className="text-white text-sm sm:text-lg mt-1 font-semibold">
                        {getUserAutoEntries()} entries from holding ALPHA
                        {userEntries && userEntries.purchased_entries > 0 && (
                          <span className="text-yellow-400">
                            {" + " + userEntries.purchased_entries + " purchased"}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-300 text-xs sm:text-sm mt-1">
                        Total: {getUserTotalEntries()} entries
                      </div>
                      {isVipMember && (
                        <div className="text-purple-300 text-xs sm:text-sm mt-1 font-medium">
                          ⭐ {vipTier} VIP: {vipMultiplier}x Multiplier Active
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 sm:gap-3 justify-center">
                      <button
                        onClick={() => document.getElementById('entry-purchase')?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-sm sm:text-lg py-2 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl border-2 border-purple-400/30"
                      >
                        Buy More Entries
                      </button>
                      
                      {!isVipMember ? (
                        <button
                          onClick={handleUpgradeVip}
                          className="bg-gradient-to-r from-yellow-700 to-orange-700 hover:from-yellow-600 hover:to-orange-600 text-white font-bold text-sm sm:text-lg py-2 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl border-2 border-yellow-400/30"
                        >
                          Upgrade to VIP
                        </button>
                      ) : (
                        <div className="bg-gradient-to-r from-purple-900/90 to-pink-900/90 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-3 border-2 border-purple-500/50 flex items-center justify-center shadow-2xl">
                          <div className="text-purple-200 font-bold text-xs sm:text-sm">
                            👑 {vipTier} Member
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Status Banner - MOBILE OPTIMIZED */}
      {connected && (
        <section className="bg-gradient-to-r from-teal-900/20 to-cyan-900/20 backdrop-blur-sm border-b border-teal-500/20 py-4 sm:py-8">
          <div className="max-w-7xl mx-auto px-2 sm:px-4">
            <div className="text-center">
              
              {/* Loading State */}
              {(isLoading || loadingEntries) && (
                <div className="flex justify-center items-center space-x-2 sm:space-x-4">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-t-2 border-teal-400"></div>
                  <div className="text-white text-sm sm:text-base">
                    {isLoading ? 'Loading your ALPHA status...' : 'Loading your entries...'}
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-900/30 border border-red-500/20 rounded-xl p-3 sm:p-4 max-w-2xl mx-auto">
                  <div className="text-red-400 font-semibold text-sm sm:text-base">❌ Connection Error</div>
                  <div className="text-red-300 text-xs sm:text-sm mt-1">{error}</div>
                  <button
                    onClick={refreshUserData}
                    className="mt-2 sm:mt-3 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition-all text-sm"
                  >
                    Retry Connection
                  </button>
                </div>
              )}

              {/* Success State - Enhanced Stats Display */}
              {!isLoading && !loadingEntries && !error && (
                <div className="space-y-4 sm:space-y-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
                    🎯 Your ALPHA Club Status
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto">
                    {/* Token Holdings */}
                    <div className="bg-gradient-to-br from-teal-800/50 to-cyan-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-teal-600/30">
                      <div className="text-teal-400 font-bold text-sm sm:text-lg">${usdValue.toFixed(2)}</div>
                      <div className="text-gray-300 text-xs sm:text-sm">ALPHA Holdings</div>
                      <div className="text-gray-400 text-xs">{tokenBalance.toLocaleString()} tokens</div>
                    </div>

                    {/* VIP Status */}
                    <div className="bg-gradient-to-br from-purple-800/50 to-pink-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-purple-600/30">
                      <div className="text-purple-400 font-bold text-sm sm:text-lg">{vipTier}</div>
                      <div className="text-gray-300 text-xs sm:text-sm">VIP Tier</div>
                      <div className="text-gray-400 text-xs">{vipMultiplier}x Multiplier</div>
                    </div>

                    {/* Automatic Entries */}
                    <div className="bg-gradient-to-br from-green-800/50 to-teal-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-green-600/30">
                      <div className="text-green-400 font-bold text-sm sm:text-lg">{getUserAutoEntries()}</div>
                      <div className="text-gray-300 text-xs sm:text-sm">Auto Entries</div>
                      <div className="text-gray-400 text-xs">This Giveaway</div>
                    </div>

                    {/* 🎯 FIXED: Total Entries display with proper breakdown */}
                    <div className="bg-gradient-to-br from-yellow-800/50 to-orange-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-yellow-600/30">
                      <div className="text-yellow-400 font-bold text-sm sm:text-lg">{getUserTotalEntries()}</div>
                      <div className="text-gray-300 text-xs sm:text-sm">Total Entries</div>
                      <div className="text-gray-400 text-xs">
                        {userEntries?.purchased_entries > 0 ? 'Auto + Purchased' : 'Auto Only'}
                      </div>
                    </div>
                  </div>

                  {/* Refresh Button */}
                  <div className="mt-4 sm:mt-6">
                    <button
                      onClick={refreshUserData}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 sm:px-6 rounded-lg transition-all text-sm"
                    >
                      🔄 Refresh Balance
                    </button>
                    <p className="text-gray-400 text-xs mt-1 sm:mt-2">
                      Updates your balance from the blockchain
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Value Proposition Section - MOBILE OPTIMIZED */}
      <section className="py-8 sm:py-16 bg-gradient-to-br from-gray-900 via-black to-purple-900/20">
        <div className="max-w-6xl mx-auto px-2 sm:px-4">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
              Why <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">$ALPHA</span> is the 
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent"> Best Solana Token</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 mb-8 sm:mb-12">
              <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/20 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-teal-500/30 text-center">
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🎯</div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Automatic Entries</h3>
                <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">
                  Hold $10+ worth of ALPHA tokens and you&apos;re automatically entered in all giveaways. 
                  <strong className="text-teal-400"> Your tokens work 24/7</strong> earning you chances to win.
                </p>
                <div className="flex justify-center">
                  {connected && (
                    <button
                      onClick={() => document.getElementById('entry-purchase')?.scrollIntoView({ behavior: 'smooth' })}
                      className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all text-xs sm:text-sm"
                    >
                      Buy More Entries
                    </button>
                  )}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-900/30 to-red-900/20 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-orange-500/30 text-center">
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🔥</div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Deflationary Burns</h3>
                <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">
                  Every VIP subscription and entry purchase burns ALPHA tokens. 
                  <strong className="text-orange-400"> Less supply = Higher value</strong> for all holders.
                </p>
                <div className="flex justify-center">
                  {connected && !isVipMember && (
                    <button
                      onClick={handleUpgradeVip}
                      className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all text-xs sm:text-sm"
                    >
                      Upgrade to VIP
                    </button>
                  )}
                  {connected && isVipMember && (
                    <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg p-2 sm:p-3 border border-purple-500/30">
                      <div className="text-purple-400 font-bold text-xs sm:text-sm">
                        👑 {vipTier} Member
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-purple-500/30 text-center">
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">⭐</div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">VIP Multipliers</h3>
                <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">
                  Upgrade to VIP for 2x-5x entry multipliers on all giveaways. 
                  <strong className="text-purple-400"> Plus exclusive partner discounts.</strong>
                </p>
                <div className="flex justify-center">
                  {connected && !isVipMember && (
                    <button
                      onClick={handleUpgradeVip}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all text-xs sm:text-sm"
                    >
                      Get VIP Benefits
                    </button>
                  )}
                  {connected && isVipMember && (
                    <div className="bg-gradient-to-r from-green-600/20 to-teal-600/20 rounded-lg p-2 sm:p-3 border border-green-500/30">
                      <div className="text-green-400 font-bold text-xs sm:text-sm">
                        ✅ {vipMultiplier}x Active
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section - Using Existing Modular Components */}
      <section className="bg-gradient-to-br from-gray-900 via-black to-purple-900/20 py-20">
        <div className="max-w-7xl mx-auto px-4">
          
          {/* 🎯 ISSUE 3 FIX: Corrected GiveawayStats props */}
          <GiveawayStats 
            giveaway={giveaway}
            userEntries={userEntries}  // Pass the complete userEntries object
            totalFreeEntries={getUserAutoEntries()}  // Pass calculated auto entries
          />

          {/* Entry Purchase Section - Use existing component */}
          <div className="mt-20" id="entry-purchase">
            <EntryPurchaseSection 
              giveaway={giveaway}
              userVipTier={vipTier}
              userVipMultiplier={vipMultiplier}
              onPurchaseComplete={handleEntryPurchased}
            />
          </div>

          {/* Countdown - Use existing component */}
          <div className="mt-20">
            <GiveawayCountdown 
              endDate={giveaway.entry_end_date}
            />
          </div>

          {/* Recent Winners - Use existing component */}
          <div className="mt-20">
            <RecentWinners />
          </div>
        </div>
      </section>

      {/* VIP Upgrade Flow Modal */}
      {showVipFlow && (
        <VipUpgradeFlow 
          onClose={() => setShowVipFlow(false)}
        />
      )}
    </div>
  );
};