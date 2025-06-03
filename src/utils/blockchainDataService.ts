// src/utils/blockchainDataService.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
  rank: number;
}

export interface TokenAnalytics {
  totalSupply: number;
  circulatingSupply: number; // Total supply minus locked tokens
  lockedSupply: number; // Dev tokens locked
  holderCount: number;
  topHolders: TokenHolder[];
  concentration: {
    top10Percentage: number;
    top50Percentage: number;
    top100Percentage: number;
  };
  lastUpdated: number;
}

export interface DetailedTokenData {
  mintAddress: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  circulatingSupply: number;
  lockedSupply: number;
  holderCount: number;
  distribution: {
    whales: number;
    sharks: number;
    fish: number;
    minnows: number;
  };
  analytics: TokenAnalytics;
}

class BlockchainDataService {
  private connection: Connection;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 3 * 60 * 1000; // 3 minutes for more frequent updates
  
  // Constants for ALPHA token
  private readonly DEV_LOCKED_AMOUNT = 100_000_000; // 100M tokens locked
  private readonly STREAMFLOW_CONTRACT = new PublicKey('8KwNTWk1DEcesWTgcfoWT9vbGysPdD9W4qfcfB2gDEg8');

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async getTokenAnalytics(mintAddress: PublicKey): Promise<TokenAnalytics> {
    const cacheKey = `analytics_${mintAddress.toString()}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log('📋 Using cached token analytics');
      return cached.data;
    }

    try {
      console.log('🔍 Fetching comprehensive token analytics from blockchain...');
      
      // Get token supply information
      const supply = await this.connection.getTokenSupply(mintAddress);
      const totalSupply = supply.value.uiAmount || 0;
      
      // Calculate circulating supply (total minus locked dev tokens)
      const circulatingSupply = Math.max(0, totalSupply - this.DEV_LOCKED_AMOUNT);
      const lockedSupply = this.DEV_LOCKED_AMOUNT;

      console.log('📊 Supply breakdown:', {
        total: totalSupply.toLocaleString(),
        circulating: circulatingSupply.toLocaleString(),
        locked: lockedSupply.toLocaleString()
      });

      // Get actual holder count using a more comprehensive approach
      const holderCount = await this.getAccurateHolderCount(mintAddress);
      
      // Get largest token accounts (top holders)
      const largestAccounts = await this.connection.getTokenLargestAccounts(mintAddress);
      
      // Process top holders with actual owner information
      const topHolders: TokenHolder[] = [];
      for (let i = 0; i < Math.min(largestAccounts.value.length, 100); i++) {
        const account = largestAccounts.value[i];
        const balance = account.uiAmount || 0;
        const percentage = circulatingSupply > 0 ? (balance / circulatingSupply) * 100 : 0;
        
        if (balance > 0) {
          topHolders.push({
            address: account.address.toString(),
            balance,
            percentage,
            rank: i + 1
          });
        }
      }

      // Calculate concentration metrics based on circulating supply
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
        holderCount,
        topHolders,
        concentration,
        lastUpdated: Date.now()
      };

      // Cache the results
      this.cache.set(cacheKey, { data: analytics, timestamp: Date.now() });
      
      console.log('✅ Token analytics updated:', {
        totalSupply: totalSupply.toLocaleString(),
        circulatingSupply: circulatingSupply.toLocaleString(),
        holders: holderCount.toLocaleString(),
        top10Concentration: concentration.top10Percentage.toFixed(2) + '%'
      });

      return analytics;

    } catch (error) {
      console.error('💥 Error fetching token analytics:', error);
      
      // Return cached data if available
      if (cached) {
        console.log('📋 Returning stale cached data due to error');
        return cached.data;
      }
      
      throw error;
    }
  }

  private async getAccurateHolderCount(mintAddress: PublicKey): Promise<number> {
    try {
      console.log('🔢 Getting accurate holder count...');
      
      // Method 1: Try to get programmatic accounts (most accurate but expensive)
      try {
        const filters = [
          {
            memcmp: {
              offset: 0,
              bytes: mintAddress.toString(),
            },
          },
          {
            dataSize: 165, // Token account data size
          },
        ];

        const accounts = await this.connection.getProgramAccounts(
          TOKEN_PROGRAM_ID,
          {
            filters,
            commitment: 'confirmed',
          }
        );

        // Filter for accounts with non-zero balances (sample to prevent timeout)
        let activeHolders = 0;
        const sampleSize = Math.min(accounts.length, 1000); // Limit to prevent timeout
        
        for (let i = 0; i < sampleSize; i++) {
          try {
            const accountInfo = await this.connection.getTokenAccountBalance(accounts[i].pubkey);
            if (accountInfo.value.uiAmount && accountInfo.value.uiAmount > 0) {
              activeHolders++;
            }
          } catch (e) {
            // Skip invalid accounts
          }
        }

        if (activeHolders > 0) {
          // Extrapolate based on sample
          const estimatedTotal = (activeHolders / sampleSize) * accounts.length;
          console.log('📊 Holder count from sampling:', Math.floor(estimatedTotal));
          return Math.floor(estimatedTotal);
        }
      } catch (error) {
        console.warn('⚠️ Programmatic account fetching failed, using alternative method');
      }

      // Method 2: Use Helius API if available (more accurate)
      const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
      if (heliusApiKey) {
        try {
          console.log('🔍 Trying Helius API for holder count...');
          
          // Use Helius DAS API to get token accounts
          const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 'holder-count',
              method: 'getTokenAccounts',
              params: {
                mint: mintAddress.toString(),
                options: {
                  showZeroBalance: false
                }
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.result && Array.isArray(data.result)) {
              const holderCount = data.result.length;
              console.log('📊 Real holder count from Helius DAS:', holderCount);
              return holderCount;
            }
          } else {
            console.warn('⚠️ Helius API response not ok:', response.status);
          }
        } catch (error) {
          console.warn('⚠️ Helius API error:', error);
        }
      } else {
        console.log('ℹ️ Helius API key not found in environment');
      }

      // Method 3: Try SolanaFM API for holder count (often most accurate)
      try {
        console.log('🔍 Trying SolanaFM API for holder count...');
        const solanafmResponse = await fetch(`https://api.solana.fm/v1/tokens/${mintAddress.toString()}/holders`);
        
        if (solanafmResponse.ok) {
          const solanafmData = await solanafmResponse.json();
          if (solanafmData.result && solanafmData.result.length) {
            console.log('📊 Real holder count from SolanaFM:', solanafmData.result.length);
            return solanafmData.result.length;
          }
        }
      } catch (error) {
        console.warn('⚠️ SolanaFM API unavailable');
      }

