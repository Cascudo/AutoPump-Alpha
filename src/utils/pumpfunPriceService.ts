// src/utils/pumpfunPriceService.ts
interface PumpFunTokenData {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  usd_market_cap: number;
  reply_count: number;
  last_reply: number;
  nsfw: boolean;
  market_cap: number;
  price_per_token_in_sol: number;
  volume_24h_usd: number;
  created_timestamp: number;
}

export class PumpFunPriceService {
  private static instance: PumpFunPriceService;
  private readonly PUMP_FUN_API = 'https://client-api-2-74b1891ee9f9.herokuapp.com/coins';
  
  private constructor() {}

  static getInstance(): PumpFunPriceService {
    if (!PumpFunPriceService.instance) {
      PumpFunPriceService.instance = new PumpFunPriceService();
    }
    return PumpFunPriceService.instance;
  }

  /**
   * Get token price from Pump.fun API
   */
  async getTokenPrice(mintAddress: string): Promise<{
    priceInSol: number;
    marketCapUsd: number;
    volume24hUsd: number;
    success: boolean;
  }> {
    try {
      console.log('🎢 Fetching price from Pump.fun API for:', mintAddress);
      
      const response = await fetch(`${this.PUMP_FUN_API}/${mintAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: PumpFunTokenData = await response.json();
      
      if (!data || typeof data.price_per_token_in_sol !== 'number') {
        throw new Error('Invalid response format from Pump.fun API');
      }

      console.log('✅ Pump.fun price data received:', {
        priceInSol: data.price_per_token_in_sol,
        marketCapUsd: data.usd_market_cap,
        volume24hUsd: data.volume_24h_usd
      });

      return {
        priceInSol: data.price_per_token_in_sol,
        marketCapUsd: data.usd_market_cap || 0,
        volume24hUsd: data.volume_24h_usd || 0,
        success: true
      };

    } catch (error) {
      console.error('❌ Error fetching from Pump.fun API:', error);
      
      return {
        priceInSol: 0.0001, // Fallback price
        marketCapUsd: 0,
        volume24hUsd: 0,
        success: false
      };
    }
  }

  /**
   * Get SOL price from CoinGecko
   */
  async getSolPrice(): Promise<number> {
    try {
      console.log('💰 Fetching SOL price from CoinGecko...');
      
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const solPrice = data.solana?.usd;
      
      if (typeof solPrice !== 'number') {
        throw new Error('Invalid SOL price data from CoinGecko');
      }

      console.log('✅ SOL price fetched:', '$' + solPrice.toFixed(2));
      return solPrice;

    } catch (error) {
      console.error('❌ Error fetching SOL price:', error);
      return 200; // Fallback SOL price
    }
  }

  /**
   * Get complete pricing data for a Pump.fun token
   */
  async getCompletePriceData(mintAddress: string): Promise<{
    tokenPriceInSol: number;
    tokenPriceInUsd: number;
    solPriceInUsd: number;
    marketCapUsd: number;
    volume24hUsd: number;
    dataSource: string;
    success: boolean;
  }> {
    try {
      // Fetch both SOL price and token price in parallel
      const [solPrice, tokenData] = await Promise.all([
        this.getSolPrice(),
        this.getTokenPrice(mintAddress)
      ]);

      const tokenPriceInUsd = tokenData.priceInSol * solPrice;

      const result = {
        tokenPriceInSol: tokenData.priceInSol,
        tokenPriceInUsd,
        solPriceInUsd: solPrice,
        marketCapUsd: tokenData.marketCapUsd,
        volume24hUsd: tokenData.volume24hUsd,
        dataSource: tokenData.success ? 'Pump.fun API' : 'Fallback',
        success: tokenData.success
      };

      console.log('🎯 Complete price data assembled:', result);
      return result;

    } catch (error) {
      console.error('❌ Error getting complete price data:', error);
      
      return {
        tokenPriceInSol: 0.0001,
        tokenPriceInUsd: 0.02, // 0.0001 SOL * 200 USD
        solPriceInUsd: 200,
        marketCapUsd: 0,
        volume24hUsd: 0,
        dataSource: 'Fallback',
        success: false
      };
    }
  }
}

export const pumpFunPriceService = PumpFunPriceService.getInstance();