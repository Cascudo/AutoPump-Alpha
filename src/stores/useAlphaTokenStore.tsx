// src/stores/useAlphaTokenStore.tsx - Enhanced existing store (no new files)
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
  
  // Enhanced debug info (temporary for troubleshooting)
  debugInfo: {
    walletAddress: string;
    tokenAccountsFound: number;
    alphaAccountFound: boolean;
    rawBalance: number;
    priceSource: string;
    lastError: string | null;
    mintAddressesFound: string[];
    rpcEndpoint: string;
  };
  
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
  debugInfo: {
    walletAddress: '',
    tokenAccountsFound: 0,
    alphaAccountFound: false,
    rawBalance: 0,
    priceSource: '',
    lastError: null,
    mintAddressesFound: [],
    rpcEndpoint: ''
  },

  initializeBlockchainService: (connection: Connection) => {
    const service = new BlockchainDataService(connection);
    set({ blockchainService: service });
    console.log('🔗 Blockchain data service initialized');
  },

  getAlphaTokenBalance: async (publicKey: PublicKey, connection: Connection) => {
    set({ isLoading: true });
    
    try {
      console.log('💰 Fetching ALPHA token balance...');
      console.log('🎯 Wallet:', publicKey.toString().slice(0, 8) + '...');
      console.log('🎯 Target mint:', ALPHA_MINT.toString());
      
      // Get RPC endpoint for debugging
      const rpcEndpoint = (connection as any)._rpcEndpoint || 'Unknown RPC';
      console.log('🌐 Using RPC:', rpcEndpoint);

      // Initialize blockchain service if needed
      const { blockchainService } = get();
      if (!blockchainService) {
        get().initializeBlockchainService(connection);
      }

      // Reset debug info
      set({
        debugInfo: {
          walletAddress: publicKey.toString(),
          tokenAccountsFound: 0,
          alphaAccountFound: false,
          rawBalance: 0,
          priceSource: '',
          lastError: null,
          mintAddressesFound: [],
          rpcEndpoint
        }
      });

      // Try to get token accounts with better error handling
      console.log('🔍 Querying token accounts from RPC...');
      
      let tokenAccounts;
      try {
        tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID },
          'confirmed' // Add commitment level for reliability
        );
      } catch (rpcError) {
        console.error('💥 RPC Connection Error:', rpcError);
        throw new Error(`RPC Failed: ${rpcError.message || 'Connection timeout'}`);
      }

      console.log(`📋 Found ${tokenAccounts.value.length} token accounts`);

      // Extract all mint addresses for debugging
      const mintAddressesFound: string[] = [];
      let alphaBalance = 0;
      let alphaAccountFound = false;

      console.log('🔎 Examining each token account:');
      
      for (let i = 0; i < tokenAccounts.value.length; i++) {
        try {
          const account = tokenAccounts.value[i];
          const parsedInfo = account.account.data.parsed.info;
          const mint = parsedInfo.mint;
          const balance = parsedInfo.tokenAmount.uiAmount || 0;
          
          mintAddressesFound.push(mint);
          
          console.log(`   ${i + 1}. Mint: ${mint}`);
          console.log(`      Balance: ${balance.toLocaleString()}`);
          console.log(`      Is ALPHA: ${mint === ALPHA_MINT.toString()}`);
          
          // Check for exact match
          if (mint === ALPHA_MINT.toString()) {
            alphaBalance = balance;
            alphaAccountFound = true;
            console.log(`\n✅ ALPHA TOKEN FOUND!`);
            console.log(`   Balance: ${alphaBalance.toLocaleString()} ALPHA`);
          }
          
        } catch (accountError) {
          console.error(`💥 Error parsing account ${i + 1}:`, accountError);
          continue;
        }
      }

      // Update debug info
      set(state => ({
        debugInfo: {
          ...state.debugInfo,
          tokenAccountsFound: tokenAccounts.value.length,
          alphaAccountFound,
          rawBalance: alphaBalance,
          mintAddressesFound
        }
      }));

      if (!alphaAccountFound) {
        console.log('\n❌ ALPHA token not found in wallet');
        console.log('💡 Troubleshooting:');
        console.log('   1. Make sure you have ALPHA tokens');
        console.log('   2. Check if you\'re using the correct wallet');
        console.log('   3. Try refreshing after a few minutes');
        console.log(`   4. Expected mint: ${ALPHA_MINT.toString()}`);
      }

      // Get current prices
      console.log('\n💱 Fetching current prices...');
      await get().refreshPrice();
      const { pricePerToken, solPrice, debugInfo } = get();
      
      // Calculate USD value using current method
      const solValue = alphaBalance * pricePerToken;
      const usdValue = solValue * solPrice;

      console.log('\n🧮 Value calculation:');
      console.log(`   Token balance: ${alphaBalance.toLocaleString()}`);
      console.log(`   Price per token: ${pricePerToken.toFixed(8)} SOL`);
      console.log(`   SOL price: $${solPrice.toFixed(2)}`);
      console.log(`   USD value: $${usdValue.toFixed(2)}`);
      console.log(`   Price source: ${debugInfo.priceSource}`);

      set({
        tokenBalance: alphaBalance,
        usdValue: usdValue,
        lastUpdated: Date.now(),
        isLoading: false
      });

      console.log('\n✅ Token balance fetch completed successfully!');

    } catch (error) {
      console.error('\n💥 Complete error in getAlphaTokenBalance:', error);
      
      // Store error for debugging
      set(state => ({
        debugInfo: {
          ...state.debugInfo,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
      
      set({
        tokenBalance: 0,
        usdValue: 0,
        isLoading: false
      });
    }
  },

  refreshPrice: async () => {
    try {
      console.log('💱 Fetching current prices...');
      
      // Use existing method: Get SOL price from CoinGecko
      let solPrice = 200; // Fallback
      try {
        const solPriceResponse = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
        );
        
        if (solPriceResponse.ok) {
          const solPriceData = await solPriceResponse.json();
          solPrice = solPriceData.solana?.usd || 200;
          console.log('✅ SOL price from CoinGecko:', '$' + solPrice.toFixed(2));
        }
      } catch (error) {
        console.warn('⚠️ CoinGecko SOL price failed, using fallback');
      }

      // Try DexScreener for ALPHA price (has CORS support)
      let alphaPrice = 0.0001; // Fallback price in SOL
      let priceSource = 'Fallback';
      
      try {
        console.log('📊 Trying DexScreener for ALPHA price...');
        const dexResponse = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${ALPHA_MINT.toString()}`
        );
        
        if (dexResponse.ok) {
          const dexData = await dexResponse.json();
          
          if (dexData.pairs && dexData.pairs.length > 0) {
            const pair = dexData.pairs[0];
            const priceUsd = parseFloat(pair.priceUsd);
            
            if (priceUsd > 0) {
              alphaPrice = priceUsd / solPrice; // Convert USD to SOL
              priceSource = 'DexScreener';
              console.log('✅ ALPHA price from DexScreener:', '$' + priceUsd.toFixed(8));
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ DexScreener failed, using fallback price');
      }

      // If DexScreener failed, try your Birdeye API key
      if (priceSource === 'Fallback') {
        const birdeyeKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY;
        if (birdeyeKey) {
          try {
            console.log('🐦 Trying Birdeye API...');
            const birdeyeResponse = await fetch(
              `https://public-api.birdeye.so/defi/price?address=${ALPHA_MINT.toString()}`,
              {
                headers: {
                  'X-API-KEY': birdeyeKey
                }
              }
            );
            
            if (birdeyeResponse.ok) {
              const birdeyeData = await birdeyeResponse.json();
              if (birdeyeData.success && birdeyeData.data?.value) {
                alphaPrice = birdeyeData.data.value / solPrice; // Convert USD to SOL
                priceSource = 'Birdeye';
                console.log('✅ ALPHA price from Birdeye:', '$' + birdeyeData.data.value.toFixed(8));
              }
            }
          } catch (error) {
            console.warn('⚠️ Birdeye API failed');
          }
        }
      }

      set({ 
        pricePerToken: alphaPrice,
        solPrice: solPrice
      });

      // Update debug info
      set(state => ({
        debugInfo: {
          ...state.debugInfo,
          priceSource
        }
      }));

      console.log('💰 Price update completed:', {
        alphaPrice: alphaPrice.toFixed(8) + ' SOL',
        solPrice: '$' + solPrice.toFixed(2),
        source: priceSource
      });
      
    } catch (error) {
      console.error('💥 Error in refreshPrice:', error);
      // Use fallback prices
      set({ 
        pricePerToken: 0.0001,
        solPrice: 200
      });
      
      set(state => ({
        debugInfo: {
          ...state.debugInfo,
          priceSource: 'Error Fallback'
        }
      }));
    }
  },

  getHolderStats: async (publicKey: PublicKey, connection: Connection) => {
    try {
      const { blockchainService, tokenBalance } = get();
      if (!blockchainService || tokenBalance === 0) {
        console.log('⏭️ Skipping holder stats (no service or tokens)');
        return;
      }

      console.log('📊 Getting holder statistics...');
      
      // Use your existing BlockchainDataService
      const analytics = await blockchainService.getTokenAnalytics(ALPHA_MINT);
      
      let holderRank = null;
      let percentageOfSupply = 0;
      
      if (tokenBalance > 0 && analytics.totalSupply > 0) {
        percentageOfSupply = (tokenBalance / analytics.totalSupply) * 100;
        
        // Simple rank estimation
        holderRank = analytics.topHolders.findIndex(holder => holder.balance <= tokenBalance) + 1;
        if (holderRank === 0) {
          holderRank = analytics.topHolders.length + 1;
        }
      }

      set({
        holderRank,
        percentageOfSupply
      });

      console.log('📈 Holder stats updated:', {
        rank: holderRank || 'Unknown',
        percentage: percentageOfSupply.toFixed(4) + '%'
      });

    } catch (error) {
      console.error('💥 Error getting holder stats:', error);
    }
  }
}));

export default useAlphaTokenStore;
export { useAlphaTokenStore, ALPHA_MINT };