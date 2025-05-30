// src/stores/useAlphaTokenStore.tsx
import create, { State } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BlockchainDataService } from '../utils/blockchainDataService';

// ALPHA token mint address
const ALPHA_MINT = new PublicKey('4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump');

interface AlphaTokenStore extends State {
  tokenBalance: number;
  usdValue: number;
  pricePerToken: number;
  solPrice: number;
  isLoading: boolean;
  lastUpdated: number;
  holderRank: number | null;
  percentageOfSupply: number;
  blockchainService: BlockchainDataService | null;
  getAlphaTokenBalance: (publicKey: PublicKey, connection: Connection) => Promise<void>;
  refreshPrice: () => Promise<void>;
  initializeBlockchainService: (connection: Connection) => void;
  getHolderStats: (publicKey: PublicKey, connection: Connection) => Promise<void>;
}

const useAlphaTokenStore = create<AlphaTokenStore>((set, get) => ({
  tokenBalance: 0,
  usdValue: 0,
  pricePerToken: 0,
  solPrice: 0,
  isLoading: false,
  lastUpdated: 0,
  holderRank: null,
  percentageOfSupply: 0,
  blockchainService: null,

  initializeBlockchainService: (connection: Connection) => {
    const service = new BlockchainDataService(connection);
    set({ blockchainService: service });
    console.log('🔗 Blockchain data service initialized');
  },

  getAlphaTokenBalance: async (publicKey: PublicKey, connection: Connection) => {
    set({ isLoading: true });
    
    try {
      console.log('💰 Fetching ALPHA token balance...');
      
      // Initialize blockchain service if not already done
      const { blockchainService } = get();
      if (!blockchainService) {
        get().initializeBlockchainService(connection);
      }

      // Get all token accounts for the wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      let alphaBalance = 0;

      // Find ALPHA token account
      for (const account of tokenAccounts.value) {
        const parsedInfo = account.account.data.parsed.info;
        if (parsedInfo.mint === ALPHA_MINT.toString()) {
          alphaBalance = parsedInfo.tokenAmount.uiAmount || 0;
          break;
        }
      }

      // Get current prices
      await get().refreshPrice();
      const { pricePerToken, solPrice } = get();
      
      // Calculate USD value (assuming token price is in SOL)
      const solValue = alphaBalance * pricePerToken;
      const usdValue = solValue * solPrice;

      set({
        tokenBalance: alphaBalance,
        usdValue: usdValue,
        lastUpdated: Date.now(),
        isLoading: false
      });

      console.log('✅ ALPHA balance updated:', {
        tokens: alphaBalance.toLocaleString(),
        usdValue: '$' + usdValue.toFixed(2)
      });

    } catch (error) {
      console.error('💥 Error fetching ALPHA token balance:', error);
      set({
        tokenBalance: 0,
        usdValue: 0,
        isLoading: false
      });
    }
  },

  getHolderStats: async (publicKey: PublicKey, connection: Connection) => {
    try {
      const { blockchainService, tokenBalance } = get();
      if (!blockchainService || tokenBalance === 0) return;

      console.log('📊 Getting holder statistics...');
      
      const analytics = await blockchainService.getTokenAnalytics(ALPHA_MINT);
      
      // Find user's rank among holders
      let holderRank = null;
      let percentageOfSupply = 0;
      
      if (tokenBalance > 0 && analytics.totalSupply > 0) {
        percentageOfSupply = (tokenBalance / analytics.totalSupply) * 100;
        
        // Find rank by comparing with top holders
        holderRank = analytics.topHolders.findIndex(holder => holder.balance <= tokenBalance) + 1;
        if (holderRank === 0) {
          // If not found in top holders, estimate rank
          holderRank = analytics.topHolders.length + 1;
        }
      }

      set({
        holderRank,
        percentageOfSupply
      });

      console.log('📈 Holder stats updated:', {
        rank: holderRank,
        percentage: percentageOfSupply.toFixed(4) + '%'
      });

    } catch (error) {
      console.error('💥 Error getting holder stats:', error);
    }
  },

  refreshPrice: async () => {
    try {
      console.log('💱 Fetching current prices...');
      
      // Get SOL price from CoinGecko
      const solPriceResponse = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
      );
      const solPriceData = await solPriceResponse.json();
      const solPrice = solPriceData.solana?.usd || 200;

      // For ALPHA token price, you have several options:
      // 1. Jupiter API for DEX price
      // 2. Your own pricing logic
      // 3. Fixed price during development
      
      let alphaPrice = 0.0001; // Default/fallback price in SOL
      
      try {
        // Option 1: Try Jupiter API for real DEX price
        const jupiterResponse = await fetch(
          `https://price.jup.ag/v4/price?ids=${ALPHA_MINT.toString()}`
        );
        
        if (jupiterResponse.ok) {
          const jupiterData = await jupiterResponse.json();
          const tokenData = jupiterData.data?.[ALPHA_MINT.toString()];
          if (tokenData?.price) {
            // Jupiter returns price in USD, convert to SOL
            alphaPrice = tokenData.price / solPrice;
            console.log('📈 Real ALPHA price from Jupiter:', alphaPrice.toFixed(8), 'SOL');
          }
        }
      } catch (jupiterError) {
        console.warn('⚠️ Jupiter API unavailable, using fallback price');
      }

      // Alternative: Try Birdeye API
      if (alphaPrice === 0.0001) {
        try {
          const birdeyeResponse = await fetch(
            `https://public-api.birdeye.so/defi/price?address=${ALPHA_MINT.toString()}`,
            {
              headers: {
                'X-API-KEY': process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || ''
              }
            }
          );
          
          if (birdeyeResponse.ok && process.env.NEXT_PUBLIC_BIRDEYE_API_KEY) {
            const birdeyeData = await birdeyeResponse.json();
            if (birdeyeData.success && birdeyeData.data?.value) {
              // Birdeye returns price in USD
              alphaPrice = birdeyeData.data.value / solPrice;
              console.log('🐦 Real ALPHA price from Birdeye:', alphaPrice.toFixed(8), 'SOL');
            }
          }
        } catch (birdeyeError) {
          console.warn('⚠️ Birdeye API unavailable');
        }
      }

      set({ 
        pricePerToken: alphaPrice,
        solPrice: solPrice
      });

      console.log('💰 Prices updated:', {
        sol: '$' + solPrice.toFixed(2),
        alpha: alphaPrice.toFixed(8) + ' SOL'
      });
      
    } catch (error) {
      console.error('💥 Error fetching prices:', error);
      // Use fallback prices
      set({ 
        pricePerToken: 0.0001,
        solPrice: 200
      });
    }
  }
}));

export default useAlphaTokenStore;
export { useAlphaTokenStore, ALPHA_MINT };