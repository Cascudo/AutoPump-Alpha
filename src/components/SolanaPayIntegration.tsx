// src/components/SolanaPayIntegration.tsx - FIXED: Proper payment flow & modal management
import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useVipSubscriptionStore, VipTier } from '../stores/useVipSubscriptionStore';
import useNotificationStore from '../stores/useNotificationStore';
import { MarketDataService } from '../utils/marketDataService';
import Image from 'next/image';

interface SolanaPayIntegrationProps {
  tier: VipTier;
  onSuccess: () => void;
  onCancel: () => void;
}

type PaymentCurrency = 'SOL' | 'USDC' | 'ALPHA';

interface TierPricing {
  tier: VipTier;
  usdPrice: number;
  features: string[];
  multiplier: number;
  baselineEntries: number;
}

const TIER_PRICING: Record<VipTier, TierPricing> = {
  'None': { tier: 'None', usdPrice: 0, features: [], multiplier: 1, baselineEntries: 0 },
  'Silver': {
    tier: 'Silver',
    usdPrice: 7.99,
    features: ['2x daily chances', '2 baseline entries/month', 'Partner offers access', 'Priority support'],
    multiplier: 2,
    baselineEntries: 2
  },
  'Gold': {
    tier: 'Gold', 
    usdPrice: 17.99,
    features: ['3x daily chances', '3 baseline entries/month', 'Exclusive events', 'Premium support'],
    multiplier: 3,
    baselineEntries: 3
  },
  'Platinum': {
    tier: 'Platinum',
    usdPrice: 27.99,
    features: ['5x daily chances', '5 baseline entries/month', 'VIP-only draws', 'White-glove support'],
    multiplier: 5,
    baselineEntries: 5
  },
  'VIP Bronze': {
    tier: 'VIP Bronze',
    usdPrice: 7.99,
    features: ['2x daily chances', '2 baseline entries/month', 'VIP badge'],
    multiplier: 2,
    baselineEntries: 2
  },
  'VIP Silver': {
    tier: 'VIP Silver',
    usdPrice: 17.99,
    features: ['3x daily chances', '3 baseline entries/month', 'Exclusive events'],
    multiplier: 3,
    baselineEntries: 3
  },
  'VIP Diamond': {
    tier: 'VIP Diamond',
    usdPrice: 27.99,
    features: ['5x daily chances', '5 baseline entries/month', 'Direct dev access'],
    multiplier: 5,
    baselineEntries: 5
  }
};

// Updated payment destination wallets - PRODUCTION TREASURY
const PAYMENT_DESTINATIONS = {
  SOL: new PublicKey('7Nh2JqYkZxMCvXCGnX2ZNGEzUYFNoxuEYB5PemSoraGZ'),
  USDC: new PublicKey('7Nh2JqYkZxMCvXCGnX2ZNGEzUYFNoxuEYB5PemSoraGZ'),
  ALPHA: new PublicKey('7Nh2JqYkZxMCvXCGnX2ZNGEzUYFNoxuEYB5PemSoraGZ')
};

// Token mint addresses
const TOKEN_MINTS = {
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  ALPHA: new PublicKey('4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump')
};

