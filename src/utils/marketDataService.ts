// src/utils/marketDataService.ts
import { MarketData } from './membershipCalculator';

export class MarketDataService {
  private static instance: MarketDataService;
  private cache: { data: MarketData | null; timestamp: number } = { data: null, timestamp: 0 };
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for market data
  private readonly ALPHA_MINT = '4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump';

  static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  async getMarketData(forceRefresh = false): Promise<MarketData> {
    // Return cached data if fresh
    if (!forceRefresh && this.cache.data && (Date.now() - this.cache.timestamp) < this.CACHE_DURATION) {
      console.log('📈 Using cached market data');
      return this.cache.data;
    }

    try {
      console.log('🔄 Fetching fresh market data...');
      
      // Get SOL price first (always reliable)
      const solPrice = await this.fetchSOLPrice();
      
      // Try multiple sources for ALPHA token data
      const tokenData = await this.fetchTokenData();
      
      const marketData: MarketData = {
        tokenPriceUSD: tokenData.priceUSD,
        tokenPriceSOL: tokenData.priceSOL,
        solPriceUSD: solPrice,
        marketCapUSD: tokenData.marketCap,
        totalSupply: tokenData.totalSupply,
        circulatingSupply: tokenData.circulatingSupply,
        volume24h: tokenData.volume24h,
        priceChange24h: tokenData.priceChange24h,
        lastUpdated: Date.now(),
        dataSource: tokenData.source
      };

      // Cache the result
      this.cache = { data: marketData, timestamp: Date.now() };
      
      console.log('✅ Market data updated:', {
        tokenPrice: `$${marketData.tokenPriceUSD.toFixed(8)}`,
        marketCap: `$${marketData.marketCapUSD.toLocaleString()}`,
        source: marketData.dataSource
      });

      return marketData;

    } catch (error) {
      console.error('💥 Error fetching market data:', error);
      
      // Return cached data if available, otherwise fallback
      if (this.cache.data) {
        console.log('📋 Returning stale market data due to error');
        return this.cache.data;
      }

      return this.getFallbackMarketData();
    }
  }

  private async fetchSOLPrice(): Promise<number> {
    try {
      // CoinGecko is reliable for SOL price
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      if (!response.ok) throw new Error('CoinGecko API failed');
      
      const data = await response.json();
      return data.solana?.usd || 200; // Fallback to $200
    } catch (error) {
      console.warn('⚠️ CoinGecko SOL price failed, using fallback');
      return 200; // Reasonable SOL price fallback
    }
  }

