// src/components/AdminGuard.tsx
import { FC, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { verifyAdminAccess, getAdminInfo, ADMIN_WALLET } from '../utils/adminAuth';

interface AdminGuardProps {
  children: ReactNode;
  requireAuth?: boolean; // Set to true to require admin auth
}

export const AdminGuard: FC<AdminGuardProps> = ({ children, requireAuth = true }) => {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();

  // Get current wallet address
  const walletAddress = publicKey?.toString() || null;
  
  // Verify admin access
  const adminVerification = verifyAdminAccess(walletAddress);
  const adminInfo = getAdminInfo(walletAddress);

  // If auth not required, just render children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // Not connected
  if (!connected || !publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="text-6xl mb-6">🔐</div>
          <h1 className="text-3xl font-bold text-white mb-4">Admin Access Required</h1>
          <p className="text-gray-300 mb-8">
            Connect your wallet to access the admin dashboard.
          </p>
          <button
            onClick={() => setVisible(true)}
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-2xl"
          >
            🔑 Connect Admin Wallet
          </button>
          <div className="mt-6 p-4 bg-yellow-900/20 rounded-xl border border-yellow-500/20">
            <p className="text-yellow-400 text-sm font-semibold">⚠️ Admin Only</p>
            <p className="text-gray-300 text-xs mt-1">
              Only the token deployer wallet can access this area.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Connected but not authorized
  if (!adminVerification.isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900/20 via-black to-red-800/20 flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center p-8">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-red-400 text-lg mb-4 font-semibold">
            {adminVerification.reason}
          </p>
          
          <div className="bg-black/40 rounded-xl p-6 mb-8">
            <h3 className="text-white font-semibold mb-4">Current Connection</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Your Wallet:</span>
                <span className="text-red-400 font-mono">{adminInfo.displayAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Access Level:</span>
                <span className="text-red-400">{adminInfo.adminLevel}</span>
              </div>
            </div>
          </div>

          <div className="bg-green-900/20 rounded-xl p-4 border border-green-500/20 mb-6">
            <p className="text-green-400 text-sm font-semibold mb-2">✅ Authorized Admin Wallet:</p>
            <p className="text-gray-300 font-mono text-xs break-all">
              {ADMIN_WALLET}
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setVisible(true)}
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white py-3 rounded-xl font-semibold transition-all"
            >
              🔄 Connect Different Wallet
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-all"
            >
              🏠 Return to Homepage
            </button>
          </div>

          <div className="mt-8 text-xs text-gray-500">
            <p>This area is restricted to authorized administrators only.</p>
            <p>If you believe this is an error, contact the development team.</p>
          </div>
        </div>
      </div>
    );
  }

  // Authorized - show admin interface with status indicator
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* Admin Status Bar */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white text-center py-2 text-sm font-semibold">
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-200 rounded-full animate-pulse"></div>
            <span>ADMIN MODE ACTIVE</span>
          </div>
          <div className="hidden md:block">•</div>
          <div className="hidden md:block">Logged in as: {adminInfo.displayAddress}</div>
          <div className="hidden md:block">•</div>
          <div className="hidden md:block">Access Level: {adminInfo.adminLevel}</div>
        </div>
      </div>

      {/* Admin Content */}
      <div className="pb-8">
        {children}
      </div>
    </div>
  );
};