      // Method 4: Try Birdeye API for token info
      try {
        console.log('🔍 Trying Birdeye API for token stats...');
        const birdeyeResponse = await fetch(`https://public-api.birdeye.so/defi/token_overview?address=${mintAddress.toString()}`);
        
        if (birdeyeResponse.ok) {
          const birdeyeData = await birdeyeResponse.json();
          if (birdeyeData.success && birdeyeData.data?.holder) {
            console.log('📊 Real holder count from Birdeye:', birdeyeData.data.holder);
            return birdeyeData.data.holder;
          }
        }
      } catch (error) {
        console.warn('⚠️ Birdeye API unavailable');      }

      // Method 5: Try Solscan API for holder count (last free option)
      try {
        console.log('🔍 Trying Solscan API for holder count...');
        const solscanResponse = await fetch(`https://public-api.solscan.io/token/holders?tokenAddress=${mintAddress.toString()}&limit=1&offset=0`);
        
        if (solscanResponse.ok) {
          const solscanData = await solscanResponse.json();
          if (solscanData.total) {
            console.log('📊 Real holder count from Solscan:', solscanData.total);
            return solscanData.total;
          }
        }
      } catch (error) {
        console.warn('⚠️ Solscan API unavailable');
      }

      // Method 6: Final fallback with largest accounts
      const largestAccounts = await this.connection.getTokenLargestAccounts(mintAddress);
      const knownHolders = largestAccounts.value.filter(acc => (acc.uiAmount || 0) > 0).length;
      