export const SolanaPayIntegration: React.FC<SolanaPayIntegrationProps> = ({
  tier,
  onSuccess,
  onCancel
}) => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const notificationStore = useNotificationStore();

  const [selectedCurrency, setSelectedCurrency] = useState<PaymentCurrency>('SOL');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // ✅ FIXED: Better payment state management
  const [paymentStep, setPaymentStep] = useState<'select' | 'confirming' | 'creating-subscription' | 'complete'>('select');
  const [paymentSignature, setPaymentSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [dynamicPrices, setDynamicPrices] = useState<{sol: number; alpha: number} | null>(null);

  const tierInfo = TIER_PRICING[tier];

  // Fetch real-time prices for dynamic calculation
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const marketService = MarketDataService.getInstance();
        const data = await marketService.getMarketData();
        setDynamicPrices({
          sol: data.solPriceUSD,
          alpha: data.tokenPriceUSD
        });
      } catch (error) {
        console.error('Price fetch error:', error);
        setDynamicPrices({ sol: 200, alpha: 0.00005 });
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate dynamic pricing based on current market prices
  const calculateDynamicAmount = (currency: PaymentCurrency): number => {
    if (!dynamicPrices) return 0;
    
    switch (currency) {
      case 'SOL':
        return tierInfo.usdPrice / dynamicPrices.sol;
      case 'USDC':
        return tierInfo.usdPrice; // USDC is 1:1 with USD
      case 'ALPHA':
        return tierInfo.usdPrice / dynamicPrices.alpha;
      default:
        return 0;
    }
  };

  const currentAmount = calculateDynamicAmount(selectedCurrency);

  // ✅ FIXED: Proper payment flow with clear steps
  const processPayment = useCallback(async () => {
    if (!publicKey || !tierInfo || tier === 'None' || !dynamicPrices) {
      setError('Please connect wallet and wait for prices to load');
      return;
    }

    console.log('🎯 FIXED: Starting payment process...');
    setIsProcessing(true);
    setError(null);
    setPaymentStep('confirming');

    try {
      // Step 1: Create and send transaction
      console.log('📝 Creating transaction...');
      let transaction: Transaction;
      let paymentAmount = currentAmount;

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

      } else {
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
            Math.floor(paymentAmount * 1_000_000), //  6 decimals for ALPHA
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log('📤 Sending transaction...');
      
      // Send transaction (this opens wallet modal)
      const signature = await sendTransaction(transaction, connection);
      setPaymentSignature(signature);
      
      console.log('✅ Transaction sent:', signature);
      
      // ✅ FIXED: Wait for confirmation BEFORE proceeding
      console.log('⏳ Waiting for confirmation...');
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
      }

      console.log('✅ Payment confirmed on blockchain');
      
      // Step 2: ONLY NOW create subscription (after payment is confirmed)
      console.log('📝 Creating subscription in database...');
      setPaymentStep('creating-subscription');

      const dbTier = tier === 'VIP Bronze' ? 'Silver' : 
                   tier === 'VIP Silver' ? 'Gold' : 
                   tier === 'VIP Diamond' ? 'Platinum' : tier as 'Silver' | 'Gold' | 'Platinum';

      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          tier: dbTier,
          paymentTx: signature,
          paymentAmount: tierInfo.usdPrice,
          paymentCurrency: selectedCurrency
        })
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to activate subscription in database');
      }

      console.log('✅ Subscription created successfully:', result);
      
      // Step 3: Success
      setPaymentStep('complete');
      
      // Show success notification
      notificationStore.set((state: any) => {
        state.notifications.push({
          type: 'success',
          message: `🎉 ${tier} VIP Activated!`,
          description: `${tierInfo.multiplier}x multiplier + ${tierInfo.baselineEntries} baseline entries/month`,
          txid: signature
        });
      });
      
      // Note: Modal now stays open for user interaction instead of auto-closing

    } catch (error) {
      console.error('❌ Payment process failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setError(errorMessage);
      setPaymentStep('select'); // Reset to allow retry
      
      // Show error notification
      notificationStore.set((state: any) => {
        state.notifications.push({
          type: 'error',
          message: 'Payment Failed',
          description: errorMessage,
          txid: paymentSignature || undefined
        });
      });
      
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, connection, sendTransaction, tier, selectedCurrency, currentAmount, dynamicPrices, notificationStore, tierInfo, paymentSignature]);

  // ✅ ENHANCED: Success screen with navigation to giveaways
  if (paymentStep === 'complete') {
    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold text-white mb-4">
          {tier} Activated!
        </h3>
        <p className="text-gray-300 mb-4">
          Your {tier} membership is now active!
        </p>
        
        {/* VIP Benefits Summary */}
        <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-xl p-4 mb-6 border border-purple-500/30">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-purple-400">{tierInfo.multiplier}x</div>
              <div className="text-xs text-gray-300">Entry Multiplier</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-400">+{tierInfo.baselineEntries}</div>
              <div className="text-xs text-gray-300">Baseline/Month</div>
            </div>
          </div>
        </div>
        
        {/* Success Checklist */}
        <div className="bg-green-900/30 rounded-xl p-4 border border-green-500/20 mb-6">
          <div className="text-green-400 font-semibold text-sm space-y-1">
            <div>✅ Payment Confirmed</div>
            <div>✅ Subscription Activated</div>
            <div>✅ Multiplier Applied</div>
            <div>✅ Baseline Entries Started</div>
          </div>
        </div>
        
        {/* Updated Buttons - Navigate to Existing Giveaway System */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              onSuccess(); // Close modal
              // Use Next.js router instead of window.location
              import('next/router').then(({ default: router }) => {
                router.push('/giveaway');
              });
            }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-bold transition-all transform hover:scale-105"
          >
            🎁 See Active Giveaways
          </button>
          
          <button
            onClick={onSuccess}
            className="text-gray-400 hover:text-gray-300 text-sm underline"
          >
            Continue to Dashboard
          </button>
        </div>
        
        <div className="mt-4 text-xs text-gray-400">
          🚀 Your VIP benefits are active immediately!
        </div>
      </div>
    );
  }

  // ✅ FIXED: Processing screen with clear steps
  if (paymentStep === 'confirming') {
    return (
      <div className="text-center p-8">
        <div className="animate-spin text-4xl mb-4">💳</div>
        <h3 className="text-xl font-bold text-white mb-4">
          Confirming Payment...
        </h3>
        <p className="text-gray-300 mb-4">
          Please approve the transaction in your wallet
        </p>
        <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-500/20">
          <div className="text-blue-400">
            💰 {selectedCurrency === 'SOL' ? `${currentAmount.toFixed(4)} SOL` :
              selectedCurrency === 'USDC' ? `${currentAmount.toFixed(2)} USDC` :
              `${Math.floor(currentAmount).toLocaleString()} ALPHA`} → {tier}
          </div>
          <div className="text-blue-300 text-sm mt-2">
            Waiting for blockchain confirmation...
          </div>
        </div>
        <button
          onClick={() => {
            setPaymentStep('select');
            setIsProcessing(false);
          }}
          className="mt-4 text-gray-400 hover:text-gray-300 text-sm underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (paymentStep === 'creating-subscription') {
    return (
      <div className="text-center p-8">
        <div className="animate-spin text-4xl mb-4">⚙️</div>
        <h3 className="text-xl font-bold text-white mb-4">
          Activating Subscription...
        </h3>
        <p className="text-gray-300 mb-4">
          Payment confirmed! Setting up your VIP benefits...
        </p>
        <div className="bg-green-900/30 rounded-xl p-4 border border-green-500/20">
          <div className="text-green-400 font-semibold">✅ Payment Confirmed</div>
          <div className="text-yellow-400 font-semibold">⏳ Activating Subscription</div>
          <div className="text-gray-400 font-semibold">⏳ Setting up Multiplier</div>
          <div className="text-gray-400 font-semibold">⏳ Granting Baseline Entries</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      
      {/* ✅ FIXED: Show error prominently */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/20 rounded-xl p-4 mb-6">
          <div className="text-red-400 font-semibold mb-2">❌ Payment Error</div>
          <div className="text-red-300 text-sm">{error}</div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-200 hover:text-red-100 text-sm underline"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Subscription Summary */}
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl p-6 border border-purple-500/20 mb-6">
        <h3 className="text-xl font-bold text-white mb-4 text-center">
          Subscribe to {tier}
        </h3>
        
        <div className="space-y-3 mb-6">
          {tierInfo.features.map((feature, idx) => (
            <div key={idx} className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-gray-300">{feature}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {tierInfo.multiplier}x
            </div>
            <div className="text-gray-400 text-sm">Daily Multiplier</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              +{tierInfo.baselineEntries}
            </div>
            <div className="text-gray-400 text-sm">Baseline/Month</div>
          </div>
        </div>

        {/* Early Bird Bonus Notice */}
        <div className="bg-orange-900/30 rounded-xl p-3 border border-orange-500/20 text-center">
          <div className="text-orange-400 font-semibold text-sm">
            🎯 Early Bird Special: +1 Bonus Entry
          </div>
          <div className="text-orange-300 text-xs">Limited time offer (48 hours)</div>
        </div>
      </div>

      {/* Currency Selection */}
      <div className="mb-6">
        <h4 className="text-white font-semibold mb-4">Choose Payment Method</h4>
        <div className="grid grid-cols-3 gap-3">
          {(['SOL', 'USDC', 'ALPHA'] as PaymentCurrency[]).map((currency) => (
            <button
              key={currency}
              onClick={() => setSelectedCurrency(currency)}
              disabled={!dynamicPrices || isProcessing}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedCurrency === currency
                  ? 'border-purple-500 bg-purple-900/30'
                  : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
              } ${!dynamicPrices || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-center">
                <div className="text-lg font-bold text-white">
                  {dynamicPrices ? (
                    currency === 'SOL' ? calculateDynamicAmount(currency).toFixed(4) :
                    currency === 'USDC' ? calculateDynamicAmount(currency).toFixed(2) :
                    Math.floor(calculateDynamicAmount(currency)).toLocaleString()
                  ) : '...'} {currency}
                </div>
                <div className="text-xs text-gray-400">/month</div>
                {dynamicPrices && (
                  <div className="text-xs text-green-400 mt-1">
                    ≈ ${tierInfo.usdPrice}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
        {!dynamicPrices && (
          <p className="text-center text-yellow-400 text-sm mt-2">
            Loading real-time prices...
          </p>
        )}
      </div>

      {/* Payment Summary */}
      <div className="bg-gray-800 rounded-xl p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Subscription</span>
          <span className="text-white">{tier}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Duration</span>
          <span className="text-white">30 days</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Multiplier</span>
          <span className="text-white">{tierInfo.multiplier}x daily chances</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Baseline Entries</span>
          <span className="text-white">+{tierInfo.baselineEntries} per month</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Payment</span>
          <span className="text-white">
            {dynamicPrices ? (
              selectedCurrency === 'SOL' ? `${currentAmount.toFixed(4)} SOL` :
              selectedCurrency === 'USDC' ? `${currentAmount.toFixed(2)} USDC` :
              `${Math.floor(currentAmount).toLocaleString()} ALPHA`
            ) : 'Loading...'}
          </span>
        </div>
        {dynamicPrices && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Live Price</span>
            <span className="text-green-400 text-sm">
              {selectedCurrency === 'SOL' ? `$${dynamicPrices.sol.toFixed(2)}/SOL` :
               selectedCurrency === 'ALPHA' ? `$${dynamicPrices.alpha.toFixed(8)}/ALPHA` :
               '$1.00/USDC'}
            </span>
          </div>
        )}
        <div className="border-t border-gray-600 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-white font-semibold">Total USD Value</span>
            <span className="text-purple-400 font-bold text-lg">
              ${tierInfo.usdPrice}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all"
          disabled={isProcessing}
        >
          Cancel
        </button>
        <button
          onClick={processPayment}
          disabled={isProcessing || !publicKey || !dynamicPrices}
          className="flex-1 py-3 px-6 bg-black hover:bg-gray-900 text-white rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
        >
          {isProcessing ? (
            'Processing...'
          ) : !dynamicPrices ? (
            'Loading prices...'
          ) : (
            <>
              <span>Continue with</span>
              <Image src="/solana-pay-white.png" alt="Solana Pay" width={60} height={12} className="ml-2" />
            </>
          )}
        </button>
      </div>

      {/* Security Notice */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">
          🔒 Secure payment via Solana blockchain • No credit card required
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Treasury: 7Nh2JqY...raGZ • Real-time pricing • Cancel anytime
        </p>
        {dynamicPrices && (
          <p className="text-xs text-green-400 mt-1">
            Live prices: SOL ${dynamicPrices.sol.toFixed(2)} • ALPHA ${dynamicPrices.alpha.toFixed(8)}
          </p>
        )}
      </div>
    </div>
  );
};