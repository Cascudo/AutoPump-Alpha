// src/components/EntryPurchaseSection.tsx
// PRODUCTION READY: Entry package selection and purchase flow with real-time pricing
// FIXED: useCallback dependency warning
import { FC, useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PromotionalGiveaway } from '../utils/supabaseClient';
import { MarketDataService } from '../utils/marketDataService';
import { notify } from '../utils/notifications';
// ✅ CHANGE 1: ADD this import for dynamic packages
import { resolveEntryPackages } from '../utils/giveawayHelpers';

interface EntryPurchaseSectionProps {
  giveaway: PromotionalGiveaway;
  userVipTier: string;
  userVipMultiplier: number;
  onPurchaseComplete: (entries: number) => void;
}

interface EntryPackage {
  id: number;
  name: string;
  price: number; // USD price
  entries: number;
  popular?: boolean;
  savings?: string;
  description: string;
}

type PaymentCurrency = 'SOL' | 'USDC' | 'ALPHA';

// PRODUCTION PAYMENT DESTINATIONS
const PAYMENT_DESTINATIONS = {
  SOL: new PublicKey('7Nh2JqYkZxMCvXCGnX2ZNGEzUYFNoxuEYB5PemSoraGZ'),
  USDC: new PublicKey('7Nh2JqYkZxMCvXCGnX2ZNGEzUYFNoxuEYB5PemSoraGZ'),
  ALPHA: new PublicKey('7Nh2JqYkZxMCvXCGnX2ZNGEzUYFNoxuEYB5PemSoraGZ')
};

const TOKEN_MINTS = {
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  ALPHA: new PublicKey('4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump')
};

interface DynamicPricing {
  solPriceUsd: number;
  alphaPriceUsd: number;
  usdcPriceUsd: number; // Always 1.0
  lastUpdated: number;
}

