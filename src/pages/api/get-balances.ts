// src/pages/api/get-balances.ts - COMPLETE FIXED VERSION based on Solscan transaction data
import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { AccountLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { MarketDataService } from '../../utils/marketDataService';

// 🎯 CORRECT: This is the actual WSOL token account that holds creator fees
const CREATOR_VAULT_ATA = '48Z59ov4o2k3TCnAu1ihGNq5esDabqzRGMRrz5hgiKTA';

// This is the vault authority (controls the ATA above, but doesn't hold funds directly)
const CREATOR_VAULT_AUTHORITY = 'BJNJ36AQxBVoyBdZhdV1wyN7GDkro3uFwwNAxs4eQQFy';

// Wrapped SOL mint address
const WSOL_MINT = 'So11111111111111111111111111111111111111112';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
let solPrice = 145; // Default SOL price

try {
  // Get dynamic SOL price
  try {
    console.log('🔄 Fetching market data using WORKING APIs...');
    const marketService = MarketDataService.getInstance();
    const marketData = await marketService.getMarketData();
    solPrice = marketData.solPriceUSD;
    console.log('✅ SOL price:', `$${solPrice.toFixed(2)}`);
  } catch (priceError) {
    console.warn('⚠️ Market data failed, using fallback SOL price');
    solPrice = 145;
  }

    // RPC endpoints prioritized for balance queries
    const rpcEndpoints = [
      {
        url: process.env.SOLANA_RPC_BACKUP_1, // Helius first for balance queries
        name: 'Helius (Primary for Balance)',
        timeout: 10000
      },
      {
        url: process.env.NEXT_PUBLIC_SOLANA_RPC_URL, // Syndica as backup
        name: 'Syndica (Backup)',
        timeout: 8000
      },
      {
        url: process.env.SOLANA_RPC_BACKUP_2,
        name: 'Solscan Pro (Backup)',
        timeout: 8000
      },
      {
        url: 'https://api.mainnet-beta.solana.com',
        name: 'Solana Public RPC',
        timeout: 15000
      }
    ].filter(endpoint => endpoint.url);

    let lastError = null;
    let vaultBalance = 0;
    let vaultLamports = 0;
    let method = 'Unknown';
    let addressUsed = '';

    for (const endpoint of rpcEndpoints) {
      try {
        console.log('🧪 Trying RPC endpoint:', endpoint.name);
        
        const connection = new Connection(endpoint.url, {
          commitment: 'confirmed',
          wsEndpoint: undefined,
          httpHeaders: {
            'User-Agent': 'ALPHA-Club/1.0'
          }
        });

        let balanceResult = null;

        // 🎯 Method 1: Check the actual WSOL token account (from Solscan data)
        try {
          console.log('🔍 Method 1: Checking Creator Vault ATA (actual WSOL token account)...');
const tokenAccountInfo = await Promise.race([
  connection.getAccountInfo(new PublicKey(CREATOR_VAULT_ATA)),
  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), endpoint.timeout))
]) as Awaited<ReturnType<typeof connection.getAccountInfo>>;

if (tokenAccountInfo && tokenAccountInfo.data) {
            try {
              const tokenAccount = AccountLayout.decode(new Uint8Array(tokenAccountInfo.data));
              const mint = new PublicKey(tokenAccount.mint);
              
              // Verify it's a WSOL token account
              if (mint.equals(new PublicKey(WSOL_MINT))) {
                vaultLamports = Number(tokenAccount.amount);
                vaultBalance = vaultLamports / 1e9;
                method = 'WSOL Creator Vault ATA';
                addressUsed = CREATOR_VAULT_ATA;
                balanceResult = { success: true, method, balance: vaultBalance };
                console.log('✅ Successfully read Creator Vault ATA:', vaultBalance, 'WSOL');
              } else {
                throw new Error(`Token account has wrong mint: ${mint.toString()}`);
              }
            } catch (decodeError) {
              throw new Error(`Token account decode failed: ${decodeError.message}`);
            }
          } else {
            throw new Error('Creator Vault ATA not found or empty');
          }
        } catch (ataError) {
          console.log('⚠️ Creator Vault ATA failed:', ataError.message);

          // 🎯 Method 2: Check the vault authority for any SOL balance (fallback)
          try {
            console.log('🔍 Method 2: Checking Creator Vault Authority for SOL...');
const authorityBalance = await Promise.race([
  connection.getBalance(new PublicKey(CREATOR_VAULT_AUTHORITY)),
  new Promise<number>((_, reject) => setTimeout(() => reject(new Error('Timeout')), endpoint.timeout))
]) as number;

if (authorityBalance > 0) {
              vaultLamports = authorityBalance;
              vaultBalance = vaultLamports / 1e9;
              method = 'Creator Vault Authority SOL';
              addressUsed = CREATOR_VAULT_AUTHORITY;
              balanceResult = { success: true, method, balance: vaultBalance };
              console.log('✅ Found SOL in Creator Vault Authority:', vaultBalance, 'SOL');
            } else {
              throw new Error('No SOL balance in vault authority');
            }
          } catch (authorityError) {
            throw new Error(`Both methods failed - ATA: ${ataError.message} | Authority: ${authorityError.message}`);
          }
        }

        if (balanceResult?.success) {
          // Calculate USD value
          const usdValue = vaultBalance * solPrice;

          console.log(`✅ Success with ${endpoint.name}:`, {
            balance: vaultBalance,
            usd: usdValue.toFixed(2),
            method: method,
            address: addressUsed.slice(0, 8) + '...' + addressUsed.slice(-8)
          });

          return res.status(200).json({
            success: true,
            data: {
              vaultBalance: vaultBalance,
              vaultLamports: vaultLamports,
              usdValue: usdValue,
              solPrice: solPrice,
              method: method,
              address: addressUsed,
              creatorVaultAta: CREATOR_VAULT_ATA,
              creatorVaultAuthority: CREATOR_VAULT_AUTHORITY,
              mint: WSOL_MINT,
              rpcEndpoint: endpoint.name,
              responseTime: Date.now() - startTime,
              timestamp: Date.now()
            }
          });
        }

        // If we get here with no balance but no errors, return zero balance
        const usdValue = vaultBalance * solPrice;
        
        console.log(`✅ Success with ${endpoint.name} (zero balance):`, {
          balance: vaultBalance,
          method: method || 'Zero Balance Found'
        });

        return res.status(200).json({
          success: true,
          data: {
            vaultBalance: vaultBalance,
            vaultLamports: vaultLamports,
            usdValue: usdValue,
            solPrice: solPrice,
            method: method || 'Zero Balance Found',
            address: addressUsed || CREATOR_VAULT_ATA,
            creatorVaultAta: CREATOR_VAULT_ATA,
            creatorVaultAuthority: CREATOR_VAULT_AUTHORITY,
            mint: WSOL_MINT,
            rpcEndpoint: endpoint.name,
            responseTime: Date.now() - startTime,
            timestamp: Date.now()
          }
        });

      } catch (error) {
        console.warn(`❌ Failed with ${endpoint.name}:`, error.message);
        lastError = error;
        continue;
      }
    }

    // Only reach here if ALL endpoints failed
    console.error('💥 All RPC endpoints failed');
    
    return res.status(500).json({
      success: false,
      error: `All RPC endpoints failed. Last error: ${lastError?.message || 'Unknown error'}`,
      data: {
        vaultBalance: 0,
        vaultLamports: 0,
        usdValue: 0,
        solPrice: solPrice,
        method: 'All RPCs Failed',
        address: CREATOR_VAULT_ATA,
        creatorVaultAta: CREATOR_VAULT_ATA,
        creatorVaultAuthority: CREATOR_VAULT_AUTHORITY,
        mint: WSOL_MINT,
        rpcEndpoint: 'Failed',
        responseTime: Date.now() - startTime,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('💥 API Route Critical Error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message,
      data: {
        vaultBalance: 0,
        vaultLamports: 0,
        usdValue: 0,
        solPrice: solPrice,
        method: 'Critical Error',
        address: CREATOR_VAULT_ATA,
        creatorVaultAta: CREATOR_VAULT_ATA,
        creatorVaultAuthority: CREATOR_VAULT_AUTHORITY,
        mint: WSOL_MINT,
        rpcEndpoint: 'Error',
        responseTime: Date.now() - startTime,
        timestamp: Date.now()
      }
    });
  }
}