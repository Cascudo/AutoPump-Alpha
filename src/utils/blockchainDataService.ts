// src/utils/blockchainDataService.ts - SECURITY HARDENED VERSION
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';

export interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
  rank: number;
}

export interface TokenAnalytics {
  totalSupply: number;
  circulatingSupply: number;
  lockedSupply: number;
  holderCount: number;
  topHolders: TokenHolder[];
  concentration: {
    top10Percentage: number;
    top50Percentage: number;
    top100Percentage: number;
  };
  lastUpdated: number;
}

class BlockchainDataService {
  private connection: Connection;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MIN_BALANCE_THRESHOLD = 5; // Only holders with 5+ tokens
  private readonly DEV_LOCKED_AMOUNT = 100_000_000; // 100M tokens locked

  constructor(connection: Connection) {
    this.connection = connection;
  }

  // ✅ SECURITY: Get connection without exposing endpoint URLs in logs
  private getHeliusConnection(): Connection {
    const heliusEndpoint = process.env.SOLANA_RPC_BACKUP_1; // Helius
    
    if (!heliusEndpoint) {
      throw new Error('Helius RPC endpoint required for getProgramAccounts but not found in environment');
    }
    
    // ✅ SECURITY: Don't log sensitive RPC URLs
    console.log('🚀 Using Helius for heavy operations');
    
    return new Connection(heliusEndpoint, {
      commitment: 'confirmed',
      wsEndpoint: undefined
    });
  }

  private getSyndicaConnection(): Connection {
    const syndicaEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL; // Syndica
    
    if (!syndicaEndpoint) {
      console.warn('⚠️ Primary RPC not available, falling back to Helius');
      return this.getHeliusConnection();
    }
    
    // ✅ SECURITY: Don't log sensitive RPC URLs
    console.log('🚀 Using primary RPC for regular operations');
    
    return new Connection(syndicaEndpoint, {
      commitment: 'confirmed',
      wsEndpoint: undefined
    });
  }

