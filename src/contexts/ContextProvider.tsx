// src/contexts/ContextProvider.tsx - SAFE COMPLETE VERSION
// Your working ContextProvider with ONLY the WalletConnectionHandler enhanced

import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';
import { FC, ReactNode, useCallback, useMemo, useState, useEffect } from 'react';
import { AutoConnectProvider, useAutoConnect } from './AutoConnectProvider';
import { notify } from "../utils/notifications";
import { NetworkConfigurationProvider, useNetworkConfiguration } from './NetworkConfigurationProvider';
import { useMembershipStore } from '../stores/useMembershipStore';
import { useVipSubscriptionStore } from '../stores/useVipSubscriptionStore';
import { useAlphaTokenStore } from '../stores/useAlphaTokenStore';
import { useConnection } from '@solana/wallet-adapter-react';
import dynamic from "next/dynamic";

// ✅ Use dynamic import for WalletModalProvider (this was the original working approach)
const ReactUIWalletModalProviderDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletModalProvider,
  { ssr: false }
);

// ✅ ENHANCED: Component to handle wallet connection events with full store clearing
const WalletConnectionHandler: FC = () => {
  const { publicKey, connected, wallet } = useWallet();
  const { connection } = useConnection();
  const [lastConnectedWallet, setLastConnectedWallet] = useState<string | null>(null);

  // Get store methods
  const { getMembershipStatus, clearData: clearMembershipData } = useMembershipStore();
  const vipStore = useVipSubscriptionStore();
  const alphaStore = useAlphaTokenStore();

  // ✅ ENHANCED: Clear ALL stores when wallet changes
  const clearAllWalletData = useCallback(() => {
    console.log('🧹 Clearing ALL wallet data for fresh start...');
    
    // Clear membership store
    clearMembershipData();
    
    // Clear VIP subscription store safely
    try {
      vipStore.currentSubscription = null;
      vipStore.isDbSynced = false;
      vipStore.dbSubscriptionId = null;
      vipStore.lastChecked = 0;
      vipStore.isLoading = false;
    } catch (error) {
      console.warn('Could not clear VIP store:', error);
    }
    
    // Clear ALPHA token store safely
    try {
      alphaStore.tokenBalance = 0;
      alphaStore.usdValue = 0;
      alphaStore.pricePerToken = 0;
      alphaStore.isLoading = false;
      alphaStore.lastUpdated = 0;
      alphaStore.holderRank = null;
      alphaStore.percentageOfSupply = 0;
      alphaStore.holderStatsLoading = false;
      alphaStore.holderStatsError = null;
      alphaStore.debugInfo = {
        walletAddress: '',
        tokenAccountsFound: 0,
        alphaAccountFound: false,
        rawBalance: 0,
        priceSource: '',
        lastError: null,
        mintAddressesFound: [],
        rpcEndpoint: '',
        holderDataSource: '',
        holderDataAge: 0
      };
    } catch (error) {
      console.warn('Could not clear Alpha store:', error);
    }
    
    console.log('✅ All wallet data cleared successfully');
  }, [clearMembershipData, vipStore, alphaStore]);

  useEffect(() => {
    const handleWalletConnection = async () => {
      // Handle disconnection
      if (!publicKey || !connected) {
        if (lastConnectedWallet) {
          console.log('👋 Wallet disconnected - clearing all data');
          clearAllWalletData();
          setLastConnectedWallet(null);
          
          // Show disconnect notification
          notify({
            type: 'info',
            message: 'Wallet Disconnected',
            description: 'All wallet data has been cleared'
          });
        }
        return;
      }

      const currentWallet = publicKey.toString();
      
      // Handle new wallet connection or wallet switch
      if (currentWallet !== lastConnectedWallet) {
        const isWalletSwitch = lastConnectedWallet !== null;
        
        console.log(
          isWalletSwitch 
            ? `🔄 Wallet switched from ${lastConnectedWallet?.slice(0, 8)}... to ${currentWallet.slice(0, 8)}...`
            : `🔗 New wallet connected: ${currentWallet.slice(0, 8)}...`
        );
        
        // Always clear data when switching wallets
        if (isWalletSwitch) {
          console.log('🧹 Clearing previous wallet data...');
          clearAllWalletData();
          
          // Show wallet switch notification
          notify({
            type: 'info',
            message: 'Wallet Switched',
            description: `Switched to ${currentWallet.slice(0, 6)}...${currentWallet.slice(-4)}`
          });
        }
        
        // Small delay to ensure wallet is fully connected and data is cleared
        setTimeout(async () => {
          try {
            console.log('💰 Fetching fresh data for new wallet...');
            
            // Fetch new wallet data
            await getMembershipStatus(publicKey, connection);
            
            console.log('✅ Fresh wallet data loaded successfully');
            
            // Show success notification
            notify({
              type: 'success',
              message: 'Wallet Data Loaded',
              description: 'Fresh data loaded for your wallet'
            });
            
          } catch (error) {
            console.error('❌ Failed to load fresh wallet data:', error);
            notify({
              type: 'error',
              message: 'Failed to load wallet data',
              description: 'Please refresh the page and try again'
            });
          }
        }, isWalletSwitch ? 1500 : 1000); // Longer delay for wallet switches
        
        setLastConnectedWallet(currentWallet);
      }
    };

    handleWalletConnection();
  }, [publicKey, connected, wallet?.adapter?.name, getMembershipStatus, lastConnectedWallet, clearAllWalletData, connection]);

  return null; // This component doesn't render anything
};

