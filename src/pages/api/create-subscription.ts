// ===============================================
// 🔒 SECURE VIP SUBSCRIPTION - ZERO REGRESSIONS
// src/pages/api/create-subscription.ts
// ✅ USES YOUR EXACT WORKING FUNCTIONS FROM purchase-entries.ts
// ✅ SAME RPC CONFIG, SAME VERIFICATION LOGIC
// ===============================================

import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAdminSupabaseClient } from '../../utils/supabaseClient';
import { MarketDataService } from '../../utils/marketDataService';

// ✅ EXACT COPY: VIP multipliers (from your code)
const VIP_MULTIPLIERS = {
  'None': 1,
  'Silver': 2,
  'Gold': 3,
  'Platinum': 5
};

// ✅ EXACT COPY: Token mints (from your code)
const ALPHA_MINT = new PublicKey('4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// ✅ EXACT COPY: Payment destinations (from your code)
const PAYMENT_DESTINATIONS = {
  SOL: new PublicKey('7Nh2JqYkZxMCvXCGnX2ZNGEzUYFNoxuEYB5PemSoraGZ'),
  USDC: new PublicKey('7Nh2JqYkZxMCvXCGnX2ZNGEzUYFNoxuEYB5PemSoraGZ'),
  ALPHA: new PublicKey('7Nh2JqYkZxMCvXCGnX2ZNGEzUYFNoxuEYB5PemSoraGZ')
};

// ✅ EXACT COPY: Payment tolerance (from your code)
const PAYMENT_TOLERANCE = 0.05;

// VIP Pricing (from your useVipSubscriptionStore.tsx)
const VIP_PRICING = {
  'Silver': 7.9,
  'Gold': 17.9,
  'Platinum': 27.9
} as const;

// Security: Rate limiting for VIP payments
const rateLimitMap = new Map<string, { lastRequest: number; count: number }>();
const RATE_LIMIT_WINDOW = 300000; // 5 minutes
const MAX_VIP_REQUESTS = 3; // Max 3 VIP attempts per 5 minutes

function checkRateLimit(walletAddress: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(walletAddress);
  
  if (!userLimit || now - userLimit.lastRequest > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(walletAddress, { lastRequest: now, count: 1 });
    return true;
  }
  
  if (userLimit.count >= MAX_VIP_REQUESTS) {
    return false;
  }
  
  userLimit.count++;
  userLimit.lastRequest = now;
  return true;
}

// ✅ EXACT COPY: RPC endpoints function (from your purchase-entries.ts)
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

// ✅ EXACT COPY: Payment verification function (from your purchase-entries.ts)
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
      if (preBalance.mint === tokenMint && preBalance.owner === userWallet) {
        const postBalance = postTokenBalances.find(
          post => post.mint === preBalance.mint && post.owner === preBalance.owner
        );
        
        if (postBalance) {
          const preAmount = parseFloat(preBalance.uiTokenAmount.amount);
          const postAmount = parseFloat(postBalance.uiTokenAmount.amount);
          const transferred = preAmount - postAmount;

          if (transferred > 0) {
            actualPaymentAmount = transferred / Math.pow(10, 6); // USDC has 6 decimals
            actualPaymentUSD = actualPaymentAmount; // USDC ≈ $1
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
    console.log('🔥 Verifying ALPHA token payment');

    const preTokenBalances = transactionInfo.meta?.preTokenBalances || [];
    const postTokenBalances = transactionInfo.meta?.postTokenBalances || [];

    let tokenTransferFound = false;

    for (const preBalance of preTokenBalances) {
      if (preBalance.mint === tokenMint && preBalance.owner === userWallet) {
        const postBalance = postTokenBalances.find(
          post => post.mint === preBalance.mint && post.owner === preBalance.owner
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

// ✅ EXACT COPY: Transaction verification function (from your purchase-entries.ts)
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
  console.log('🎯 === SECURE VIP SUBSCRIPTION START ===');
  console.log('Method:', req.method);
  console.log('Timestamp:', new Date().toISOString());

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      walletAddress,
      tier,
      paymentTx,
      paymentAmount,
      paymentCurrency,
      durationDays = 30
    } = req.body;

    console.log('📝 Secure VIP request:', {
      walletAddress: walletAddress?.slice(0, 8) + '...',
      tier,
      paymentAmount,
      paymentCurrency,
      paymentTx: paymentTx?.slice(0, 8) + '...'
    });

    // ✅ SECURITY: Validate wallet address format
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    try {
      new PublicKey(walletAddress);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // ✅ SECURITY: Rate limiting
    if (!checkRateLimit(walletAddress)) {
      return res.status(429).json({ 
        error: 'Too many VIP attempts. Please wait 5 minutes.',
        resetTime: Math.ceil(RATE_LIMIT_WINDOW / 1000)
      });
    }

    // Validate required fields
    if (!tier || !paymentTx || !paymentAmount || !paymentCurrency) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['walletAddress', 'tier', 'paymentTx', 'paymentAmount', 'paymentCurrency']
      });
    }

    // Validate tier
    if (!['Silver', 'Gold', 'Platinum'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid VIP tier' });
    }

    // Validate payment currency
    if (!['SOL', 'USDC', 'ALPHA'].includes(paymentCurrency)) {
      return res.status(400).json({ 
        error: 'Invalid payment currency. Supported: SOL, USDC, ALPHA' 
      });
    }

    const expectedUSD = VIP_PRICING[tier as keyof typeof VIP_PRICING];
    const supabase = getAdminSupabaseClient();

    // ✅ SECURITY: Check for duplicate transaction (prevent replay attacks)
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, user_wallet, tier')
      .eq('payment_tx', paymentTx)
      .single();

    if (existingSubscription) {
      if (existingSubscription.user_wallet !== walletAddress) {
        return res.status(403).json({ 
          error: 'Transaction belongs to different wallet' 
        });
      }

      console.log('✅ VIP subscription already processed');
      return res.status(200).json({ 
        success: true,
        message: 'VIP subscription already active',
        tier: existingSubscription.tier,
        alreadyProcessed: true
      });
    }

    console.log('🔒 Verifying VIP payment on blockchain using proven functions...');

    // 🔒 CRITICAL: Verify payment using your EXACT working function
    const verificationResult = await verifyTransactionWithIntelligentTiming(
      paymentTx,
      walletAddress,
      expectedUSD,
      paymentCurrency
    );

    if (!verificationResult.success) {
      console.error('❌ VIP payment verification failed:', verificationResult.error);
      return res.status(400).json({ 
        error: verificationResult.error || 'Payment verification failed',
        details: verificationResult.details,
        canRetry: verificationResult.canRetry,
        suggestion: verificationResult.suggestion,
        lastError: verificationResult.lastError
      });
    }

    console.log('🔒✅ VIP payment verification successful:', {
      rpcEndpoint: verificationResult.rpcEndpoint,
      attemptsUsed: verificationResult.attemptsUsed,
      actualPaymentUSD: verificationResult.actualPaymentUSD,
      actualPaymentAmount: verificationResult.actualPaymentAmount,
      paymentCurrency
    });

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (durationDays * 24 * 60 * 60 * 1000));

    // Calculate baseline entries based on tier
    const tierBaselineEntries = {
      'Silver': 2,
      'Gold': 3,
      'Platinum': 5
    };
    const baselineEntries = tierBaselineEntries[tier as keyof typeof tierBaselineEntries];

    console.log('💾 Creating secure VIP subscription...');

    // ✅ SECURITY: Create subscription with verified payment data
    const { data: newSubscription, error: createError } = await supabase
      .from('subscriptions')
      .insert({
        user_wallet: walletAddress,
        tier,
        payment_tx: paymentTx,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        payment_amount: verificationResult.actualPaymentAmount,
        payment_currency: paymentCurrency,
        status: 'active',
        auto_renew: false,
        early_bird_bonus: false,
        baseline_entries_granted: baselineEntries
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating subscription:', createError);
      return res.status(500).json({ 
        error: 'Failed to create subscription',
        details: createError.message,
        code: createError.code
      });
    }

    console.log('✅ New subscription created:', newSubscription.id);

    // Step 3: Check if user exists, create/update user record
    console.log('👤 Managing user record...');
    
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', userCheckError);
      // Continue anyway
    }

    if (existingUser) {
      console.log('✅ Updating existing user...');
      
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          vip_tier: tier,
          subscription_expiry: endDate.toISOString(),
          baseline_entries_accumulated: baselineEntries,
          subscription_start_date: startDate.toISOString(),
          months_subscribed: (existingUser.months_subscribed || 0) + 1
        })
        .eq('wallet_address', walletAddress);

      if (userUpdateError) {
        console.error('❌ Error updating user:', userUpdateError);
      } else {
        console.log('✅ User updated successfully');
      }
    } else {
      console.log('🆕 Creating new user record...');
      
      const { error: userCreateError } = await supabase
        .from('users')
        .insert({
          wallet_address: walletAddress,
          vip_tier: tier,
          subscription_expiry: endDate.toISOString(),
          baseline_entries_accumulated: baselineEntries,
          subscription_start_date: startDate.toISOString(),
          months_subscribed: 1,
          token_balance: 0,
          usd_value: 0,
          cached_entries: baselineEntries,
          is_eligible: true,
          balance_stale: true
        });

      if (userCreateError) {
        console.error('❌ Error creating user:', userCreateError);
      } else {
        console.log('✅ New user created successfully');
      }
    }

    console.log('🎉 === SECURE VIP SUBSCRIPTION COMPLETED ===');

    return res.status(200).json({
      success: true,
      type: 'new',
      subscription: newSubscription,
      baselineEntriesAwarded: baselineEntries,
      message: `${tier} VIP subscription activated successfully`,
      securityVerified: true,
      actualPaymentUSD: verificationResult.actualPaymentUSD,
      actualPaymentAmount: verificationResult.actualPaymentAmount,
      paymentCurrency: paymentCurrency,
      rpcEndpointUsed: verificationResult.rpcEndpoint,
      attemptsUsed: verificationResult.attemptsUsed,
      debug: {
        subscriptionId: newSubscription.id,
        tier,
        baselineEntries,
        expiresAt: endDate.toISOString()
      }
    });

  } catch (error) {
    console.error('💥 === CRITICAL ERROR IN VIP SUBSCRIPTION CREATION ===');
    console.error('Error:', error);
    
    return res.status(500).json({ 
      error: 'Internal server error during VIP subscription creation',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}