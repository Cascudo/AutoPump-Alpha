// src/contexts/ContextProvider.tsx - Simplified Wallet Detection
import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';
import { FC, ReactNode, useCallback, useMemo, useState, useEffect } from 'react';
import { AutoConnectProvider, useAutoConnect } from './AutoConnectProvider';
import { notify } from "../utils/notifications";
import { NetworkConfigurationProvider, useNetworkConfiguration } from './NetworkConfigurationProvider';
import dynamic from "next/dynamic";

const ReactUIWalletModalProviderDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletModalProvider,
  { ssr: false }
);

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

  // Load wallet adapters asynchronously
  useEffect(() => {
    const loadWallets = async () => {
      if (typeof window === 'undefined') {
        setWalletsLoaded(true);
        return;
      }

      const loadedWallets = [];

      try {
        const { PhantomWalletAdapter } = await import('@solana/wallet-adapter-wallets');
        loadedWallets.push(new PhantomWalletAdapter());
      } catch (error) {
        console.warn('Failed to load Phantom adapter:', error);
      }

      try {
        const { SolflareWalletAdapter } = await import('@solana/wallet-adapter-wallets');
        loadedWallets.push(new SolflareWalletAdapter());
      } catch (error) {
        console.warn('Failed to load Solflare adapter:', error);
      }

      try {
        const { TorusWalletAdapter } = await import('@solana/wallet-adapter-wallets');
        loadedWallets.push(new TorusWalletAdapter());
      } catch (error) {
        console.warn('Failed to load Torus adapter:', error);
      }

      console.log(`✅ Loaded ${loadedWallets.length} wallet adapters`);
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