// src/pages/api/promotional-giveaways/purchase-entries.ts
// FOCUSED FIX: Add SPL token verification using existing MarketDataService
import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { supabase, getAdminSupabaseClient } from '../../../utils/supabaseClient';
import { MarketDataService } from '../../../utils/marketDataService';

const VIP_MULTIPLIERS = {
  'None': 1,
  'Silver': 2,
  'Gold': 3,
  'Platinum': 5
};

// ALPHA token mint address
const ALPHA_MINT = new PublicKey('4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// SECURITY: Our payment destinations (verify money came to US)
const PAYMENT_DESTINATIONS = {
  SOL: new PublicKey('7Nh2JqYkZxMCvXCGnX2ZNGEzUYFNoxuEYB5PemSoraGZ'),
  USDC: new PublicKey('7Nh2JqYkZxMCvXCGnX2ZNGEzUYFNoxuEYB5PemSoraGZ'),
  ALPHA: new PublicKey('7Nh2JqYkZxMCvXCGnX2ZNGEzUYFNoxuEYB5PemSoraGZ')
};

// SECURITY: Payment tolerance (5% as requested)
const PAYMENT_TOLERANCE = 0.05;

// 🎯 OPTIMIZED: Enhanced RPC configuration (no public RPC)
const getRPCEndpoints = () => [
  {
    url: process.env.SOLANA_RPC_BACKUP_1, // Helius (PRIMARY - most reliable)
    name: 'Helius',
    timeout: 8000,
    retries: 3
  },
  {
    url: process.env.NEXT_PUBLIC_SOLANA_RPC_URL, // Syndica (backup)
    name: 'Syndica', 
    timeout: 6000,
    retries: 2
  },
  {
    url: process.env.SOLANA_RPC_BACKUP_2, // Solscan Pro
    name: 'Solscan Pro',
    timeout: 10000,
    retries: 2
  }
].filter(endpoint => endpoint.url); // Remove undefined endpoints

// 🎯 NEW: Enhanced payment verification with SPL token support
async function verifyPaymentAmount(
  transactionInfo: any,
  userWallet: string,
  expectedUSD: number,
  paymentCurrency: string
): Promise<{
  success: boolean;
  error?: string;
  details?: any;
  actualPaymentUSD?: number;
  actualPaymentAmount?: number;
}> {
  console.log('💰 Starting enhanced payment verification:', {
    expectedUSD,
    paymentCurrency,
    userWallet: userWallet.slice(0, 8) + '...'
  });

  // Check if transaction failed
  if (transactionInfo.meta?.err) {
    return {
      success: false,
      error: 'Transaction failed on blockchain',
      details: transactionInfo.meta.err
    };
  }

  const accountKeys = transactionInfo.transaction.message.accountKeys;
  const preBalances = transactionInfo.meta?.preBalances || [];
  const postBalances = transactionInfo.meta?.postBalances || [];

  // Verify transaction came from user's wallet
  const userPubkey = new PublicKey(userWallet);
  const userAccountIndex = accountKeys.findIndex(key => 
    key.equals ? key.equals(userPubkey) : key.toString() === userWallet
  );

  if (userAccountIndex === -1) {
    return {
      success: false,
      error: 'Transaction was not sent from your wallet'
    };
  }

  // Get current market prices using your existing MarketDataService
  console.log('📊 Fetching market data from existing MarketDataService...');
  const marketService = MarketDataService.getInstance();
  const marketData = await marketService.getMarketData();
  
  console.log('✅ Market data loaded:', {
    solPrice: `$${marketData.solPriceUSD.toFixed(2)}`,
    alphaPrice: `$${marketData.tokenPriceUSD.toFixed(8)}`,
    source: marketData.dataSource
  });

  let actualPaymentAmount = 0;
  let actualPaymentUSD = 0;

  // 🎯 CURRENCY-SPECIFIC VERIFICATION
  if (paymentCurrency === 'SOL') {
    // SOL payment verification (existing logic)
    const userPreBalance = preBalances[userAccountIndex] || 0;
    const userPostBalance = postBalances[userAccountIndex] || 0;
    const lamportsPaid = userPreBalance - userPostBalance;
    actualPaymentAmount = lamportsPaid / 1_000_000_000; // Convert to SOL
    actualPaymentUSD = actualPaymentAmount * marketData.solPriceUSD;

    console.log('💎 SOL payment verification:', {
      lamportsPaid,
      solPaid: actualPaymentAmount,
      usdValue: actualPaymentUSD
    });

  } else if (paymentCurrency === 'USDC') {
    // USDC SPL token verification
    const tokenMint = USDC_MINT.toString();
    console.log('🪙 Verifying USDC token payment');

    const preTokenBalances = transactionInfo.meta?.preTokenBalances || [];
    const postTokenBalances = transactionInfo.meta?.postTokenBalances || [];

    let tokenTransferFound = false;

    for (const preBalance of preTokenBalances) {
      if (preBalance.mint === tokenMint) {
        const postBalance = postTokenBalances.find(
          (post: any) => post.accountIndex === preBalance.accountIndex
        );
        
        if (postBalance) {
          const preAmount = parseFloat(preBalance.uiTokenAmount.amount);
          const postAmount = parseFloat(postBalance.uiTokenAmount.amount);
          const transferred = preAmount - postAmount;

          if (transferred > 0) {
            actualPaymentAmount = transferred / Math.pow(10, 6); // USDC has 6 decimals
            actualPaymentUSD = actualPaymentAmount * 1.0; // USDC = $1.00
            tokenTransferFound = true;

            console.log('✅ USDC transfer found:', {
              preAmount,
              postAmount,
              transferred,
              usdcTransferred: actualPaymentAmount,
              usdValue: actualPaymentUSD
            });
            break;
          }
        }
      }
    }

    if (!tokenTransferFound) {
      return {
        success: false,
        error: 'No USDC token transfer found in transaction'
      };
    }

  } else if (paymentCurrency === 'ALPHA') {
    // ALPHA SPL token verification
    const tokenMint = ALPHA_MINT.toString();
    console.log('🪙 Verifying ALPHA token payment');

    const preTokenBalances = transactionInfo.meta?.preTokenBalances || [];
    const postTokenBalances = transactionInfo.meta?.postTokenBalances || [];

    let tokenTransferFound = false;

    for (const preBalance of preTokenBalances) {
      if (preBalance.mint === tokenMint) {
        const postBalance = postTokenBalances.find(
          (post: any) => post.accountIndex === preBalance.accountIndex
        );
        
        if (postBalance) {
          const preAmount = parseFloat(preBalance.uiTokenAmount.amount);
          const postAmount = parseFloat(postBalance.uiTokenAmount.amount);
          const transferred = preAmount - postAmount;

          if (transferred > 0) {
            actualPaymentAmount = transferred / Math.pow(10, 6); // ALPHA has 6 decimals
            actualPaymentUSD = actualPaymentAmount * marketData.tokenPriceUSD;
            tokenTransferFound = true;

            console.log('✅ ALPHA transfer found:', {
              preAmount,
              postAmount,
              transferred,
              alphaTransferred: actualPaymentAmount,
              usdValue: actualPaymentUSD
            });
            break;
          }
        }
      }
    }

    if (!tokenTransferFound) {
      return {
        success: false,
        error: 'No ALPHA token transfer found in transaction'
      };
    }

  } else {
    return {
      success: false,
      error: `Unsupported payment currency: ${paymentCurrency}`
    };
  }

  // Verify payment amount is within tolerance
  const expectedMinUSD = expectedUSD * (1 - PAYMENT_TOLERANCE);
  const expectedMaxUSD = expectedUSD * (1 + PAYMENT_TOLERANCE);

  console.log('🎯 Payment amount verification:', {
    expectedUSD,
    actualPaymentUSD,
    tolerance: `${(PAYMENT_TOLERANCE * 100)}%`,
    minAllowed: expectedMinUSD,
    maxAllowed: expectedMaxUSD,
    withinRange: actualPaymentUSD >= expectedMinUSD && actualPaymentUSD <= expectedMaxUSD
  });

  if (actualPaymentUSD < expectedMinUSD || actualPaymentUSD > expectedMaxUSD) {
    return {
      success: false,
      error: `Payment amount mismatch. Expected: $${expectedUSD}, Actual: $${actualPaymentUSD.toFixed(4)} (${actualPaymentAmount.toFixed(4)} ${paymentCurrency})`,
      details: {
        expectedUSD,
        actualPaymentUSD,
        actualPaymentAmount,
        paymentCurrency,
        tolerance: `${(PAYMENT_TOLERANCE * 100)}%`
      }
    };
  }

  return {
    success: true,
    actualPaymentUSD,
    actualPaymentAmount
  };
}

// 🎯 OPTIMIZED: Intelligent transaction verification with timing awareness
async function verifyTransactionWithIntelligentTiming(
  paymentTransaction: string,
  userWallet: string,
  expectedUSD: number,
  paymentCurrency: string
) {
  console.log('🔒 Starting OPTIMIZED blockchain verification...');
  
  // 🎯 CRITICAL FIX: Wait for blockchain indexing before first attempt (10 seconds as requested)
  console.log('⏳ Waiting 10 seconds for transaction indexing...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  const endpoints = getRPCEndpoints();
  let lastError: Error | null = null;
  
  for (let endpointIndex = 0; endpointIndex < endpoints.length; endpointIndex++) {
    const endpoint = endpoints[endpointIndex];
    console.log(`🔄 Trying RPC ${endpointIndex + 1}/${endpoints.length}: ${endpoint.name}`);
    
    try {
      const connection = new Connection(endpoint.url, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: endpoint.timeout
      });
      
      // 🎯 OPTIMIZED: Enhanced retry logic with exponential backoff
      for (let attempt = 0; attempt < endpoint.retries; attempt++) {
        try {
          console.log(`  📡 Attempt ${attempt + 1}/${endpoint.retries} on ${endpoint.name}`);
          
          const transactionInfo = await connection.getTransaction(paymentTransaction, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
          });
          
          if (transactionInfo) {
            console.log(`✅ Transaction found on ${endpoint.name} (attempt ${attempt + 1})`);
            
            // 🎯 ENHANCED: Multi-currency verification using your MarketDataService
            const verificationResult = await verifyPaymentAmount(
              transactionInfo, 
              userWallet, 
              expectedUSD, 
              paymentCurrency
            );
            
            if (verificationResult.success) {
              return {
                success: true,
                transactionInfo,
                actualPaymentUSD: verificationResult.actualPaymentUSD,
                actualPaymentAmount: verificationResult.actualPaymentAmount,
                rpcEndpoint: endpoint.name,
                attemptsUsed: attempt + 1
              };
            } else {
              return { success: false, error: verificationResult.error, details: verificationResult.details };
            }
          }
          
          // 🎯 OPTIMIZED: Exponential backoff for retries
          if (attempt < endpoint.retries - 1) {
            const delay = Math.min(2000 * Math.pow(2, attempt), 10000); // Max 10 seconds
            console.log(`  ⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
        } catch (attemptError) {
          console.log(`  ❌ Attempt ${attempt + 1} failed: ${attemptError.message}`);
          lastError = attemptError as Error;
          
          if (attempt < endpoint.retries - 1) {
            const delay = Math.min(1500 * Math.pow(2, attempt), 8000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
    } catch (endpointError) {
      console.error(`❌ ${endpoint.name} completely failed:`, endpointError.message);
      lastError = endpointError as Error;
    }
    
    // Small delay before trying next RPC
    if (endpointIndex < endpoints.length - 1) {
      console.log('  🔄 Switching to next RPC...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // All RPCs failed
  return {
    success: false,
    error: 'Transaction not found on any RPC endpoint after extended search',
    details: `Tried ${endpoints.length} RPC endpoints with intelligent timing`,
    canRetry: true,
    lastError: lastError?.message,
    suggestion: 'Transaction may be very recent or network congested. Wait 30 seconds and try again.'
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      giveawayId,
      packageId,
      userWallet,
      paymentTransaction,
      paymentCurrency,
      paymentMethod
    } = req.body;

    // 🎯 FLEXIBLE: Accept both field names for future Stripe integration
    const currency = paymentCurrency || paymentMethod || 'SOL';

    console.log('🎯 ENHANCED Multi-currency purchase request:', {
      giveawayId: giveawayId?.slice(0, 8),
      packageId,
      userWallet: userWallet?.slice(0, 8),
      paymentTransaction: paymentTransaction?.slice(0, 8),
      paymentCurrency: currency
    });

    // SECURITY: Validate required fields
    if (!giveawayId || !packageId || !userWallet || !paymentTransaction) {
      return res.status(400).json({ 
        error: 'Missing required fields: giveawayId, packageId, userWallet, paymentTransaction' 
      });
    }

    // SECURITY: Validate payment currency
    if (!['SOL', 'USDC', 'ALPHA'].includes(currency)) {
      return res.status(400).json({ 
        error: 'Invalid payment currency. Supported: SOL, USDC, ALPHA' 
      });
    }

    // SECURITY: Validate wallet format
    try {
      new PublicKey(userWallet);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    const adminSupabase = getAdminSupabaseClient();

    // SECURITY: Check for duplicate transaction FIRST (prevent replay attacks)
    const { data: existingPurchase } = await adminSupabase
      .from('promotional_entry_purchases')
      .select('id, final_entries_awarded, user_wallet')
      .eq('payment_tx', paymentTransaction)
      .single();

    if (existingPurchase) {
      if (existingPurchase.user_wallet !== userWallet) {
        return res.status(403).json({ 
          error: 'Transaction belongs to different wallet' 
        });
      }

      console.log('✅ Transaction already processed securely');
      return res.status(200).json({ 
        success: true,
        purchaseId: existingPurchase.id,
        entriesAwarded: existingPurchase.final_entries_awarded,
        message: 'Purchase already completed',
        alreadyProcessed: true
      });
    }

    // 1. Get giveaway and validate package
    const { data: giveaway, error: giveawayError } = await adminSupabase
      .from('promotional_giveaways')
      .select('*')
      .eq('id', giveawayId)
      .single();

    if (giveawayError || !giveaway) {
      return res.status(404).json({ error: 'Giveaway not found' });
    }

    const selectedPackage = giveaway.entry_packages?.find(pkg => pkg.id === packageId);
    if (!selectedPackage) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // 2. Get user VIP tier for multiplier calculation
    const { data: userData } = await adminSupabase
      .from('users')
      .select('vip_tier')
      .eq('wallet_address', userWallet)
      .single();

    const vipTier = userData?.vip_tier || 'None';
    const vipMultiplier = VIP_MULTIPLIERS[vipTier as keyof typeof VIP_MULTIPLIERS] || 1;
    const finalEntries = Math.floor(selectedPackage.entries * vipMultiplier);

    // 3. 🎯 ENHANCED: Multi-currency blockchain verification using your MarketDataService
    const verificationResult = await verifyTransactionWithIntelligentTiming(
      paymentTransaction,
      userWallet,
      selectedPackage.price, // This is the USD price
      currency
    );

    if (!verificationResult.success) {
      console.error('❌ Payment verification failed:', verificationResult.error);
      return res.status(400).json({ 
        error: verificationResult.error,
        details: verificationResult.details,
        canRetry: verificationResult.canRetry,
        suggestion: verificationResult.suggestion,
        lastError: verificationResult.lastError
      });
    }

    console.log('🔒✅ ENHANCED Multi-currency payment verification successful:', {
      rpcEndpoint: verificationResult.rpcEndpoint,
      attemptsUsed: verificationResult.attemptsUsed,
      actualPaymentUSD: verificationResult.actualPaymentUSD,
      actualPaymentAmount: verificationResult.actualPaymentAmount,
      paymentCurrency
    });

    // 4. Create purchase record
    const { data: purchase, error: purchaseError } = await adminSupabase
      .from('promotional_entry_purchases')
      .insert({
        giveaway_id: giveawayId,
        user_wallet: userWallet,
        purchase_amount: verificationResult.actualPaymentAmount, // Amount in native currency
        entries_purchased: selectedPackage.entries,
        vip_multiplier: vipMultiplier,
        final_entries_awarded: finalEntries,
        payment_tx: paymentTransaction,
        payment_currency: currency,
        payment_status: 'confirmed'
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('❌ Purchase creation failed:', purchaseError);
      return res.status(500).json({ 
        error: 'Failed to create purchase record',
        details: purchaseError.message 
      });
    }

    // 5. Update giveaway entry record
    const { data: existingEntry } = await adminSupabase
      .from('promotional_giveaway_entries')
      .select('*')
      .eq('giveaway_id', giveawayId)
      .eq('user_wallet', userWallet)
      .single();

    if (existingEntry) {
      // Update existing entry
      const newPurchasedEntries = existingEntry.purchased_entries + selectedPackage.entries;
      const newFinalEntries = Math.floor((existingEntry.base_entries + newPurchasedEntries) * vipMultiplier);
      
      const { error: updateError } = await adminSupabase
        .from('promotional_giveaway_entries')
        .update({
          purchased_entries: newPurchasedEntries,
          final_entries: newFinalEntries,
          total_spent: (existingEntry.total_spent || 0) + verificationResult.actualPaymentUSD,
          payment_transactions: [
            ...(existingEntry.payment_transactions || []),
            paymentTransaction
          ],
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEntry.id);

      if (updateError) {
        console.error('❌ Entry update failed:', updateError);
        return res.status(500).json({ 
          error: 'Purchase recorded but failed to update entry count',
          details: updateError.message 
        });
      }
    } else {
      // Create new entry
      const { error: createError } = await adminSupabase
        .from('promotional_giveaway_entries')
        .insert({
          giveaway_id: giveawayId,
          user_wallet: userWallet,
          base_entries: 0, // Only from ALPHA holdings
          purchased_entries: selectedPackage.entries,
          vip_multiplier: vipMultiplier,
          final_entries: finalEntries,
          total_spent: verificationResult.actualPaymentUSD,
          payment_transactions: [paymentTransaction]
        });

      if (createError) {
        console.error('❌ Entry creation failed:', createError);
        return res.status(500).json({ 
          error: 'Purchase recorded but failed to create entry record',
          details: createError.message 
        });
      }
    }

    console.log('🔒✅ ENHANCED Multi-currency purchase completed successfully:', {
      purchaseId: purchase.id,
      userWallet: userWallet.slice(0, 8),
      packageName: selectedPackage.name,
      entriesAwarded: finalEntries,
      actualPaymentUSD: verificationResult.actualPaymentUSD,
      actualPaymentAmount: verificationResult.actualPaymentAmount,
      paymentCurrency: currency,
      rpcEndpoint: verificationResult.rpcEndpoint,
      securityVerified: true
    });

    return res.status(200).json({
      success: true,
      purchaseId: purchase.id,
      packageName: selectedPackage.name,
      entriesAwarded: finalEntries,
      vipMultiplier,
      actualPaymentUSD: verificationResult.actualPaymentUSD,
      actualPaymentAmount: verificationResult.actualPaymentAmount,
      paymentCurrency: currency,
      rpcEndpointUsed: verificationResult.rpcEndpoint,
      attemptsUsed: verificationResult.attemptsUsed,
      securityVerified: true,
      message: `Successfully purchased ${selectedPackage.name} package with ${verificationResult.actualPaymentAmount.toFixed(4)} ${currency} and received ${finalEntries} entries!`
    });

  } catch (error) {
    console.error('🚨 ENHANCED Multi-currency Purchase API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}