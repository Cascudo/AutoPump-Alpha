// ===============================================
// 4. FIXED MARKET DATA SERVICE - REMOVE PUMP.FUN
// src/utils/marketDataService.ts (REPLACE EXISTING)
// ===============================================

import { MarketData } from './membershipCalculator';

export class MarketDataService {
  private static instance: MarketDataService;
  private cache: { data: MarketData | null; timestamp: number } = { data: null, timestamp: 0 };
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
  private readonly ALPHA_MINT = '4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump';

  static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  static async getTokenPrice(): Promise<number> {
    try {
      const instance = MarketDataService.getInstance();
      const marketData = await instance.getMarketData();
      return marketData.tokenPriceUSD;
    } catch (error) {
      console.error('❌ Error getting token price:', error);
      return 0.00005; // Fallback price
    }
  }

  async getTokenPrice(): Promise<number> {
    try {
      const marketData = await this.getMarketData();
      return marketData.tokenPriceUSD;
    } catch (error) {
      console.error('❌ Error getting token price:', error);
      return 0.00005; // Fallback price
    }
  }

  async getMarketData(forceRefresh = false): Promise<MarketData> {
    // Return cached data if fresh
    if (!forceRefresh && this.cache.data && (Date.now() - this.cache.timestamp) < this.CACHE_DURATION) {
      console.log('📈 Using cached market data');
      return this.cache.data;
    }

    try {
      console.log('🔄 Fetching market data...');
      
      // Get SOL price (always reliable)
      const solPrice = await this.fetchSOLPrice();
      console.log('✅ SOL price:', `$${solPrice.toFixed(2)}`);
      
      // Try DexScreener only (pump.fun removed)
      const dexData = await this.fetchFromDexScreener();
      
      let finalData: MarketData;
      
      if (dexData.success) {
        console.log('✅ Using DexScreener data');
        finalData = {
          tokenPriceUSD: dexData.priceUsd,
          tokenPriceSOL: dexData.priceUsd / solPrice,
          solPriceUSD: solPrice,
          marketCapUSD: dexData.marketCap,
          totalSupply: 1000000000,
          circulatingSupply: 900000000,
          volume24h: dexData.volume24h,
          priceChange24h: dexData.priceChange24h,
          lastUpdated: Date.now(),
          dataSource: 'DexScreener API'
        };
      } else {
        console.log('⚠️ Using fallback data');
        finalData = this.getFallbackMarketData();
      }

      // Cache the result
      this.cache = { data: finalData, timestamp: Date.now() };
      
      console.log('✅ Final market data:', {
        tokenPriceUSD: `$${finalData.tokenPriceUSD.toFixed(8)}`,
        source: finalData.dataSource
      });

      return finalData;

    } catch (error) {
      console.error('💥 Error fetching market data:', error);
      
      if (this.cache.data) {
        console.log('📋 Returning cached data due to error');
        return this.cache.data;
      }

      return this.getFallbackMarketData();
    }
  }

  private async fetchSOLPrice(): Promise<number> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      if (!response.ok) throw new Error('CoinGecko API failed');
      
      const data = await response.json();
      const solPrice = data.solana?.usd;
      
      if (typeof solPrice === 'number' && solPrice > 0) {
        return solPrice;
      }
      
      throw new Error('Invalid SOL price from CoinGecko');
    } catch (error) {
      console.warn('⚠️ CoinGecko SOL price failed, using fallback:', error);
      return 200; // Reasonable SOL price fallback
    }
  }

  // REMOVED: fetchFromPumpFun method entirely

  private async fetchFromDexScreener(): Promise<{
    success: boolean;
    priceUsd: number;
    marketCap: number;
    volume24h: number;
    priceChange24h: number;
  }> {
    try {
      console.log('📊 Fetching from DexScreener API...');
      
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${this.ALPHA_MINT}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.pairs && Array.isArray(data.pairs) && data.pairs.length > 0) {
        const solanaPairs = data.pairs.filter(p => p.chainId === 'solana');
        
        if (solanaPairs.length > 0) {
          const bestPair = solanaPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
          
          const priceUsd = parseFloat(bestPair.priceUsd) || 0;
          
          if (priceUsd > 0) {
            console.log('✅ DexScreener API success');
            
            return {
              success: true,
              priceUsd,
              marketCap: parseFloat(bestPair.marketCap) || 0,
              volume24h: parseFloat(bestPair.volume?.h24) || 0,
              priceChange24h: parseFloat(bestPair.priceChange?.h24) || 0
            };
          }
        }
      }
      
      throw new Error('No valid price data in DexScreener response');
      
    } catch (error) {
      console.warn('⚠️ DexScreener API failed:', error);
      return {
        success: false,
        priceUsd: 0,
        marketCap: 0,
        volume24h: 0,
        priceChange24h: 0
      };
    }
  }

  private getFallbackMarketData(): MarketData {
    return {
      tokenPriceUSD: 0.00005,
      tokenPriceSOL: 0.00000025,
      solPriceUSD: 200,
      marketCapUSD: 50000,
      totalSupply: 1000000000,
      circulatingSupply: 900000000,
      volume24h: 10000,
      priceChange24h: 0,
      lastUpdated: Date.now(),
      dataSource: 'Fallback Data'
    };
  }
}