// src/utils/jupiterPriceService.ts
interface JupiterPriceResponse {
  data: {
    [mintAddress: string]: {
      id: string;
      mintSymbol: string;
      vsToken: string;
      vsTokenSymbol: string;
      price: number; // Price in USD
    };
  };
  timeTaken: number;
}

export class JupiterPriceService {
  private static instance: JupiterPriceService;
  private readonly JUPITER_PRICE_API = 'https://price.jup.ag/v6/price';
  
  private constructor() {}

  static getInstance(): JupiterPriceService {
    if (!JupiterPriceService.instance) {
      JupiterPriceService.instance = new JupiterPriceService();
    }
    return JupiterPriceService.instance;
  }

  /**
   * Get token price from Jupiter API
   */
  async getTokenPrice(mintAddress: string): Promise<{
    priceUsd: number;
    priceInSol: number;
    solPrice: number;
    source: string;
    success: boolean;
  }> {
    try {
      console.log('🪐 Fetching price from Jupiter API for:', mintAddress);
      
      // Get Jupiter price (returns USD)
      const response = await fetch(`${this.JUPITER_PRICE_API}?ids=${mintAddress}`);
      
      if (!response.ok) {
        throw new Error(`Jupiter API HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: JupiterPriceResponse = await response.json();
      
      if (!data.data || !data.data[mintAddress]) {
        throw new Error('Token not found in Jupiter API response');
      }

      const tokenData = data.data[mintAddress];
      const priceUsd = tokenData.price;

      // Also get SOL price for conversion
      const solResponse = await fetch(`${this.JUPITER_PRICE_API}?ids=So11111111111111111111111111111111111111112`);
      let solPrice = 200; // Fallback

      if (solResponse.ok) {
        const solData: JupiterPriceResponse = await solResponse.json();
        const solTokenData = solData.data['So11111111111111111111111111111111111111112'];
        if (solTokenData) {
          solPrice = solTokenData.price;
        }
      }

      const priceInSol = priceUsd / solPrice;

      console.log('✅ Jupiter price data:', {
        priceUsd: '$' + priceUsd.toFixed(8),
        priceInSol: priceInSol.toFixed(8) + ' SOL',
        solPrice: '$' + solPrice.toFixed(2)
      });

      return {
        priceUsd,
        priceInSol,
        solPrice,
        source: 'Jupiter',
        success: true
      };

    } catch (error) {
      console.error('❌ Jupiter API error:', error);
      
      // Fallback to estimated price
      return {
        priceUsd: 0.00002, // Estimated
        priceInSol: 0.0001, // Estimated  
        solPrice: 200, // Estimated
        source: 'Estimated (Jupiter failed)',
        success: false
      };
    }
  }

  /**
   * Get SOL price from Jupiter
   */
  async getSolPrice(): Promise<number> {
    try {
      const response = await fetch(`${this.JUPITER_PRICE_API}?ids=So11111111111111111111111111111111111111112`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: JupiterPriceResponse = await response.json();
      const solData = data.data['So11111111111111111111111111111111111111112'];
      
      if (solData) {
        console.log('✅ SOL price from Jupiter:', '$' + solData.price.toFixed(2));
        return solData.price;
      }
      
      throw new Error('SOL price not found in response');
      
    } catch (error) {
      console.error('❌ Error fetching SOL price from Jupiter:', error);
      return 200; // Fallback
    }
  }
}

export const jupiterPriceService = JupiterPriceService.getInstance();