// ===============================================
// COMPLETE PROMOTIONAL GIVEAWAYS SECTION - FIXED WITH ALL ORIGINAL FUNCTIONALITY
// src/components/PromotionalGiveawaysSection.tsx
// FIXED: useEffect dependency warnings, notification store usage, and property access
// ===============================================

import { FC, useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { PromotionalGiveaway, PromotionalGiveawayEntry } from '../utils/supabaseClient';
import { MarketDataService } from '../utils/marketDataService';
import { notify } from '../utils/notifications';

interface PromotionalGiveawaysSectionProps {
 userUsdValue?: number;
 userVipTier?: string;
 vipBaselineEntries?: number;
 vipMultiplier?: number;
 onUpgradeVip?: () => void;
}

interface EntryPackage {
 amount: number;
 entries: number;
 label: string;
 popular?: boolean;
 discount?: string;
 description: string;
}

// Payment configuration
const PAYMENT_DESTINATIONS = {
 SOL: new PublicKey('7Nh2JqYkZxMCvXCGnX2ZNGEzUYFNoxuEYB5PemSoraGZ'),
 USDC: new PublicKey('7Nh2JqYkZxMCvXCGnX2ZNGEzUYFNoxuEYB5PemSoraGZ'),
 ALPHA: new PublicKey('7Nh2JqYkZxMCvXCGnX2ZNGEzUYFNoxuEYB5PemSoraGZ')
};

const TOKEN_MINTS = {
 USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
 ALPHA: new PublicKey('4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump')
};

// Entry packages configuration
const ENTRY_PACKAGES: EntryPackage[] = [
 {
   amount: 15, entries: 2, label: 'Starter Pack', 
   description: 'Perfect for first-time participants'
 },
 {
   amount: 30, entries: 5, label: 'Popular Pack', popular: true,
   description: 'Most popular choice - best value'
 },
 {
   amount: 50, entries: 10, label: 'Power Pack', discount: '25% Bonus',
   description: 'Extra entries for serious players'
 },
 {
   amount: 100, entries: 25, label: 'VIP Pack', discount: '150% Bonus',
   description: 'Maximum entries for maximum chances'
 }
];

export const PromotionalGiveawaysSection: FC<PromotionalGiveawaysSectionProps> = ({
 userUsdValue = 0,
 userVipTier = 'None',
 vipBaselineEntries = 0,
 vipMultiplier = 1,
 onUpgradeVip
}) => {
 const { publicKey } = useWallet();
 const { setVisible } = useWalletModal();
 const { connection } = useConnection();
 const [giveaways, setGiveaways] = useState<PromotionalGiveaway[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 // FIXED: Wrap fetchGiveaways in useCallback
 const fetchGiveaways = useCallback(async () => {
   try {
     setLoading(true);
     setError(null);
     const response = await fetch('/api/promotional-giveaways');
     
     if (!response.ok) {
       throw new Error(`HTTP error! status: ${response.status}`);
     }
     
     const data = await response.json();
     
     // CRITICAL: Ensure data is always an array
     if (Array.isArray(data)) {
       setGiveaways(data);
     } else if (data && Array.isArray(data.giveaways)) {
       setGiveaways(data.giveaways);
     } else {
       console.warn('API returned unexpected data format:', data);
       setGiveaways([]); // Set empty array as fallback
     }
   } catch (error) {
     console.error('Error fetching giveaways:', error);
     setError('Failed to load giveaways');
     setGiveaways([]); // Set empty array on error
     
     // Show user-friendly notification
     notify({
       type: 'error',
       message: 'Failed to load promotional giveaways. Please try again later.'
     });
   } finally {
     setLoading(false);
   }
 }, []);

 // CRITICAL: Initialize giveaways as empty array to prevent filter error
 useEffect(() => {
   fetchGiveaways();
 }, [fetchGiveaways]);

 const getHoldingEntries = () => {
   return Math.floor(userUsdValue / 10);
 };

 const getTotalFreeEntries = () => {
   const holdingEntries = getHoldingEntries();
   return Math.floor((holdingEntries + vipBaselineEntries) * vipMultiplier);
 };

 if (loading) {
   return (
     <div className="flex justify-center py-20">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
     </div>
   );
 }

 if (error) {
   return (
     <div className="text-center py-20">
       <div className="text-red-400 text-xl mb-4">⚠️ {error}</div>
       <button
         onClick={fetchGiveaways}
         className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold"
       >
         Try Again
       </button>
     </div>
   );
 }

 // CRITICAL: Ensure giveaways is array before filtering
 const safeGiveaways = Array.isArray(giveaways) ? giveaways : [];
 const activeGiveaways = safeGiveaways.filter(g => g.status === 'active');
 const recentWinners = safeGiveaways.filter(g => g.status === 'drawn' && g.winner_wallet);

 return (
   <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
     
     {/* No Active Giveaways - Better Empty State */}
     {activeGiveaways.length === 0 && (
       <div className="text-center py-20">
         <div className="max-w-2xl mx-auto">
           <div className="text-8xl mb-8 animate-bounce">🎁</div>
           <h3 className="text-4xl font-bold text-white mb-6">
             <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
               Next Giveaway Loading...
             </span>
           </h3>
           <p className="text-xl text-gray-300 mb-8">
             Amazing promotional giveaways are coming soon! Get ready by connecting your wallet and building your ALPHA holdings.
           </p>
           
           {/* Preparation Steps */}
           <div className="promo-card">
             <h4 className="text-2xl font-bold text-white mb-6">🎯 Get Ready to Win</h4>
             <div className="grid md:grid-cols-3 gap-6">
               <div className="text-center">
                 <div className="text-4xl mb-3">💰</div>
                 <h5 className="text-lg font-bold text-green-400 mb-2">Hold $ALPHA</h5>
                 <p className="text-gray-300 text-sm">Get 1 entry per $10 held automatically</p>
               </div>
               <div className="text-center">
                 <div className="text-4xl mb-3">👑</div>
                 <h5 className="text-lg font-bold text-purple-400 mb-2">Upgrade VIP</h5>
                 <p className="text-gray-300 text-sm">Get up to 5x multiplier on all entries</p>
               </div>
               <div className="text-center">
                 <div className="text-4xl mb-3">🎁</div>
                 <h5 className="text-lg font-bold text-yellow-400 mb-2">Buy More</h5>
                 <p className="text-gray-300 text-sm">Purchase additional entries when live</p>
               </div>
             </div>
           </div>

           {!publicKey && (
             <button
               onClick={() => setVisible(true)}
               className="cta-button-primary mt-8 text-lg px-8 py-4 rounded-xl font-bold"
             >
               Connect Wallet to Prepare 🚀
             </button>
           )}
         </div>
       </div>
     )}

     {/* Active Giveaways - IMPROVED SINGLE CARD DESIGN */}
     {activeGiveaways.length > 0 && (
       <div className="space-y-8">
         {activeGiveaways.map((giveaway) => (
           <PromotionalGiveawayCard
             key={giveaway.id}
             giveaway={giveaway}
             userUsdValue={userUsdValue}
             userVipTier={userVipTier}
             vipBaselineEntries={vipBaselineEntries}
             vipMultiplier={vipMultiplier}
             userWallet={publicKey?.toString()}
             onEntryPurchased={fetchGiveaways}
             onConnectWallet={() => setVisible(true)}
           />
         ))}
       </div>
     )}

     {/* Recent Winners Section */}
     {recentWinners.length > 0 && (
       <div className="mt-16">
         <h3 className="text-3xl font-bold text-white text-center mb-8">
           🏆 Recent Winners
         </h3>
         <p className="text-center text-gray-300 mb-8">
           Real winners, real prizes. You could be next.
         </p>
         
         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
           {recentWinners.slice(0, 6).map(giveaway => (
             <div key={giveaway.id} className="group hover:scale-105 transition-all duration-300">
               <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-2xl p-6 border border-yellow-500/30 hover:border-yellow-400/60 transition-all">
                 <div className="text-center">
                   <div className="text-5xl mb-4 group-hover:animate-bounce">🏆</div>
                   <h4 className="text-xl font-bold text-white mb-2">{giveaway.title}</h4>
                   
                   <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-4 py-2 rounded-full font-bold text-lg mb-4 inline-block">
                     ${giveaway.prize_value.toLocaleString()}
                   </div>
                   
                   <div className="bg-black/50 rounded-xl p-4 border border-gray-600/30">
                     <div className="text-xs text-gray-400 mb-2">🎯 WINNER</div>
                     <div className="font-mono text-yellow-400 text-sm mb-2">
                       {giveaway.winner_wallet?.slice(0, 12)}...{giveaway.winner_wallet?.slice(-6)}
                     </div>
                     <div className="text-xs text-gray-400">
                       Won {new Date(giveaway.winner_selected_at!).toLocaleDateString()}
                     </div>
                   </div>
                   
                   <div className="text-xs text-green-400 font-semibold mt-3 opacity-75 group-hover:opacity-100 transition-opacity">
                     ✨ This could be you next!
                   </div>
                 </div>
               </div>
             </div>
           ))}
         </div>
       </div>
     )}
   </div>
 );
};

// ===============================================
// IMPROVED PROMOTIONAL GIVEAWAY CARD COMPONENT
// ===============================================

interface PromotionalGiveawayCardProps {
 giveaway: PromotionalGiveaway;
 userUsdValue: number;
 userVipTier: string;
 vipBaselineEntries: number;
 vipMultiplier: number;
 userWallet?: string;
 onEntryPurchased: () => void;
 onConnectWallet: () => void;
}

const PromotionalGiveawayCard: FC<PromotionalGiveawayCardProps> = ({
 giveaway,
 userUsdValue,
 userVipTier,
 vipBaselineEntries,
 vipMultiplier,
 userWallet,
 onEntryPurchased,
 onConnectWallet
}) => {
 const [userEntries, setUserEntries] = useState<PromotionalGiveawayEntry | null>(null);
 const [showPurchaseModal, setShowPurchaseModal] = useState(false);
 const [loading, setLoading] = useState(false);
 const [participantCount, setParticipantCount] = useState(0);

 // FIXED: Wrap fetchUserEntries in useCallback
 const fetchUserEntries = useCallback(async () => {
   if (!userWallet) return;
   
   try {
     const response = await fetch(`/api/promotional-giveaways/${giveaway.id}/my-entries`, {
       headers: { 'x-wallet-address': userWallet }
     });
     const data = await response.json();
     setUserEntries(data.entries);
   } catch (error) {
     console.error('Error fetching user entries:', error);
   }
 }, [userWallet, giveaway.id]);

 // Fetch participant count
 const fetchParticipantCount = useCallback(async () => {
   try {
     const response = await fetch(`/api/promotional-giveaways/${giveaway.id}/stats`);
     const data = await response.json();
     setParticipantCount(data.participants || 0);
   } catch (error) {
     console.error('Error fetching participant count:', error);
   }
 }, [giveaway.id]);

 useEffect(() => {
   if (userWallet && giveaway.status === 'active') {
     fetchUserEntries();
   }
   fetchParticipantCount();
 }, [userWallet, giveaway.id, giveaway.status, fetchUserEntries, fetchParticipantCount]);

 const getHoldingEntries = () => {
   return Math.floor(userUsdValue / 10);
 };

 const getTotalFreeEntries = () => {
   const holdingEntries = getHoldingEntries();
   return Math.floor((holdingEntries + vipBaselineEntries) * vipMultiplier);
 };

 const handlePurchaseClick = () => {
   if (!userWallet) {
     onConnectWallet();
     return;
   }
   setShowPurchaseModal(true);
 };

 return (
   <>
     {/* IMPROVED SINGLE GIVEAWAY CARD - MUCH BETTER DESIGN */}
     <div className="relative overflow-hidden bg-gradient-to-br from-gray-900/80 to-green-900/20 backdrop-blur-xl rounded-3xl border border-green-500/20 shadow-2xl">
       
       {/* Status Badge */}
       <div className="absolute top-6 left-6 z-10">
         <div className="inline-flex items-center space-x-2 bg-green-500/20 rounded-full px-4 py-2 border border-green-500/30 backdrop-blur-sm">
           <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
           <span className="text-green-400 font-bold uppercase text-sm">🔥 LIVE GIVEAWAY</span>
         </div>
       </div>

       {/* Hero Section */}
       <div className="relative p-8 pt-20">
         <div className="text-center mb-8">
           <h3 className="text-4xl lg:text-5xl font-bold text-white mb-4">{giveaway.title}</h3>
           <p className="text-xl text-gray-300 mb-6 max-w-2xl mx-auto">{giveaway.prize_description}</p>
           
           {/* Prize Value - MUCH MORE PROMINENT */}
           <div className="inline-block bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 p-1 rounded-2xl mb-6">
             <div className="bg-black/80 backdrop-blur-sm rounded-2xl px-8 py-4">
               <div className="text-4xl lg:text-5xl font-black text-white mb-2">
                 ${giveaway.prize_value.toLocaleString()}
               </div>
               <div className="text-yellow-400 font-bold text-lg">PRIZE VALUE</div>
             </div>
           </div>
           
           {/* Countdown Timer */}
           <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-red-500/30 max-w-md mx-auto">
             <h4 className="text-lg font-bold text-red-400 mb-3">⏰ Draw Ending Soon</h4>
             <div className="text-2xl font-mono text-white">
               {new Date(giveaway.draw_date).toLocaleDateString()} at {new Date(giveaway.draw_date).toLocaleTimeString()}
             </div>
           </div>
         </div>

         <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
           
           {/* Left Side - Entry Status */}
           <div className="space-y-6">
             
             {/* Current Entries Display */}
             {userWallet ? (
               <div className="entry-counter">
                 <h4 className="text-2xl font-bold text-white mb-4 text-center">🎯 Your Current Entries</h4>
                 
                 <div className="space-y-3">
                   <div className="flex justify-between items-center p-4 bg-black/40 rounded-xl">
                     <span className="text-gray-300 font-medium">From Holdings:</span>
                     <span className="text-green-400 font-bold text-xl">{getHoldingEntries()}</span>
                   </div>
                   
                   <div className="flex justify-between items-center p-4 bg-black/40 rounded-xl">
                     <span className="text-gray-300 font-medium">VIP Baseline:</span>
                     <span className="text-purple-400 font-bold text-xl">{vipBaselineEntries}</span>
                   </div>
                   
                   <div className="flex justify-between items-center p-4 bg-black/40 rounded-xl">
                     <span className="text-gray-300 font-medium">VIP Multiplier:</span>
                     <span className="text-yellow-400 font-bold text-xl">{vipMultiplier}x</span>
                   </div>
                   
                   <div className="flex justify-between items-center p-4 bg-black/40 rounded-xl">
                     <span className="text-gray-300 font-medium">Purchased:</span>
                     <span className="text-blue-400 font-bold text-xl">{userEntries?.final_entries || 0}</span>
                   </div>
                   
                   <div className="border-t border-gray-600 pt-4">
                     <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-xl border border-green-500/30">
                       <span className="text-white font-bold text-lg">TOTAL ENTRIES:</span>
                       <span className="text-green-400 font-bold text-3xl">
                         {getTotalFreeEntries() + (userEntries?.final_entries || 0)}
                       </span>
                     </div>
                   </div>
                 </div>

                 {/* VIP Upgrade CTA */}
                 {userVipTier === 'None' && (
                   <div className="mt-6 p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl border border-purple-500/30 text-center">
                     <p className="text-purple-400 font-bold mb-2">🚀 Multiply Your Chances!</p>
                     <p className="text-gray-300 text-sm mb-3">VIP members get up to 5x more entries</p>
                     <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-bold w-full transition-all">
                       Upgrade to VIP 👑
                     </button>
                   </div>
                 )}
               </div>
             ) : (
               <div className="entry-counter text-center">
                 <div className="text-6xl mb-4">🔗</div>
                 <h4 className="text-3xl font-bold text-white mb-4">Connect to Enter</h4>
                 <p className="text-gray-300 mb-6 text-lg">
                   Connect your wallet to see your automatic entries and purchase more
                 </p>
                 <button
                   onClick={onConnectWallet}
                   className="cta-button-primary w-full py-4 text-xl font-bold"
                 >
                   Connect Wallet 🚀
                 </button>
               </div>
             )}
           </div>

           {/* Right Side - Purchase Entry Packages */}
           <div className="space-y-6">
             <div className="text-center mb-6">
               <h4 className="text-3xl font-bold text-white mb-2">💎 Buy More Entries</h4>
               <p className="text-gray-300 text-lg">Increase your chances with additional entries</p>
             </div>

             <div className="grid grid-cols-2 gap-4">
               {ENTRY_PACKAGES.map((pkg) => (
                 <div
                   key={pkg.amount}
                   className={`relative bg-black/60 backdrop-blur-sm rounded-2xl p-6 border transition-all cursor-pointer hover:scale-105 ${
                     pkg.popular 
                       ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-900/20 to-orange-900/20' 
                       : 'border-gray-600/30 hover:border-green-500/50'
                   }`}
                   onClick={handlePurchaseClick}
                 >
                   {pkg.popular && (
                     <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                       <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-3 py-1 rounded-full text-xs font-bold">
                         🔥 POPULAR
                       </span>
                     </div>
                   )}
                   
                   <div className="text-center">
                     <div className="text-3xl font-bold text-white mb-2">${pkg.amount}</div>
                     <div className="text-lg text-green-400 font-bold mb-2">{pkg.entries} Entries</div>
                     {pkg.discount && (
                       <div className="text-yellow-400 text-sm font-bold mb-2">{pkg.discount}</div>
                     )}
                     <div className="text-xs text-gray-400 mb-3">{pkg.description}</div>
                     
                     {/* Show VIP bonus */}
                     {userWallet && vipMultiplier > 1 && (
                       <div className="bg-purple-900/30 rounded-lg p-2 border border-purple-500/30">
                         <div className="text-purple-400 text-xs font-bold">
                           VIP BONUS: +{Math.floor(pkg.entries * (vipMultiplier - 1))} entries
                         </div>
                         <div className="text-purple-300 text-xs">
                           Total: {Math.floor(pkg.entries * vipMultiplier)} entries
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               ))}
             </div>

             {/* Purchase CTA */}
             <div className="text-center">
               <p className="text-gray-400 text-sm mb-4">
                 💳 Pay with SOL, USDC, or ALPHA tokens
               </p>
               {userWallet ? (
                 <button
                   onClick={handlePurchaseClick}
                   className="cta-button-secondary w-full py-4 text-lg font-bold"
                 >
                   Purchase More Entries 💎
                 </button>
               ) : (
                 <p className="text-yellow-400 text-sm font-bold">
                   🔗 Connect wallet to purchase entries
                 </p>
               )}
             </div>
           </div>
         </div>

         {/* Bottom Stats */}
         <div className="mt-12 pt-8 border-t border-gray-700">
           <div className="grid md:grid-cols-4 gap-6 text-center">
             <div className="bg-black/40 rounded-xl p-6">
               <div className="text-3xl font-bold text-green-400 mb-2">{giveaway.total_entries || 0}</div>
               <div className="text-gray-400 font-medium">Total Entries</div>
             </div>
             <div className="bg-black/40 rounded-xl p-6">
               <div className="text-3xl font-bold text-blue-400 mb-2">{participantCount}</div>
               <div className="text-gray-400 font-medium">Participants</div>
             </div>
             <div className="bg-black/40 rounded-xl p-6">
               <div className="text-3xl font-bold text-purple-400 mb-2">${giveaway.prize_value.toLocaleString()}</div>
               <div className="text-gray-400 font-medium">Prize Value</div>
             </div>
             <div className="bg-black/40 rounded-xl p-6">
               <div className="text-3xl font-bold text-yellow-400 mb-2">
               {Math.floor((Date.now() - new Date(giveaway.created_at).getTime()) / (1000 * 60 * 60 * 24))}
               </div>
               <div className="text-gray-400 font-medium">Days Running</div>
             </div>
           </div>
         </div>
       </div>
     </div>

     {/* Purchase Modal */}
     {showPurchaseModal && (
       <EntryPurchaseModal
         giveaway={giveaway}
         onClose={() => setShowPurchaseModal(false)}
         onSuccess={() => {
           setShowPurchaseModal(false);
           onEntryPurchased();
           fetchUserEntries();
         }}
       />
     )}
   </>
 );
};

// ===============================================
// ENTRY PURCHASE MODAL COMPONENT
// ===============================================

interface EntryPurchaseModalProps {
 giveaway: PromotionalGiveaway;
 onClose: () => void;
 onSuccess: () => void;
}

const EntryPurchaseModal: FC<EntryPurchaseModalProps> = ({ giveaway, onClose, onSuccess }) => {
 const [selectedPackage, setSelectedPackage] = useState<EntryPackage>(ENTRY_PACKAGES[1]); // Default to popular
 const [selectedCurrency, setSelectedCurrency] = useState<'SOL' | 'USDC' | 'ALPHA'>('SOL');
 const [isProcessing, setIsProcessing] = useState(false);

 const handlePurchase = async () => {
   setIsProcessing(true);
   
   try {
     // TODO: Implement Solana Pay transaction
     // This is a placeholder for the actual purchase logic
     
     notify({
       type: 'success',
       message: `Successfully purchased ${selectedPackage.entries} entries for ${giveaway.title}!`
     });
     
     onSuccess();
   } catch (error) {
     console.error('Purchase failed:', error);
     notify({
       type: 'error',
       message: 'Purchase failed. Please try again.'
     });
   } finally {
     setIsProcessing(false);
   }
 };

 return (
   <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
     <div className="bg-gradient-to-br from-gray-900 to-green-900/20 rounded-3xl p-8 max-w-2xl w-full border border-green-500/20">
       
       <div className="flex justify-between items-center mb-6">
         <h3 className="text-2xl font-bold text-white">💎 Purchase Entries</h3>
         <button
           onClick={onClose}
           className="text-gray-400 hover:text-white text-2xl"
         >
           ×
         </button>
       </div>

       <div className="text-center mb-6">
         <h4 className="text-xl text-white mb-2">{giveaway.title}</h4>
         <div className="text-yellow-400 font-bold text-lg">
           ${giveaway.prize_value.toLocaleString()} Prize
         </div>
       </div>

       {/* Package Selection */}
       <div className="mb-6">
         <h5 className="text-lg font-bold text-white mb-4">Select Entry Package:</h5>
         <div className="grid grid-cols-2 gap-4">
           {ENTRY_PACKAGES.map((pkg) => (
             <div
               key={pkg.amount}
               className={`p-4 rounded-xl border cursor-pointer transition-all ${
                 selectedPackage.amount === pkg.amount
                   ? 'border-green-500 bg-green-900/20'
                   : 'border-gray-600 hover:border-green-500/50'
               }`}
               onClick={() => setSelectedPackage(pkg)}
             >
               <div className="text-center">
                 <div className="text-2xl font-bold text-white">${pkg.amount}</div>
                 <div className="text-green-400 font-bold">{pkg.entries} Entries</div>
                 {pkg.discount && (
                   <div className="text-yellow-400 text-sm">{pkg.discount}</div>
                 )}
               </div>
             </div>
           ))}
         </div>
       </div>

       {/* Currency Selection */}
       <div className="mb-6">
         <h5 className="text-lg font-bold text-white mb-4">Payment Method:</h5>
         <div className="grid grid-cols-3 gap-4">
           {(['SOL', 'USDC', 'ALPHA'] as const).map((currency) => (
             <button
               key={currency}
               className={`p-3 rounded-xl border font-bold transition-all ${
                 selectedCurrency === currency
                   ? 'border-green-500 bg-green-900/20 text-green-400'
                   : 'border-gray-600 text-gray-300 hover:border-green-500/50'
               }`}
               onClick={() => setSelectedCurrency(currency)}
             >
               {currency}
             </button>
           ))}
         </div>
       </div>

       {/* Purchase Button */}
       <button
         onClick={handlePurchase}
         disabled={isProcessing}
         className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-8 rounded-xl transition-all"
       >
         {isProcessing ? 'Processing...' : `Purchase ${selectedPackage.entries} Entries for $${selectedPackage.amount}`}
       </button>
     </div>
   </div>
 );
};