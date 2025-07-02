// src/components/AppBar.tsx - FIXED: Using Next.js Image component for optimization
import { FC, useState } from 'react';
import Link from "next/link";
import Image from "next/image";
import dynamic from 'next/dynamic';
import { useAutoConnect } from '../contexts/AutoConnectProvider';
import { useWallet } from '@solana/wallet-adapter-react';

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export const AppBar: FC = () => {
  const { autoConnect, setAutoConnect } = useAutoConnect();
  const { connected } = useWallet();
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <>
      {/* Live Status Bar */}
      <div className="bg-gradient-to-r from-teal-600/80 to-cyan-600/80 text-white text-center py-2 text-sm font-medium">
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>LIVE REWARDS ACTIVE</span>
          </div>
          <div className="hidden md:block">•</div>
          <div className="hidden md:block">Next Draw: Daily at 11:00 UTC</div>
          <div className="hidden md:block">•</div>
          <div className="hidden md:block">100M Dev Tokens Locked 🔒</div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="bg-black/95 backdrop-blur-md border-b border-teal-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* ✅ FIXED: Logo with Spinning Animation - Using Next.js Image */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-3 hover:scale-105 transition-transform">
                <div className="relative">
                  {/* Spinning Outer Circle - Same as LoadingSpinner */}
                  <div className="animate-spin" style={{ animationDuration: '4s' }}>
                    <Image 
                      src="/alpha-outer-circle-307x307px.png" 
                      alt="ALPHA Club"
                      width={48}
                      height={48}
                      className="w-12 h-12"
                      priority
                    />
                  </div>
                  
                  {/* Static Inner Circle - Same as LoadingSpinner */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Image 
                      src="/alpha-inner-circle-307x307px.png" 
                      alt="ALPHA Club Inner"
                      width={40}
                      height={40}
                      className="w-10 h-10"
                      priority
                    />
                  </div>
                </div>
                <div className="hidden sm:block">
                  <div className="text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                    ALPHA CLUB
                  </div>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <Link 
                  href="/" 
                  className="text-gray-300 hover:text-teal-400 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Home
                </Link>
                {connected && (
                  <Link 
                    href="/dashboard" 
                    className="text-gray-300 hover:text-teal-400 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Dashboard
                  </Link>
                )}
                <Link 
                  href="/rewards" 
                  className="text-gray-300 hover:text-teal-400 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Rewards
                </Link>
                <Link 
                  href="/burns" 
                  className="text-gray-300 hover:text-teal-400 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Burns
                </Link>
                <Link 
                  href="/giveaway" 
                  className="text-gray-300 hover:text-teal-400 px-3 py-2 text-sm font-medium transition-colors"
                >
                  🎁 Giveaways
                </Link>
                <Link 
                  href="/whitepaper" 
                  className="text-purple-400 hover:text-purple-300 px-3 py-2 text-sm font-medium transition-colors"
                >
                  📄 Whitepaper
                </Link>
                <Link 
                  href="/vip" 
                  className="text-teal-400 hover:text-cyan-400 px-3 py-2 text-sm font-semibold transition-colors"
                >
                  VIP Club
                </Link>
              </div>
            </div>

            {/* Wallet Connection & Settings */}
            <div className="flex items-center space-x-4">
              <WalletMultiButtonDynamic className="!bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 !border-0 !text-white !font-semibold !px-4 !py-2 !rounded-lg !text-sm" />
              
              {/* Settings Dropdown - Network Switcher Removed */}
              <div className="relative">
                <div className="dropdown dropdown-end">
                  <div tabIndex={0} className="btn btn-ghost btn-circle text-teal-400 hover:text-white hover:bg-teal-400/20">
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <ul tabIndex={0} className="dropdown-content menu p-2 shadow-2xl bg-black/90 backdrop-blur-md rounded-xl border border-teal-500/20 w-52 mt-2">
                    <li>
                      <div className="form-control">
                        <label className="cursor-pointer label">
                          <span className="text-white text-sm">Auto-connect</span>
                          <input 
                            type="checkbox" 
                            checked={autoConnect} 
                            onChange={(e) => setAutoConnect(e.target.checked)} 
                            className="toggle toggle-sm" 
                            style={{ '--tglbg': '#14b8a6' } as any}
                          />
                        </label>
                      </div>
                    </li>
                    <li>
                      <div className="px-2 py-1 text-gray-400 text-xs">
                        Network: Mainnet
                        <div className="text-green-400 text-xs">● Connected</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsNavOpen(!isNavOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-teal-400 hover:bg-gray-700 focus:outline-none"
                >
                  <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                    {!isNavOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isNavOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-700">
                <Link href="/" className="text-gray-300 hover:text-teal-400 block px-3 py-2 text-base font-medium">
                  Home
                </Link>
                {connected && (
                  <Link href="/dashboard" className="text-gray-300 hover:text-teal-400 block px-3 py-2 text-base font-medium">
                    Dashboard
                  </Link>
                )}
                <Link href="/rewards" className="text-gray-300 hover:text-teal-400 block px-3 py-2 text-base font-medium">
                  Rewards
                </Link>
                <Link href="/burns" className="text-gray-300 hover:text-teal-400 block px-3 py-2 text-base font-medium">
                  Burns
                </Link>
                <Link href="/giveaway" className="text-gray-300 hover:text-teal-400 block px-3 py-2 text-base font-medium">
                  🎁 Giveaways
                </Link>
                <Link href="/whitepaper" className="text-purple-400 hover:text-purple-300 block px-3 py-2 text-base font-medium">
                  📄 Whitepaper
                </Link>
                <Link href="/vip" className="text-teal-400 hover:text-cyan-400 block px-3 py-2 text-base font-semibold">
                  VIP Club
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};