  async getTokenAnalytics(mintAddress: PublicKey): Promise<TokenAnalytics> {
    const cacheKey = `analytics_${mintAddress.toString()}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log('📦 Using cached token analytics');
      return cached.data;
    }

    try {
      console.log('🔍 Scanning blockchain for token analytics...');
      
      // Get all holders using optimized scanning
      const allHolders = await this.scanAllTokenAccounts(mintAddress);
      
      // Get mint info using Syndica (lighter operation)
      const syndicaConnection = this.getSyndicaConnection();
      const mintInfo = await syndicaConnection.getParsedAccountInfo(mintAddress);
      
      if (!mintInfo.value || !mintInfo.value.data || typeof mintInfo.value.data !== 'object' || !('parsed' in mintInfo.value.data)) {
        throw new Error('Invalid mint info received');
      }

      const parsedMintInfo = mintInfo.value.data.parsed.info;
      const totalSupply = parsedMintInfo.supply / Math.pow(10, parsedMintInfo.decimals);
      const lockedSupply = this.DEV_LOCKED_AMOUNT;
      const circulatingSupply = Math.max(0, totalSupply - lockedSupply);

      // Calculate holder percentages
      const holdersWithPercentage = allHolders.map((holder, index) => ({
        ...holder,
        percentage: circulatingSupply > 0 ? (holder.balance / circulatingSupply) * 100 : 0,
        rank: index + 1
      }));

      // Get top holders
      const topHolders = holdersWithPercentage.slice(0, 100);

      // Calculate concentration metrics
      const top10Balance = topHolders.slice(0, 10).reduce((sum, holder) => sum + holder.balance, 0);
      const top50Balance = topHolders.slice(0, 50).reduce((sum, holder) => sum + holder.balance, 0);
      const top100Balance = topHolders.reduce((sum, holder) => sum + holder.balance, 0);

      const concentration = {
        top10Percentage: circulatingSupply > 0 ? (top10Balance / circulatingSupply) * 100 : 0,
        top50Percentage: circulatingSupply > 0 ? (top50Balance / circulatingSupply) * 100 : 0,
        top100Percentage: circulatingSupply > 0 ? (top100Balance / circulatingSupply) * 100 : 0
      };

      const analytics: TokenAnalytics = {
        totalSupply,
        circulatingSupply,
        lockedSupply,
        holderCount: allHolders.length,
        topHolders,
        concentration,
        lastUpdated: Date.now()
      };

      // Cache results
      this.cache.set(cacheKey, { data: analytics, timestamp: Date.now() });

      // ✅ SECURITY: Log summary stats only, no sensitive data
      console.log('✅ Blockchain scan complete:', {
        totalSupply: totalSupply.toLocaleString(),
        holderCount: allHolders.length,
        top10Concentration: concentration.top10Percentage.toFixed(2) + '%',
        scanTime: new Date().toISOString()
      });

      return analytics;

    } catch (error) {
      console.error('💥 Blockchain scan failed:', error.message);
      
      if (cached) {
        console.warn('⚠️ Using stale cached data due to scan failure');
        return cached.data;
      }
      
      throw new Error(`Blockchain scan failed: ${error.message}`);
    }
  }

  private async scanAllTokenAccounts(mintAddress: PublicKey): Promise<Array<{address: string; balance: number}>> {
    try {
      console.log('🔍 Scanning all token accounts...');
      
      const heliusConnection = this.getHeliusConnection();

      const filters = [
        {
          memcmp: {
            offset: 0,
            bytes: mintAddress.toString(),
          },
        },
        {
          dataSize: 165, // Token account size
        },
      ];

      const accounts = await heliusConnection.getProgramAccounts(TOKEN_PROGRAM_ID, {
        filters,
        commitment: 'confirmed',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error(`No token accounts found for mint`);
      }

      console.log(`📊 Found ${accounts.length} token accounts`);

      const validHolders: Array<{address: string; balance: number}> = [];
      let processedCount = 0;
      let errorCount = 0;

      // Optimized batch processing
      const batchSize = 20;
      const delayBetweenBatches = 800;

      for (let i = 0; i < accounts.length; i += batchSize) {
        const batch = accounts.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (account) => {
          try {
            processedCount++;

            // Try direct parsing first (no RPC call)
            try {
              const accountData = AccountLayout.decode(new Uint8Array(account.account.data));
              const balance = Number(accountData.amount) / 1e6; // ALPHA has 6 decimals
              
              if (balance >= this.MIN_BALANCE_THRESHOLD) {
                return {
                  address: account.pubkey.toString(),
                  balance
                };
              }
              return null;
            } catch (parseError) {
              // Fallback to RPC call using Syndica
              const syndicaConnection = this.getSyndicaConnection();
              const tokenAccountInfo = await syndicaConnection.getTokenAccountBalance(account.pubkey);
              const balance = tokenAccountInfo.value.uiAmount || 0;
              
              if (balance >= this.MIN_BALANCE_THRESHOLD) {
                return {
                  address: account.pubkey.toString(),
                  balance
                };
              }
              return null;
            }

          } catch (error) {
            errorCount++;
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const validBatchHolders = batchResults.filter(Boolean) as Array<{address: string; balance: number}>;
        validHolders.push(...validBatchHolders);

        // Progress logging (every 10 batches to reduce noise)
        if ((Math.floor(i/batchSize) + 1) % 10 === 0) {
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(accounts.length/batchSize)} complete`);
        }

        // Rate limiting delay
        if (i + batchSize < accounts.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      if (validHolders.length === 0) {
        throw new Error(`No valid holders found with minimum balance threshold`);
      }

      // Sort by balance descending
      validHolders.sort((a, b) => b.balance - a.balance);

      // ✅ SECURITY: Log summary only, no wallet addresses
      console.log('✅ Scan complete:', {
        totalAccounts: accounts.length,
        validHolders: validHolders.length,
        errors: errorCount,
        efficiency: `${((validHolders.length / accounts.length) * 100).toFixed(1)}%`
      });

      return validHolders;

    } catch (error) {
      console.error('💥 Token account scan failed:', error.message);
      throw new Error(`Token account scan failed: ${error.message}`);
    }
  }

  async verifyLockedTokens(): Promise<{
    isLocked: boolean;
    lockedAmount: number;
    lockAddress: string;
    unlockDate?: Date;
  }> {
    try {
      console.log('🔒 Verifying locked token status...');
      
      const syndicaConnection = this.getSyndicaConnection();
      const lockAddress = new PublicKey('59n9Vmc3V9aSJF4yt3knctHDGbg5BSSDnsEzHRjgDGDb');
      
      const accountInfo = await syndicaConnection.getTokenAccountBalance(lockAddress);
      const lockedAmount = accountInfo.value.uiAmount || 0;
      
      // ✅ SECURITY: Don't log sensitive addresses in production
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (!isProduction) {
        console.log('✅ Lock verification complete:', {
          lockAddress: lockAddress.toString(),
          lockedAmount: lockedAmount.toLocaleString(),
          isLocked: lockedAmount >= this.DEV_LOCKED_AMOUNT
        });
      } else {
        console.log('✅ Lock verification complete:', {
          lockedAmount: lockedAmount.toLocaleString(),
          isLocked: lockedAmount >= this.DEV_LOCKED_AMOUNT
        });
      }

      return {
        isLocked: lockedAmount >= this.DEV_LOCKED_AMOUNT,
        lockedAmount,
        lockAddress: lockAddress.toString()
      };

    } catch (error) {
      console.error('❌ Lock verification failed:', error.message);
      return {
        isLocked: false,
        lockedAmount: 0,
        lockAddress: '59n9Vmc3V9aSJF4yt3knctHDGbg5BSSDnsEzHRjgDGDb'
      };
    }
  }
}

export { BlockchainDataService };

// ✅ SECURITY: Environment variable validation
export const validateEnvironment = () => {
  const requiredVars = [
    'NEXT_PUBLIC_SOLANA_RPC_URL',
    'SOLANA_RPC_BACKUP_1',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ Environment validation passed');
};

// ✅ SECURITY: Safe logging utility
export const safelog = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(message, data);
    } else {
      console.log(message);
    }
  },
  
  error: (message: string, error?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(message, error);
    } else {
      console.error(message, error?.message || 'Error occurred');
    }
  },

  wallet: (address: string) => {
    return process.env.NODE_ENV === 'development' 
      ? address 
      : address.slice(0, 8) + '...';
  }
};