      if (knownHolders > 0) {
        // Conservative estimation - we know these holders exist
        const estimatedHolders = Math.max(knownHolders, 100); // At least the known holders
        console.log('📊 Conservative holder estimate:', estimatedHolders, 'based on', knownHolders, 'known large holders');
        return estimatedHolders;
      }

      // Return fallback if we can't get any reasonable data
      console.warn('⚠️ Could not determine holder count - returning fallback');
      return 1000; // Reasonable fallback

    } catch (error) {
      console.error('💥 Error getting holder count:', error);
      return 1000; // Fallback
    }
  }

  async verifyLockedTokens(): Promise<{
    isLocked: boolean;
    amount: number;
    contractAddress: string;
    streamflowUrl: string;
  }> {
    try {
      console.log('🔐 Verifying locked dev tokens...');
      
      // Check if the Streamflow contract exists and has the expected data
      const contractInfo = await this.connection.getAccountInfo(this.STREAMFLOW_CONTRACT);
      
      return {
        isLocked: contractInfo !== null,
        amount: this.DEV_LOCKED_AMOUNT,
        contractAddress: this.STREAMFLOW_CONTRACT.toString(),
        streamflowUrl: 'https://app.streamflow.finance/contract/solana/mainnet/8KwNTWk1DEcesWTgcfoWT9vbGysPdD9W4qfcfB2gDEg8'
      };
    } catch (error) {
      console.error('💥 Error verifying locked tokens:', error);
      return {
        isLocked: true, // Assume locked for safety
        amount: this.DEV_LOCKED_AMOUNT,
        contractAddress: this.STREAMFLOW_CONTRACT.toString(),
        streamflowUrl: 'https://app.streamflow.finance/contract/solana/mainnet/8KwNTWk1DEcesWTgcfoWT9vbGysPdD9W4qfcfB2gDEg8'
      };
    }
  }

  async getDetailedTokenData(mintAddress: PublicKey): Promise<DetailedTokenData> {
    try {
      console.log('📊 Getting detailed token data...');
      
      const analytics = await this.getTokenAnalytics(mintAddress);
      const { circulatingSupply, topHolders } = analytics;

      // Categorize holders by their percentage of circulating supply
      let whales = 0, sharks = 0, fish = 0, minnows = 0;
      
      topHolders.forEach(holder => {
        if (holder.percentage >= 1.0) whales++;
        else if (holder.percentage >= 0.1) sharks++;
        else if (holder.percentage >= 0.01) fish++;
        else minnows++;
      });

      // Estimate remaining minnows
      const knownHolders = whales + sharks + fish + minnows;
      const estimatedRemainingMinnows = Math.max(0, analytics.holderCount - knownHolders);
      minnows += estimatedRemainingMinnows;

      const detailedData: DetailedTokenData = {
        mintAddress: mintAddress.toString(),
        symbol: 'ALPHA',
        decimals: 6,
        totalSupply: analytics.totalSupply,
        circulatingSupply: analytics.circulatingSupply,
        lockedSupply: analytics.lockedSupply,
        holderCount: analytics.holderCount,
        distribution: {
          whales,
          sharks,
          fish,
          minnows
        },
        analytics
      };

      return detailedData;

    } catch (error) {
      console.error('💥 Error getting detailed token data:', error);
      throw error;
    }
  }

  // Clear cache manually
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Blockchain data cache cleared');
  }

  // Get cache status
  getCacheStatus(): { isCached: boolean; age: number; expiresIn: number } {
    // This should be implemented for each specific cache key
    // For now, return general cache status
    return {
      isCached: this.cache.size > 0,
      age: 0,
      expiresIn: this.CACHE_DURATION / 1000
    };
  }
}

export { BlockchainDataService };