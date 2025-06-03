// src/components/WalletDebugHelper.tsx - Temporary debug component
import { FC, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export const WalletDebugHelper: FC = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [debugResults, setDebugResults] = useState<any>(null);
  const [isDebugging, setIsDebugging] = useState(false);

  const runDebug = async () => {
    if (!publicKey) return;
    
    setIsDebugging(true);
    setDebugResults(null);
    
    try {
      console.log('🐛 Starting wallet debug for:', publicKey.toString());
      
      // Get all token accounts
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const accounts = tokenAccounts.value.map((account, index) => {
        const parsedInfo = account.account.data.parsed.info;
        return {
          index: index + 1,
          mint: parsedInfo.mint,
          balance: parsedInfo.tokenAmount.uiAmount || 0,
          decimals: parsedInfo.tokenAmount.decimals,
          isAlpha: parsedInfo.mint === '4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump'
        };
      });

      const alphaAccount = accounts.find(acc => acc.isAlpha);
      
      setDebugResults({
        walletAddress: publicKey.toString(),
        totalAccounts: accounts.length,
        accounts,
        hasAlpha: !!alphaAccount,
        alphaBalance: alphaAccount?.balance || 0
      });

    } catch (error) {
      console.error('Debug error:', error);
      setDebugResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsDebugging(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-4 mb-6">
        <div className="text-yellow-400 font-semibold mb-2">🔍 Wallet Debug</div>
        <div className="text-gray-300 text-sm">Connect your wallet to debug token accounts</div>
      </div>
    );
  }

  return (
    <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-blue-400 font-semibold">🔍 Wallet Debug Helper</div>
        <button
          onClick={runDebug}
          disabled={isDebugging}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        >
          {isDebugging ? 'Debugging...' : 'Debug Wallet'}
        </button>
      </div>

      {debugResults && (
        <div className="bg-black/40 rounded-lg p-4">
          {debugResults.error ? (
            <div className="text-red-400">Error: {debugResults.error}</div>
          ) : (
            <div className="space-y-3">
              <div className="text-white font-semibold">
                Wallet: {debugResults.walletAddress.slice(0, 8)}...{debugResults.walletAddress.slice(-8)}
              </div>
              
              <div className="text-gray-300">
                Total Token Accounts: {debugResults.totalAccounts}
              </div>
              
              <div className={`font-semibold ${debugResults.hasAlpha ? 'text-green-400' : 'text-red-400'}`}>
                ALPHA Token: {debugResults.hasAlpha ? `✅ Found (${debugResults.alphaBalance.toLocaleString()} tokens)` : '❌ Not Found'}
              </div>

              {debugResults.accounts.length > 0 && (
                <div>
                  <div className="text-gray-400 text-sm mb-2">All Token Accounts:</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {debugResults.accounts.map((account: any) => (
                      <div key={account.index} className={`text-xs p-2 rounded ${account.isAlpha ? 'bg-green-900/30 border border-green-500/20' : 'bg-gray-800/50'}`}>
                        <div className="font-mono">
                          {account.index}. {account.mint.slice(0, 8)}...{account.mint.slice(-8)}
                        </div>
                        <div className="text-gray-400">
                          Balance: {account.balance.toLocaleString()} {account.isAlpha && '(🎯 ALPHA)'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        Expected ALPHA mint: 4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump
      </div>
    </div>
  );
};