const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { autoConnect } = useAutoConnect();
  const { networkConfiguration } = useNetworkConfiguration();
  const network = networkConfiguration as WalletAdapterNetwork;
  const [wallets, setWallets] = useState<any[]>([]);
  const [walletsLoaded, setWalletsLoaded] = useState(false);

  // Use custom RPC endpoint if provided, otherwise fall back to default
  const endpoint = useMemo(() => {
    const customRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    
    if (customRpcUrl) {
      console.log('🚀 Using custom RPC endpoint');
      return customRpcUrl;
    }
    
    console.log(`🌐 Using default RPC endpoint for network: ${network}`);
    return clusterApiUrl(network);
  }, [network]);

  // ✅ Load wallets asynchronously - FIXED to avoid duplicate registration
  useEffect(() => {
    const loadWallets = async () => {
      if (typeof window === 'undefined') {
        setWalletsLoaded(true);
        return;
      }

      const loadedWallets = [];

      // ✅ ONLY load wallets that don't auto-register to avoid conflicts
      try {
        const { TorusWalletAdapter } = await import('@solana/wallet-adapter-wallets');
        loadedWallets.push(new TorusWalletAdapter());
      } catch (error) {
        console.warn('Failed to load Torus adapter:', error);
      }

      // Note: Phantom and Solflare auto-register as Standard Wallets, so we don't manually add them

      console.log(`✅ Loaded ${loadedWallets.length} manual wallet adapters`);
      console.log('ℹ️ Phantom and Solflare will auto-register as Standard Wallets');
      
      setWallets(loadedWallets);
      setWalletsLoaded(true);
    };

    // Small delay to ensure window is available
    const timer = setTimeout(loadWallets, 100);
    return () => clearTimeout(timer);
  }, []);

  const onError = useCallback((error: WalletError) => {
    notify({
      type: 'error',
      message: error.message ? `${error.name}: ${error.message}` : error.name
    });
    console.error('🚨 ALPHA Club wallet error:', error);
  }, []);

  // Simple loading screen
  if (!walletsLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-400 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl">🔗</div>
            </div>
          </div>
          <div className="text-white text-xl font-semibold mb-2">Loading Wallets</div>
          <div className="text-gray-400 text-sm">Preparing wallet connections...</div>
        </div>
      </div>
    );
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect={autoConnect}>
        <ReactUIWalletModalProviderDynamic>
          {/* ✅ ENHANCED: Wallet connection handler with full store clearing */}
          <WalletConnectionHandler />
          {children}
        </ReactUIWalletModalProviderDynamic>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export const ContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <NetworkConfigurationProvider>
      <AutoConnectProvider>
        <WalletContextProvider>{children}</WalletContextProvider>
      </AutoConnectProvider>
    </NetworkConfigurationProvider>
  );
};