  private async fetchTokenData(): Promise<{
    priceUSD: number;
    priceSOL: number;
    marketCap: number;
    totalSupply: number;
    circulatingSupply: number;
    volume24h: number;
    priceChange24h: number;
    source: string;
  }> {
    const errors: string[] = [];

    // Method 1: Try Jupiter API (most reliable for DEX prices)
    try {
      console.log('🔍 Trying Jupiter API...');
      const jupiterResponse = await fetch(`https://price.jup.ag/v4/price?ids=${this.ALPHA_MINT}`);
      
      if (jupiterResponse.ok) {
        const jupiterData = await jupiterResponse.json();
        const tokenData = jupiterData.data?.[this.ALPHA_MINT];
        
        if (tokenData?.price) {
          const solPrice = await this.fetchSOLPrice();
          const priceUSD = tokenData.price;
          const priceSOL = priceUSD / solPrice;
          
          return {
            priceUSD,
            priceSOL,
            marketCap: priceUSD * 1000000000, // Assume 1B total supply
            totalSupply: 1000000000,
            circulatingSupply: 900000000, // Estimate
            volume24h: 0, // Jupiter doesn't provide volume
            priceChange24h: 0, // Jupiter doesn't provide 24h change
            source: 'Jupiter API'
          };
        }
      }
    } catch (error) {
      errors.push(`Jupiter: ${error.message}`);
    }

    // Method 2: Try Birdeye API
    try {
      console.log('🐦 Trying Birdeye API...');
      const birdeyeKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY;
      
      if (birdeyeKey) {
        const birdeyeResponse = await fetch(
          `https://public-api.birdeye.so/defi/token_overview?address=${this.ALPHA_MINT}`,
          {
            headers: { 'X-API-KEY': birdeyeKey }
          }
        );
        
        if (birdeyeResponse.ok) {
          const birdeyeData = await birdeyeResponse.json();
          
          if (birdeyeData.success && birdeyeData.data) {
            const data = birdeyeData.data;
            const solPrice = await this.fetchSOLPrice();
            
            return {
              priceUSD: data.price || 0,
              priceSOL: (data.price || 0) / solPrice,
              marketCap: data.mc || 0,
              totalSupply: data.supply || 1000000000,
              circulatingSupply: data.supply || 900000000,
              volume24h: data.v24hUSD || 0,
              priceChange24h: data.priceChange24hPercent || 0,
              source: 'Birdeye API'
            };
          }
        }
      }
    } catch (error) {
      errors.push(`Birdeye: ${error.message}`);
    }

    // Method 3: Try DexScreener API
    try {
      console.log('📊 Trying DexScreener API...');
      const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${this.ALPHA_MINT}`);
      
      if (dexResponse.ok) {
        const dexData = await dexResponse.json();
        const pairs = dexData.pairs?.filter(p => p.chainId === 'solana');
        
        if (pairs && pairs.length > 0) {
          // Use the pair with highest liquidity
          const bestPair = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
          const solPrice = await this.fetchSOLPrice();
          
          return {
            priceUSD: parseFloat(bestPair.priceUsd) || 0,
            priceSOL: (parseFloat(bestPair.priceUsd) || 0) / solPrice,
            marketCap: bestPair.marketCap || 0,
            totalSupply: 1000000000, // DexScreener doesn't always have supply
            circulatingSupply: 900000000,
            volume24h: bestPair.volume?.h24 || 0,
            priceChange24h: bestPair.priceChange?.h24 || 0,
            source: 'DexScreener API'
          };
        }
      }
    } catch (error) {
      errors.push(`DexScreener: ${error.message}`);
    }

    // Method 4: Fallback to estimated price based on your typical trading
    console.warn('⚠️ All price APIs failed, using estimated price');
    const solPrice = await this.fetchSOLPrice();
    
    return {
      priceUSD: 0.00005, // Conservative estimate
      priceSOL: 0.00005 / solPrice,
      marketCap: 50000, // $50k market cap estimate
      totalSupply: 1000000000,
      circulatingSupply: 900000000,
      volume24h: 0,
      priceChange24h: 0,
      source: `Estimated (APIs failed: ${errors.join(', ')})`
    };
  }

  private getFallbackMarketData(): MarketData {
    console.log('📋 Using fallback market data');
    return {
      tokenPriceUSD: 0.00005,
      tokenPriceSOL: 0.00000025,
      solPriceUSD: 200,
      marketCapUSD: 50000,
      totalSupply: 1000000000,
      circulatingSupply: 900000000,
      volume24h: 0,
      priceChange24h: 0,
      lastUpdated: Date.now(),
      dataSource: 'Fallback Data (APIs unavailable)'
    };
  }

  /**
   * Get loading state message based on what's happening
   */
  getLoadingMessage(): string {
    const messages = [
      'Fetching real-time token prices...',
      'Connecting to Solana price feeds...',
      'Loading market data from DEX...',
      'Calculating token metrics...',
      'Updating portfolio values...'
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Check if data is fresh enough for critical calculations
   */
  isDataFresh(): boolean {
    if (!this.cache.data) return false;
    const age = Date.now() - this.cache.timestamp;
    return age < this.CACHE_DURATION;
  }

  /**
   * Get data age for display
   */
  getDataAge(): string {
    if (!this.cache.data) return 'No data';
    
    const ageSeconds = Math.floor((Date.now() - this.cache.timestamp) / 1000);
    
    if (ageSeconds < 60) return `${ageSeconds}s ago`;
    if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m ago`;
    return `${Math.floor(ageSeconds / 3600)}h ago`;
  }
}