export const EntryPurchaseSection: FC<EntryPurchaseSectionProps> = ({
  giveaway,
  userVipTier,
  userVipMultiplier,
  onPurchaseComplete
}) => {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  
  const [selectedPackage, setSelectedPackage] = useState<EntryPackage | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<PaymentCurrency>('SOL');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'confirming' | 'success'>('select');
  
  // Dynamic pricing state
  const [dynamicPricing, setDynamicPricing] = useState<DynamicPricing | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [entryPackages, setEntryPackages] = useState<EntryPackage[]>([]);

  // Fetch real-time pricing data
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setPricingLoading(true);
        console.log('🔄 Fetching real-time pricing...');
        
        const marketService = MarketDataService.getInstance();
        const data = await marketService.getMarketData();
        
        const pricing: DynamicPricing = {
          solPriceUsd: data.solPriceUSD,
          alphaPriceUsd: data.tokenPriceUSD,
          usdcPriceUsd: 1.0, // USDC is always 1:1 with USD
          lastUpdated: Date.now()
        };
        
        setDynamicPricing(pricing);
        console.log('✅ Pricing loaded:', pricing);
        
      } catch (error) {
        console.error('❌ Pricing fetch error:', error);
        // Fallback pricing
        setDynamicPricing({
          solPriceUsd: 150,
          alphaPriceUsd: 0.00001,
          usdcPriceUsd: 1.0,
          lastUpdated: Date.now()
        });
      } finally {
        setPricingLoading(false);
      }
    };

    fetchPricing();
    const interval = setInterval(fetchPricing, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Resolve entry packages dynamically per giveaway
  useEffect(() => {
    if (giveaway) {
      console.log('🔄 Resolving entry packages for giveaway:', giveaway.title);
      
      const packages = resolveEntryPackages(giveaway);
      
      // Convert to EntryPackage format
      const convertedPackages = packages.map((pkg, index) => ({
        id: pkg.id || index + 1,
        name: pkg.name,
        price: pkg.price,
        entries: pkg.entries,
        popular: pkg.popular,
        savings: pkg.discount,
        description: pkg.description || 'Entry package for this giveaway'
      }));
      
      setEntryPackages(convertedPackages);
      
      console.log('✅ Package source:', giveaway.entry_packages ? 'Custom DB packages' : 'Dynamic generation');
      console.log('✅ Resolved packages:', convertedPackages);
    }
  }, [giveaway]);

  // Calculate dynamic amount based on current market prices
  const calculateDynamicAmount = useCallback((usdPrice: number, currency: PaymentCurrency): number => {
    if (!dynamicPricing) return 0;
    
    switch (currency) {
      case 'SOL':
        return usdPrice / dynamicPricing.solPriceUsd;
      case 'USDC':
        return usdPrice; // 1:1 with USD
      case 'ALPHA':
        return usdPrice / dynamicPricing.alphaPriceUsd;
      default:
        return 0;
    }
  }, [dynamicPricing]);

  // 🔧 FIX 3: Add function to format dynamic pricing for package cards
  const formatDynamicPrice = useCallback((usdPrice: number, currency: PaymentCurrency): string => {
    if (!dynamicPricing) return '...';
    
    const amount = calculateDynamicAmount(usdPrice, currency);
    
    switch (currency) {
      case 'SOL':
        return amount.toFixed(4);
      case 'USDC':
        return amount.toFixed(2);
      case 'ALPHA':
        return Math.floor(amount).toLocaleString();
      default:
        return '...';
    }
  }, [dynamicPricing, calculateDynamicAmount]);

  const calculateFinalEntries = useCallback((baseEntries: number): number => {
    return Math.floor(baseEntries * userVipMultiplier);
  }, [userVipMultiplier]);

  const handlePackageSelect = (pkg: EntryPackage) => {
    if (!connected) {
      console.log('🔗 Wallet not connected, opening wallet modal...');
      setVisible(true);
      return;
    }
    setSelectedPackage(pkg);
    setShowPurchaseModal(true);
    setPaymentStep('select');
  };

  // ✅ FIXED: processPayment with corrected dependencies
  const processPayment = useCallback(async () => {
    if (!publicKey || !selectedPackage || !selectedCurrency) {
      notify({
        type: 'error',
        message: 'Missing Information',
        description: 'Please ensure wallet is connected and package is selected'
      });
      return;
    }

    try {
      setIsProcessing(true);
      setPaymentStep('confirming');

      const paymentAmount = calculateDynamicAmount(selectedPackage.price, selectedCurrency);
      console.log('💳 Processing payment:', {
        package: selectedPackage.name,
        amount: paymentAmount,
        currency: selectedCurrency,
        usdValue: selectedPackage.price
      });

      let transaction: Transaction;

      // Create payment transaction based on currency
      if (selectedCurrency === 'SOL') {
        transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: PAYMENT_DESTINATIONS.SOL,
            lamports: Math.floor(paymentAmount * LAMPORTS_PER_SOL),
          })
        );

      } else if (selectedCurrency === 'USDC') {
        const fromTokenAccount = await getAssociatedTokenAddress(
          TOKEN_MINTS.USDC,
          publicKey
        );
        const toTokenAccount = await getAssociatedTokenAddress(
          TOKEN_MINTS.USDC,
          PAYMENT_DESTINATIONS.USDC
        );

        transaction = new Transaction().add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            publicKey,
            Math.floor(paymentAmount * 1_000_000), // USDC has 6 decimals
            [],
            TOKEN_PROGRAM_ID
          )
        );

      } else if (selectedCurrency === 'ALPHA') {
        const fromTokenAccount = await getAssociatedTokenAddress(
          TOKEN_MINTS.ALPHA,
          publicKey
        );
        const toTokenAccount = await getAssociatedTokenAddress(
          TOKEN_MINTS.ALPHA,
          PAYMENT_DESTINATIONS.ALPHA
        );

        transaction = new Transaction().add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            publicKey,
            // 🔧 FIX 1: ALPHA has 6 decimals
            Math.floor(paymentAmount * 1_000_000), // ALPHA has 6 decimals
            [],
            TOKEN_PROGRAM_ID
          )
        );
      } else {
        throw new Error('Invalid payment currency');
      }
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      console.log('📝 Transaction sent:', signature);

      // ✅ SIMPLE: Your backend validates transactions, so skip frontend confirmation
      console.log('⚡ Proceeding to API - backend will validate transaction');

      // Send purchase data to API
      const response = await fetch('/api/promotional-giveaways/purchase-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toString(),
        },
        body: JSON.stringify({
          giveawayId: giveaway.id,
          packageId: selectedPackage.id,
          userWallet: publicKey.toString(),
          paymentTransaction: signature,
          packageAmount: selectedPackage.price,
          baseEntries: selectedPackage.entries,
          paymentMethod: selectedCurrency,
          vipTier: userVipTier,
          vipMultiplier: userVipMultiplier
        })
      });

      console.log('📡 API Response Status:', response.status);
      console.log('📡 API Response OK:', response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('❌ API Error Response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Purchase API response:', data);

      setPaymentStep('success');
      
      const finalEntries = calculateFinalEntries(selectedPackage.entries);
      
      notify({
        type: 'success',
        message: 'Purchase Successful! 🎉',
        description: data.message || `You received ${finalEntries} entries for this giveaway.`
      });

      console.log('🔄 Calling onPurchaseComplete with entries:', finalEntries);
      onPurchaseComplete(finalEntries);
      
      // 🔧 FIX 2: Improved modal auto-close behavior
      setTimeout(() => {
        handlePurchaseCancel(); // Use existing cancel function for proper cleanup
      }, 3000);

    } catch (error) {
      console.error('❌ Payment error:', error);
      setPaymentStep('select');
      
      notify({
        type: 'error',
        message: 'Purchase Failed',
        description: 'There was an error processing your purchase. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    publicKey, 
    selectedPackage, 
    selectedCurrency, 
    calculateDynamicAmount, 
    calculateFinalEntries,
    connection,
    sendTransaction,
    giveaway.id,
    userVipTier,
    userVipMultiplier,
    onPurchaseComplete
  ]);

  // 🔧 FIX 2: Improved modal closing function
  const handlePurchaseCancel = () => {
    setShowPurchaseModal(false);
    setSelectedPackage(null);
    setPaymentStep('select');
    setIsProcessing(false); // Reset processing state
  };

  return (
    <>
      {/* Entry Packages Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-5xl">
            {entryPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative bg-gradient-to-br from-gray-900/80 to-black/60 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer w-full max-w-sm mx-auto ${
                  pkg.popular 
                    ? 'border-purple-500/50 shadow-purple-500/20 shadow-2xl' 
                    : 'border-gray-700/50 hover:border-gray-600/50'
                }`}
                onClick={() => handlePackageSelect(pkg)}
              >
                
                {/* Popular Badge */}
                {pkg.popular && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 sm:px-4 py-1 sm:py-2 rounded-full border border-purple-400">
                      MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Package Content */}
                <div className="text-center">
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{pkg.name}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm mb-4">{pkg.description}</p>
                  
                  {/* Price Display */}
                  <div className="mb-4">
                    <div className="text-3xl sm:text-4xl font-black text-white mb-1">
                      ${pkg.price}
                    </div>
                    {pkg.savings && (
                      <div className="text-green-400 text-xs sm:text-sm font-bold mb-2">
                        {pkg.savings}
                      </div>
                    )}
                    
                    {/* 🔧 IMPROVED: Better aligned pricing table for mobile and desktop */}
                    {dynamicPricing && !pricingLoading && (
                      <div className="bg-gray-800/50 rounded-lg p-2 sm:p-3 mt-3">
                        <div className="text-xs text-gray-400 mb-2 text-center">Payment Options:</div>
                        <div className="space-y-1.5 text-xs sm:text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-medium">SOL:</span>
                            <span className="text-white font-mono text-right">
                              {formatDynamicPrice(pkg.price, 'SOL')} SOL
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-medium">USDC:</span>
                            <span className="text-white font-mono text-right">
                              {formatDynamicPrice(pkg.price, 'USDC')} USDC
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-medium">ALPHA:</span>
                            <span className="text-white font-mono text-right text-xs">
                              {formatDynamicPrice(pkg.price, 'ALPHA')} ALPHA
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {pricingLoading && (
                      <div className="text-yellow-400 text-xs mt-2 text-center">
                        Loading prices...
                      </div>
                    )}
                  </div>

                  {/* Entries Display */}
                  <div className="mb-6">
                    <div className="text-2xl sm:text-3xl font-bold text-green-400 mb-1">
                      {pkg.entries} Entries
                    </div>
                    {userVipMultiplier > 1 && (
                      <div className="text-purple-400 text-xs sm:text-sm">
                        {userVipTier} VIP: {calculateFinalEntries(pkg.entries)} total entries
                      </div>
                    )}
                  </div>

                  {/* Buy Button */}
                  <button
                    className={`w-full py-3 sm:py-4 rounded-2xl font-bold text-base sm:text-lg transition-all ${
                      pkg.popular
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25'
                        : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white'
                    }`}
                    onClick={() => handlePackageSelect(pkg)}
                  >
                    {connected ? 'Buy Entries' : 'Connect Wallet'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedPackage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-purple-900/20 rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-purple-500/20 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-white">💎 Complete Purchase</h3>
              <button
                onClick={handlePurchaseCancel}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Package Summary */}
            <div className="text-center mb-6">
              <h4 className="text-lg sm:text-xl text-white mb-2">{selectedPackage.name}</h4>
              <div className="text-purple-400 font-bold text-base sm:text-lg">
                {selectedPackage.entries} Entries → {calculateFinalEntries(selectedPackage.entries)} Total
              </div>
              <div className="text-gray-400 text-xs sm:text-sm">
                ({userVipTier} VIP {userVipMultiplier}x multiplier applied)
              </div>
            </div>

            {paymentStep === 'select' && (
              <>
                {/* Currency Selection */}
                <div className="mb-6">
                  <h5 className="text-base sm:text-lg font-bold text-white mb-4 text-center">Select Payment Currency:</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {(['SOL', 'USDC', 'ALPHA'] as PaymentCurrency[]).map((currency) => (
                      <button
                        key={currency}
                        onClick={() => setSelectedCurrency(currency)}
                        disabled={pricingLoading || isProcessing}
                        className={`p-3 sm:p-4 rounded-xl border transition-all ${
                          selectedCurrency === currency
                            ? 'border-purple-500 bg-purple-900/30'
                            : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
                        } ${pricingLoading || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="text-center">
                          <div className="text-base sm:text-lg font-bold text-white">
                            {dynamicPricing ? (
                              currency === 'SOL' ? calculateDynamicAmount(selectedPackage.price, currency).toFixed(4) :
                              currency === 'USDC' ? calculateDynamicAmount(selectedPackage.price, currency).toFixed(2) :
                              Math.floor(calculateDynamicAmount(selectedPackage.price, currency)).toLocaleString()
                            ) : '...'} {currency}
                          </div>
                          {dynamicPricing && (
                            <div className="text-xs text-green-400 mt-1">
                              ≈ ${selectedPackage.price}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  {pricingLoading && (
                    <p className="text-center text-yellow-400 text-sm mt-2">
                      Loading real-time prices...
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={handlePurchaseCancel}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={processPayment}
                    disabled={!dynamicPricing || isProcessing}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white py-3 px-6 rounded-xl transition-opacity disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Confirm Purchase'}
                  </button>
                </div>
              </>
            )}

            {/* Processing Step */}
            {paymentStep === 'confirming' && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-white text-lg mb-2">Processing Payment...</p>
                <p className="text-gray-400 text-sm">Please confirm the transaction in your wallet</p>
              </div>
            )}

            {/* Success Step */}
            {paymentStep === 'success' && (
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-white text-lg mb-2">Purchase Successful!</p>
                <p className="text-green-400 text-sm">
                  You received {calculateFinalEntries(selectedPackage.entries)} entries for this giveaway
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};