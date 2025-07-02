// src/pages/api/get-user-subscription.ts - FIXED: Use service role client
import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSupabaseClient } from '../../utils/supabaseClient';

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20; // 20 requests per minute per IP

// Caching
const subscriptionCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

function checkRateLimit(clientIP: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const clientData = requestCounts.get(clientIP);

  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
    return { 
      allowed: false, 
      error: `Rate limit exceeded. Max ${MAX_REQUESTS_PER_WINDOW} requests per minute.` 
    };
  }

  clientData.count++;
  return { allowed: true };
}

function validateWalletAddress(walletAddress: string): { isValid: boolean; error?: string } {
  if (!walletAddress || typeof walletAddress !== 'string') {
    return { isValid: false, error: 'Wallet address is required' };
  }

  const trimmed = walletAddress.trim();
  if (trimmed.length < 32 || trimmed.length > 44) {
    return { isValid: false, error: 'Invalid wallet address format' };
  }

  return { isValid: true };
}

function getCachedSubscription(walletAddress: string): any {
  const cached = subscriptionCache.get(walletAddress);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log('📋 Using cached VIP subscription data (age: ' + 
      Math.floor((Date.now() - cached.timestamp) / 1000) + ' seconds)');
    return cached.data;
  }
  return null;
}

function setCachedSubscription(walletAddress: string, data: any): void {
  subscriptionCache.set(walletAddress, { data, timestamp: Date.now() });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Rate limiting by client IP
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection.remoteAddress || 
                    'unknown';

    const rateLimitCheck = checkRateLimit(clientIP as string);
    if (!rateLimitCheck.allowed) {
      console.warn('⏱️ Rate limit hit for VIP subscription check:', clientIP);
      return res.status(429).json({
        success: false,
        error: rateLimitCheck.error,
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / MAX_REQUESTS_PER_WINDOW / 1000)
      });
    }

    // Validate wallet address
    const { walletAddress } = req.query;
    const validation = validateWalletAddress(walletAddress as string);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const cleanWalletAddress = (walletAddress as string).trim();

    // Check cache first
    const cachedResult = getCachedSubscription(cleanWalletAddress);
    if (cachedResult !== null) {
      return res.status(200).json({
        success: true,
        subscription: cachedResult,
        cached: true
      });
    }

    console.log('🔍 Fetching fresh VIP subscription for:', cleanWalletAddress.slice(0, 8) + '...');
    console.log('🔍 Full wallet being searched:', cleanWalletAddress);

    // 🎯 FIXED: Use admin/service role client instead of regular supabase client
    const supabase = getAdminSupabaseClient();

    // Enhanced query to get all subscription data
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        user_wallet,
        tier,
        payment_tx,
        start_date,
        end_date,
        status,
        payment_amount,
        payment_currency,
        baseline_entries_granted,
        early_bird_bonus,
        created_at
      `)
      .eq('user_wallet', cleanWalletAddress)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Database error fetching VIP subscription:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error occurred',
        details: error.message
      });
    }

    // If subscription found, sync the user table
    if (subscription) {
      console.log('✅ Active VIP subscription found:', {
        id: subscription.id,
        tier: subscription.tier,
        expires: new Date(subscription.end_date).toLocaleDateString(),
        baselineEntries: subscription.baseline_entries_granted
      });
      
      // Sync subscription data to user table
      try {
        const { error: syncError } = await supabase
          .from('users')
          .update({
            subscription_expiry: subscription.end_date,
            vip_tier: subscription.tier,
            baseline_entries_accumulated: subscription.baseline_entries_granted
          })
          .eq('wallet_address', cleanWalletAddress);
        
        if (syncError) {
          console.warn('⚠️ Failed to sync user table:', syncError);
        } else {
          console.log('✅ User table synced with subscription data');
        }
      } catch (syncError) {
        console.warn('⚠️ Sync error (non-critical):', syncError);
      }
      
    } else {
      console.log('ℹ️ No active VIP subscription found for:', cleanWalletAddress.slice(0, 8) + '...');
    }

    // Cache the result
    setCachedSubscription(cleanWalletAddress, subscription);

    return res.status(200).json({
      success: true,
      subscription: subscription || null,
      cached: false,
      debug: {
        walletChecked: cleanWalletAddress.slice(0, 8) + '...',
        hasActiveSubscription: !!subscription,
        tier: subscription?.tier || 'None',
        expiresAt: subscription?.end_date || null,
        subscriptionId: subscription?.id || null
      }
    });

  } catch (error) {
    console.error('❌ API error in get-user-subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}