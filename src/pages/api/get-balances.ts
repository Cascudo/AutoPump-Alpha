// src/pages/api/get-balances.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const CREATOR_VAULT = '5E4Lqx88TG3e6iYa1B8LEDbNEP98YGDBH4VreKcvp8vZ';
const CREATOR_WALLET = '8Dibf82AXq5zN44ZwgLGrn22LYvebbiqSBEVBPaffetX';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try multiple RPC endpoints in order of preference
    const rpcEndpoints = [
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL, // Your Syndica endpoint
      'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com',
      'https://rpc.ankr.com/solana',
      'https://api.metaplex.solana.com',
    ].filter(Boolean); // Remove undefined values

    let lastError = null;

    for (const endpoint of rpcEndpoints) {
      try {
        console.log(`🧪 Trying RPC endpoint: ${endpoint}`);
        const connection = new Connection(endpoint, 'confirmed');

        // Test connection first
        await connection.getVersion();
        
        // Get both balances
        const [vaultBalance, walletBalance] = await Promise.all([
          connection.getBalance(new PublicKey(CREATOR_VAULT)),
          connection.getBalance(new PublicKey(CREATOR_WALLET))
        ]);

        const vaultSol = vaultBalance / LAMPORTS_PER_SOL;
        const walletSol = walletBalance / LAMPORTS_PER_SOL;
        const totalSol = vaultSol + walletSol;

        console.log(`✅ Success with ${endpoint}:`, {
          vault: vaultSol,
          wallet: walletSol,
          total: totalSol
        });

        return res.status(200).json({
          success: true,
          data: {
            vaultBalance: vaultSol,
            walletBalance: walletSol,
            totalBalance: totalSol,
            vaultLamports: vaultBalance,
            walletLamports: walletBalance,
            totalLamports: vaultBalance + walletBalance,
            rpcEndpoint: endpoint,
            timestamp: Date.now()
          }
        });

      } catch (error) {
        console.warn(`❌ Failed with ${endpoint}:`, error.message);
        lastError = error;
        continue; // Try next endpoint
      }
    }

    // If we get here, all endpoints failed
    throw new Error(`All RPC endpoints failed. Last error: ${lastError?.message}`);

  } catch (error) {
    console.error('💥 API Route Error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
}