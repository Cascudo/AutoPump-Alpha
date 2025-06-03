// src/components/RewardDistributionAdmin.tsx
import { FC, useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { RewardDistributionService } from '../utils/rewardDistributionService';
import { CreatorRewardsWidget } from './CreatorRewardsWidget';

export const RewardDistributionAdmin: FC = () => {
  const { connection } = useConnection();
  const [service, setService] = useState<RewardDistributionService | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastBalance, setLastBalance] = useState(0);
  const [manualAmount, setManualAmount] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const rewardService = new RewardDistributionService(connection);
    setService(rewardService);

    // Update status every 10 seconds
    const statusInterval = setInterval(() => {
      if (rewardService) {
        const status = rewardService.getStatus();
        setIsMonitoring(status.isMonitoring);
        setLastBalance(status.lastBalance);
      }
    }, 10000);

    return () => clearInterval(statusInterval);
  }, [connection]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 19)]); // Keep last 20 logs
  };

  const handleStartMonitoring = async () => {
    if (!service) return;
    
    try {
      addLog('Starting reward distribution monitoring...');
      await service.startMonitoring();
      addLog('✅ Monitoring started successfully');
    } catch (error) {
      addLog(`❌ Error starting monitoring: ${error}`);
    }
  };

  const handleStopMonitoring = () => {
    if (!service) return;
    
    service.stopMonitoring();
    addLog('⏹️ Monitoring stopped');
  };

  const handleManualTrigger = async () => {
    if (!service || !manualAmount) return;
    
    const amount = parseFloat(manualAmount);
    if (isNaN(amount) || amount <= 0) {
      addLog('❌ Invalid amount for manual trigger');
      return;
    }

    try {
      addLog(`🧪 Triggering manual reward distribution for ${amount} SOL...`);
      const result = await service.manualTrigger(amount);
      
      if (result) {
        addLog(`✅ Manual distribution successful - Winner: ${result.winner.substring(0, 8)}...`);
      } else {
        addLog('❌ Manual distribution failed');
      }
    } catch (error) {
      addLog(`❌ Manual trigger error: ${error}`);
    }
    
    setManualAmount('');
  };

  return (
    <div className="space-y-8">
      {/* Creator Rewards Widget */}
      <CreatorRewardsWidget />
      
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <span className="mr-3">🤖</span>
          Reward Distribution Admin
        </h2>

        {/* Status Display */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-black/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Monitoring Status</span>
              <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            </div>
            <div className={`text-lg font-bold ${isMonitoring ? 'text-green-400' : 'text-red-400'}`}>
              {isMonitoring ? 'ACTIVE' : 'STOPPED'}
            </div>
          </div>

          <div className="bg-black/40 rounded-xl p-4">
            <div className="text-gray-400 mb-2">Last Known Balance</div>
            <div className="text-lg font-bold text-cyan-400">
              {lastBalance.toFixed(4)} SOL
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={handleStartMonitoring}
            disabled={isMonitoring}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105"
          >
            {isMonitoring ? '✅ Monitoring Active' : '🚀 Start Monitoring'}
          </button>

          <button
            onClick={handleStopMonitoring}
            disabled={!isMonitoring}
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105"
          >
            ⏹️ Stop Monitoring
          </button>
        </div>

        {/* Manual Trigger Section */}
        <div className="bg-gradient-to-r from-orange-900/30 to-yellow-900/30 rounded-xl p-6 border border-orange-500/20 mb-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <span className="mr-2">🧪</span>
            Manual Test Trigger
          </h3>
          <p className="text-gray-300 text-sm mb-4">
            Simulate a creator fee claim for testing purposes
          </p>
          
          <div className="flex gap-4">
            <input
              type="number"
              step="0.001"
              placeholder="Amount in SOL (e.g., 0.335)"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              className="flex-1 bg-black/40 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-orange-400 focus:outline-none"
            />
            <button
              onClick={handleManualTrigger}
              disabled={!service || !manualAmount}
              className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold transition-all"
            >
              Trigger Test
            </button>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 rounded-xl p-6 border border-teal-500/20 mb-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <span className="mr-2">ℹ️</span>
            How Semi-Automation Works
          </h3>
          <div className="space-y-2 text-gray-300 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-teal-400">1.</span>
              <span>You manually claim creator fees from Pump.fun (like usual)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-teal-400">2.</span>
              <span>Bot detects SOL increase in your wallet: 8Dibf82AXq5...affetX</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-teal-400">3.</span>
              <span>Automatically distributes: 40% rewards, 30% burns, 30% operations</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-teal-400">4.</span>
              <span>Logs everything for transparency</span>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-black/40 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <span className="mr-2">📋</span>
            Activity Log
          </h3>
          
          <div className="h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No activity yet. Start monitoring to see logs.
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={index} className="text-gray-300 text-sm font-mono bg-gray-800/50 rounded p-2">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setLogs([])}
            className="mt-4 text-gray-400 hover:text-white text-sm transition-colors"
          >
            🗑️ Clear Logs
          </button>
        </div>

        {/* Safety Notice */}
        <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-yellow-400">⚠️</span>
            <span className="text-yellow-400 font-semibold">Safety Limits Active</span>
          </div>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• Daily reward: Related to token trading volume</li>
            <li>• Minimum reward amount: 0.03 SOL ($5)</li>
            <li>• Minimum holders for draw: 5 eligible members</li>
            <li>• Only Pump.fun creator fee transactions are processed</li>
          </ul>
        </div>
      </div>
    </div>
  );
};