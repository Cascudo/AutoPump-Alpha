// src/components/CompactCreatorRewards.tsx
import { FC, useState, useEffect, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface CompactRewardsProps {
  variant?: 'homepage' | 'dashboard' | 'minimal';
  showCountdown?: boolean;
  className?: string;
}

interface RewardsData {
  totalAvailable: number;
  usdValue: number;
  potentialWin: number;
  timeUntilDraw: string;
  isLoading: boolean;
  solPrice: number;
}

export const CompactCreatorRewards: FC<CompactRewardsProps> = ({ 
  variant = 'homepage', 
  showCountdown = true,
  className = '' 
}) => {
  const { connection } = useConnection();
  const [data, setData] = useState<RewardsData>({
    totalAvailable: 0,
    usdValue: 0,
    potentialWin: 0,
    timeUntilDraw: '',
    isLoading: true,
    solPrice: 200
  });

  const CREATOR_VAULT = '5E4Lqx88TG3e6iYa1B8LEDbNEP98YGDBH4VreKcvp8vZ';
  const CREATOR_WALLET = '8Dibf82AXq5zN44ZwgLGrn22LYvebbiqSBEVBPaffetX';

  const fetchSolPrice = async (): Promise<number> => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      return data.solana?.usd || 200; // Fallback to $200 if API fails
    } catch (error) {
      console.warn('Failed to fetch SOL price, using fallback:', error);
      return 200; // Fallback price
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [vaultBalance, walletBalance, solPrice] = await Promise.all([
        connection.getBalance(new PublicKey(CREATOR_VAULT)),
        connection.getBalance(new PublicKey(CREATOR_WALLET)),
        fetchSolPrice()
      ]);

      const totalAvailable = (vaultBalance + walletBalance) / LAMPORTS_PER_SOL;
      const potentialWin = totalAvailable * 0.4; // 40% to winner
      const usdValue = totalAvailable * solPrice;

      // Calculate time until next draw (11:00 UTC)
      const now = new Date();
      const nextDraw = new Date();
      nextDraw.setUTCHours(11, 0, 0, 0);
      if (nextDraw.getTime() <= now.getTime()) {
        nextDraw.setDate(nextDraw.getDate() + 1);
      }
      
      const timeUntil = nextDraw.getTime() - now.getTime();
      const hours = Math.floor(timeUntil / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
      const timeUntilDraw = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      setData({
        totalAvailable,
        usdValue,
        potentialWin,
        timeUntilDraw,
        isLoading: false,
        solPrice
      });

    } catch (error) {
      console.error('Error fetching rewards data:', error);
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [connection]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  // Minimal variant for sidebars/small spaces
  if (variant === 'minimal') {
    return (
      <div className={`bg-gradient-to-r from-teal-600/20 to-cyan-600/20 rounded-lg p-3 border border-teal-500/30 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400">Next Prize</div>
            <div className="text-lg font-bold text-teal-400">
              {data.isLoading ? '...' : `${data.potentialWin.toFixed(3)} SOL`}
            </div>
          </div>
          <div className="text-2xl">🏆</div>
        </div>
        {showCountdown && (
          <div className="text-xs text-gray-500 mt-1">
            Draw in {data.timeUntilDraw}
          </div>
        )}
      </div>
    );
  }

  // Dashboard variant for user dashboards
  if (variant === 'dashboard') {
    return (
      <div className={`bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-500/20 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">💰</div>
            <div>
              <h3 className="text-lg font-bold text-white">Today&apos;s Prize Pool</h3>
              <p className="text-gray-300 text-sm">What you could win</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>

        <div className="bg-black/40 rounded-xl p-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {data.isLoading ? 'Loading...' : `${data.potentialWin.toFixed(4)} SOL`}
            </div>
            <div className="text-gray-300">
              ${(data.potentialWin * data.solPrice).toFixed(2)} USD
            </div>
            <div className="text-xs text-gray-500 mt-1">
              From {data.totalAvailable.toFixed(4)} SOL total pool
            </div>
          </div>
        </div>

        {showCountdown && (
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-1">Next Draw In</div>
            <div className="text-xl font-bold text-yellow-400">{data.timeUntilDraw}</div>
          </div>
        )}
      </div>
    );
  }

  // Homepage variant - eye-catching FOMO builder
  return (
    <div className={`bg-gradient-to-r from-red-900/40 to-orange-900/40 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
          <span className="text-red-400 font-bold text-lg">LIVE PRIZE POOL</span>
          <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
        </div>
        <div className="text-xs text-gray-400">
          Updates every minute
        </div>
      </div>

      <div className="text-center mb-4">
        <div className="text-sm text-gray-300 mb-2">Next Winner Could Take Home</div>
        <div className="text-4xl font-bold text-white mb-2">
          {data.isLoading ? (
            <div className="animate-pulse">Loading...</div>
          ) : (
            `${data.potentialWin.toFixed(4)} SOL`
          )}
        </div>
        <div className="text-xl text-orange-400 font-semibold">
          ${(data.potentialWin * data.solPrice).toFixed(2)} USD
        </div>
        <div className="text-xs text-gray-500 mt-1">
          40% of {data.totalAvailable.toFixed(4)} SOL creator rewards
        </div>
      </div>

      {showCountdown && (
        <div className="bg-black/40 rounded-lg p-3">
          <div className="flex items-center justify-center space-x-4">
            <div className="text-center">
              <div className="text-xs text-gray-400">Next Draw</div>
              <div className="text-lg font-bold text-red-400">{data.timeUntilDraw}</div>
            </div>
            <div className="text-2xl">⏰</div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Daily at</div>
              <div className="text-lg font-bold text-red-400">11:00 UTC</div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-center">
        <div className="text-xs text-orange-400 font-semibold">
          🔥 Hold $10+ worth of $ALPHA to enter daily draws
        </div>
      </div>
    </div>
  );
};