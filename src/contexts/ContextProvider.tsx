// src/contexts/ContextProvider.tsx - Universal Wallet Detection
import { WalletAdapterNetwork, WalletError, BaseWalletAdapter, WalletName, WalletReadyState } from '@solana/wallet-adapter-base';
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

// Universal Wallet Interface - follows Solana Wallet Standard
interface UniversalWallet {
  name: string;
  icon: string;
  url: string;
  readyState: 'Installed' | 'NotDetected' | 'Loadable' | 'Unsupported';
  adapter?: BaseWalletAdapter;
}

// Create a Universal Wallet Adapter for any detected wallet
class UniversalWalletAdapter extends BaseWalletAdapter {
  name: WalletName;
  url: string;
  icon: string;
  private _wallet: any;
  readonly supportedTransactionVersions = new Set<'legacy' | 0>(['legacy', 0]);

  constructor(walletInfo: { name: string; url: string; icon: string; wallet: any }) {
    super();
    this.name = walletInfo.name as WalletName;
    this.url = walletInfo.url;
    this.icon = walletInfo.icon;
    this._wallet = walletInfo.wallet;
  }

  get publicKey() {
    return this._wallet?.publicKey || null;
  }

  get connecting() {
    return false;
  }

  get connected() {
    return this._wallet?.isConnected || false;
  }

  get readyState(): WalletReadyState {
    if (this._wallet) {
      return WalletReadyState.Installed;
    }
    return WalletReadyState.NotDetected;
  }

  async connect() {
    if (this._wallet?.connect) {
      await this._wallet.connect();
    }
  }

  async disconnect() {
    if (this._wallet?.disconnect) {
      await this._wallet.disconnect();
    }
  }

  async sendTransaction(transaction: any, connection: any) {
    if (this._wallet?.sendTransaction) {
      return await this._wallet.sendTransaction(transaction, connection);
    }
    throw new Error('Wallet does not support sendTransaction');
  }

  async signTransaction(transaction: any) {
    if (this._wallet?.signTransaction) {
      return await this._wallet.signTransaction(transaction);
    }
    throw new Error('Wallet does not support signTransaction');
  }

  async signAllTransactions(transactions: any[]) {
    if (this._wallet?.signAllTransactions) {
      return await this._wallet.signAllTransactions(transactions);
    }
    throw new Error('Wallet does not support signAllTransactions');
  }

  async signMessage(message: Uint8Array) {
    if (this._wallet?.signMessage) {
      return await this._wallet.signMessage(message);
    }
    throw new Error('Wallet does not support signMessage');
  }
}

