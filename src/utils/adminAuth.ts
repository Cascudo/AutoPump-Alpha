// src/utils/adminAuth.ts
import { PublicKey } from '@solana/web3.js';

// Your wallet address (the deployer/admin)
export const ADMIN_WALLET = '8Dibf82AXq5zN44ZwgLGrn22LYvebbiqSBEVBPaffetX';

// Optional: Add other admin wallets here if needed
export const AUTHORIZED_ADMINS = [
  ADMIN_WALLET,
  // 'AnotherAdminWalletHere...' // Add more if needed
];

/**
 * Check if a wallet address is authorized as admin
 */
export function isAuthorizedAdmin(walletAddress: string | null): boolean {
  if (!walletAddress) return false;
  
  try {
    // Validate it's a real Solana address
    new PublicKey(walletAddress);
    return AUTHORIZED_ADMINS.includes(walletAddress);
  } catch {
    return false;
  }
}

/**
 * Admin verification with detailed response
 */
export function verifyAdminAccess(walletAddress: string | null): {
  isAuthorized: boolean;
  reason: string;
  walletAddress: string | null;
} {
  if (!walletAddress) {
    return {
      isAuthorized: false,
      reason: 'No wallet connected',
      walletAddress: null
    };
  }

  try {
    // Validate address format
    new PublicKey(walletAddress);
    
    if (AUTHORIZED_ADMINS.includes(walletAddress)) {
      return {
        isAuthorized: true,
        reason: 'Admin access granted',
        walletAddress
      };
    } else {
      return {
        isAuthorized: false,
        reason: 'Wallet not authorized for admin access',
        walletAddress
      };
    }
  } catch {
    return {
      isAuthorized: false,
      reason: 'Invalid wallet address format',
      walletAddress
    };
  }
}

/**
 * Get formatted admin info for display
 */
export function getAdminInfo(walletAddress: string | null): {
  isAdmin: boolean;
  displayAddress: string;
  adminLevel: string;
} {
  const isAdmin = isAuthorizedAdmin(walletAddress);
  
  return {
    isAdmin,
    displayAddress: walletAddress ? 
      `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : 
      'Not connected',
    adminLevel: isAdmin ? 'Super Admin' : 'No Access'
  };
}