// Universal wallet detection system
const detectAllSolanaWallets = async (): Promise<BaseWalletAdapter[]> => {
  const wallets: BaseWalletAdapter[] = [];
  
  if (typeof window === 'undefined') {
    console.log('🚫 Server-side rendering - no wallets detected');
    return wallets;
  }

  console.log('🔍 Starting UNIVERSAL Solana wallet detection...');

  // Method 1: Detect wallets using Solana Wallet Standard (most modern approach)
  try {
    // Check if wallet standard is available
    if ((window as any).solana && (window as any).solana.providers) {
      console.log('📱 Wallet Standard detected - checking providers...');
      const providers = (window as any).solana.providers;
      
      for (const provider of providers) {
        if (provider.isPhantom || provider.isSolflare || provider.name) {
          const walletName = provider.name || (provider.isPhantom ? 'Phantom' : 'Unknown Wallet');
          console.log(`✅ Standard wallet detected: ${walletName}`);
          
          const adapter = new UniversalWalletAdapter({
            name: walletName,
            url: provider.url || '#',
            icon: provider.icon || '',
            wallet: provider
          });
          wallets.push(adapter);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Wallet Standard detection failed:', error);
  }

  // Method 2: Manual detection of known wallet patterns
  const walletPatterns = [
    // Phantom
    {
      name: 'Phantom',
      check: () => (window as any).phantom?.solana,
      wallet: () => (window as any).phantom.solana,
      icon: 'https://phantom.app/img/phantom-logo.svg',
      url: 'https://phantom.app'
    },
    // Solflare
    {
      name: 'Solflare',
      check: () => (window as any).solflare,
      wallet: () => (window as any).solflare,
      icon: 'https://solflare.com/img/logo.svg',
      url: 'https://solflare.com'
    },
    // Backpack
    {
      name: 'Backpack',
      check: () => (window as any).backpack,
      wallet: () => (window as any).backpack,
      icon: 'https://backpack.exchange/backpack.png',
      url: 'https://backpack.exchange'
    },
    // Glow
    {
      name: 'Glow',
      check: () => (window as any).glow,
      wallet: () => (window as any).glow,
      icon: 'https://glow.app/img/logo.png',
      url: 'https://glow.app'
    },
    // Coinbase Wallet
    {
      name: 'Coinbase Wallet',
      check: () => (window as any).coinbaseSolana,
      wallet: () => (window as any).coinbaseSolana,
      icon: 'https://avatars.githubusercontent.com/u/18060234?s=280&v=4',
      url: 'https://wallet.coinbase.com'
    },
    // Trust Wallet
    {
      name: 'Trust Wallet',
      check: () => (window as any).trustwallet?.solana,
      wallet: () => (window as any).trustwallet.solana,
      icon: 'https://trustwallet.com/assets/images/trust_platform.png',
      url: 'https://trustwallet.com'
    },
    // Math Wallet
    {
      name: 'Math Wallet',
      check: () => (window as any).solana?.isMathWallet,
      wallet: () => (window as any).solana,
      icon: 'https://mathwallet.org/images/logo.png',
      url: 'https://mathwallet.org'
    },
    // TokenPocket
    {
      name: 'TokenPocket',
      check: () => (window as any).tokenpocket?.solana,
      wallet: () => (window as any).tokenpocket.solana,
      icon: 'https://tokenpocket.pro/img/logo.png',
      url: 'https://tokenpocket.pro'
    },
    // Slope
    {
      name: 'Slope',
      check: () => (window as any).slope,
      wallet: () => (window as any).slope,
      icon: 'https://slope.finance/slope-logo.png',
      url: 'https://slope.finance'
    },
    // Clover
    {
      name: 'Clover',
      check: () => (window as any).clover_solana,
      wallet: () => (window as any).clover_solana,
      icon: 'https://clover.finance/clover-logo.png',
      url: 'https://clover.finance'
    },
    // Coin98
    {
      name: 'Coin98',
      check: () => (window as any).coin98?.sol,
      wallet: () => (window as any).coin98.sol,
      icon: 'https://coin98.com/img/logo.png',
      url: 'https://coin98.com'
    },
    // Exodus
    {
      name: 'Exodus',
      check: () => (window as any).exodus?.solana,
      wallet: () => (window as any).exodus.solana,
      icon: 'https://exodus.com/img/logo.png',
      url: 'https://exodus.com'
    },
    // Bitpie
    {
      name: 'Bitpie',
      check: () => (window as any).bitpie?.solana,
      wallet: () => (window as any).bitpie.solana,
      icon: 'https://bitpie.com/img/logo.png',
      url: 'https://bitpie.com'
    },
    // SafePal
    {
      name: 'SafePal',
      check: () => (window as any).safepal?.solana,
      wallet: () => (window as any).safepal.solana,
      icon: 'https://safepal.io/sfp-logo.png',
      url: 'https://safepal.io'
    }
  ];

  // Check each known wallet pattern
  for (const pattern of walletPatterns) {
    try {
      if (pattern.check()) {
        console.log(`✅ ${pattern.name} detected`);
        
        const adapter = new UniversalWalletAdapter({
          name: pattern.name,
          url: pattern.url,
          icon: pattern.icon,
          wallet: pattern.wallet()
        });
        
        // Avoid duplicates
        if (!wallets.find(w => w.name === pattern.name)) {
          wallets.push(adapter);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Error checking ${pattern.name}:`, error);
    }
  }

  // Method 3: Auto-detect unknown wallets by scanning window object
  try {
    console.log('🔍 Scanning for unknown Solana wallets...');
    
    const windowKeys = Object.keys(window as any);
    const potentialWallets = windowKeys.filter(key => {
      const obj = (window as any)[key];
      return (
        obj && 
        typeof obj === 'object' && 
        (
          obj.solana || 
          obj.isSolana || 
          (obj.connect && obj.disconnect && obj.publicKey !== undefined) ||
          (obj.signTransaction && obj.signAllTransactions)
        )
      );
    });

    for (const key of potentialWallets) {
      try {
        const walletObj = (window as any)[key];
        const walletName = walletObj.name || key.charAt(0).toUpperCase() + key.slice(1);
        
        // Skip if we already detected this wallet
        if (wallets.find(w => w.name.toLowerCase().includes(key.toLowerCase()))) {
          continue;
        }
        
        console.log(`🔍 Potential new wallet detected: ${walletName}`);
        
        const adapter = new UniversalWalletAdapter({
          name: walletName,
          url: walletObj.url || '#',
          icon: walletObj.icon || '',
          wallet: walletObj.solana || walletObj
        });
        
        wallets.push(adapter);
      } catch (error) {
        console.warn(`⚠️ Error processing potential wallet ${key}:`, error);
      }
    }
  } catch (error) {
    console.warn('⚠️ Auto-detection scan failed:', error);
  }

  // Method 4: Load standard web-based wallets (using try-catch for each)
  const webWallets = [
    {
      name: 'Phantom',
      load: async () => {
        try {
          const { PhantomWalletAdapter } = await import('@solana/wallet-adapter-wallets');
          return new PhantomWalletAdapter();
        } catch { return null; }
      }
    },
    {
      name: 'Solflare',
      load: async () => {
        try {
          const { SolflareWalletAdapter } = await import('@solana/wallet-adapter-wallets');
          return new SolflareWalletAdapter();
        } catch { return null; }
      }
    },
    {
      name: 'Torus',
      load: async () => {
        try {
          const { TorusWalletAdapter } = await import('@solana/wallet-adapter-wallets');
          return new TorusWalletAdapter();
        } catch { return null; }
      }
    }
  ];

  // Add web wallets that aren't already detected
  for (const webWallet of webWallets) {
    try {
      if (!wallets.find(w => w.name.toLowerCase().includes(webWallet.name.toLowerCase()))) {
        const adapter = await webWallet.load();
        if (adapter) {
          wallets.push(adapter);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load ${webWallet.name}:`, error);
    }
  }

  console.log(`🎯 Universal wallet detection complete!`);
  console.log(`📱 Found ${wallets.length} Solana-compatible wallets:`);
  wallets.forEach(wallet => console.log(`   - ${wallet.name}`));

  return wallets;
};

const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { autoConnect } = useAutoConnect();
  const { networkConfiguration } = useNetworkConfiguration();
  const network = networkConfiguration as WalletAdapterNetwork;
  const [wallets, setWallets] = useState<BaseWalletAdapter[]>([]);
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

  // Load wallets with retry mechanism
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const loadWallets = async () => {
      console.log('🔄 Loading ALL Solana wallets...');
      setWalletsLoaded(false);

      try {
        const detectedWallets = await detectAllSolanaWallets();

        if (isMounted) {
          setWallets(detectedWallets);
          setWalletsLoaded(true);
          console.log('✨ Universal wallet loading complete!');
        }
      } catch (error) {
        console.error('💥 Error loading wallets:', error);
        
        if (retryCount < maxRetries && isMounted) {
          retryCount++;
          console.log(`🔄 Retrying wallet detection (${retryCount}/${maxRetries})...`);
          setTimeout(loadWallets, 1000 * retryCount); // Progressive delay
        } else if (isMounted) {
          setWalletsLoaded(true); // Prevent infinite loading
        }
      }
    };

    // Initial delay to ensure all wallet extensions are loaded
    const timer = setTimeout(loadWallets, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [network]);

  const onError = useCallback((error: WalletError) => {
    notify({
      type: 'error',
      message: error.message ? `${error.name}: ${error.message}` : error.name
    });
    console.error('🚨 ALPHA Club wallet error:', error);
  }, []);

  // Enhanced loading screen
  if (!walletsLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-400 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl">🔍</div>
            </div>
          </div>
          <div className="text-white text-xl font-semibold mb-2">Detecting Wallets</div>
          <div className="text-gray-400 text-sm mb-4">Scanning for all Solana-compatible wallets...</div>
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
            <span>Including newly launched wallets</span>
          </div>
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