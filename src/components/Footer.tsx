// src/components/Footer.tsx - Updated with spinning logo matching LoadingSpinner pattern
// FIXED: Using Next.js Image component for logo images
import { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const Footer: FC = () => {
  return (
    <footer className="bg-black border-t border-gray-800 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
          
          {/* ALPHA Club Brand with Spinning Logo - Using Actual Assets */}
          <div className="lg:col-span-1 w-full overflow-hidden">
            <div className="flex items-center space-x-3 mb-6 overflow-hidden">
              {/* Spinning Logo matching LoadingSpinner with slower rotation */}
              <div className="relative flex-shrink-0">
                {/* Spinning Outer Circle - Same assets as LoadingSpinner */}
                <div className="animate-spin" style={{ animationDuration: '4s' }}>
                  <Image 
                    src="/alpha-outer-circle-307x307px.png" 
                    alt="ALPHA Club"
                    width={48}
                    height={48}
                    className="w-12 h-12"
                  />
                </div>
                
                {/* Static Inner Circle - Same assets as LoadingSpinner */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image 
                    src="/alpha-inner-circle-307x307px.png" 
                    alt="ALPHA Club Inner"
                    width={40}
                    height={40}
                    className="w-10 h-10"
                  />
                </div>
              </div>
              
              <div className="overflow-hidden">
                <div className="text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  ALPHA
                </div>
                <div className="text-xs text-gray-400 font-medium tracking-wider -mt-1">
                  CLUB
                </div>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 break-words">
              Community-driven for a healthier DeFi ecosystem. Trade • Reward • Burn • Repeat.
            </p>
            <div className="flex space-x-4">
              <span className="inline-block px-3 py-1 bg-gradient-to-r from-teal-600/20 to-cyan-600/20 text-teal-400 text-xs font-semibold rounded-full border border-teal-500/30">
                Fair Launch
              </span>
              <span className="inline-block px-3 py-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-400 text-xs font-semibold rounded-full border border-purple-500/30">
                VIP Ready
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="w-full overflow-hidden">
            <h3 className="text-white font-semibold mb-4">Platform</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-gray-400 hover:text-teal-400 text-sm transition-colors break-words">
                  Member Dashboard
                </Link>
              </li>
              <li>
                <Link href="/rewards" className="text-gray-400 hover:text-teal-400 text-sm transition-colors break-words">
                  Daily Rewards
                </Link>
              </li>
              <li>
                <Link href="/burns" className="text-gray-400 hover:text-teal-400 text-sm transition-colors break-words">
                  Token Burns
                </Link>
              </li>
              <li>
                <Link href="/vip" className="text-gray-400 hover:text-teal-400 text-sm transition-colors break-words">
                  VIP Membership
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-gray-400 hover:text-teal-400 text-sm transition-colors break-words">
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="w-full overflow-hidden">
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/whitepaper" className="text-gray-400 hover:text-teal-400 text-sm transition-colors break-words">
                  📄 Whitepaper
                </Link>
              </li>
              <li>
                <a 
                  href="https://dexscreener.com/solana/4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-teal-400 text-sm transition-colors break-words"
                >
                  📊 Chart & Analytics
                </a>
              </li>
              <li>
                <a 
                  href="https://pump.fun/coin/4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-teal-400 text-sm transition-colors break-words"
                >
                  🚀 Buy $ALPHA
                </a>
              </li>
              <li>
                <Link href="/admin" className="text-gray-400 hover:text-teal-400 text-sm transition-colors break-words">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Live Stats */}
          <div className="w-full overflow-hidden">
            <h3 className="text-white font-semibold mb-4">Live Stats</h3>
            <ul className="space-y-2">
              <li className="text-gray-400 text-sm break-words">
                <span className="text-teal-400 font-semibold">100M</span> Dev Tokens Locked
              </li>
              <li className="text-gray-400 text-sm break-words">
                <span className="text-cyan-400 font-semibold">Daily</span> Reward Draws
              </li>
              <li className="text-gray-400 text-sm break-words">
                <span className="text-emerald-400 font-semibold">Transparent</span> Token Burns
              </li>
              <li className="text-gray-400 text-sm break-words">
                <span className="text-teal-400 font-semibold">Fair</span> Launch
              </li>
            </ul>
          </div>
        </div>

        {/* Contract Address */}
        <div className="border-t border-gray-800 mt-8 pt-8 w-full">
          <div className="bg-gray-900/50 rounded-xl p-4 mb-6 w-full overflow-hidden">
            <div className="text-center w-full">
              <div className="text-teal-400 text-sm font-semibold mb-2">$ALPHA Contract Address</div>
              <div className="font-mono text-gray-300 text-xs break-all max-w-full overflow-wrap-anywhere">
                4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump
              </div>
            </div>
          </div>
        </div>

        {/* Social Media Links Row */}
        <div className="border-t border-gray-800 pt-6 pb-6 w-full">
          <div className="flex justify-center items-center w-full">
            <div className="flex items-center space-x-6">
              <span className="text-gray-400 text-sm font-medium">Follow Us:</span>
              {[
                { href: 'https://pump.fun/coin/4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump', src: '/pumpfun.png', alt: 'Pump.fun' },
                { href: 'https://x.com/AutopumpAlpha', src: '/x.png', alt: 'X (Twitter)' },
                { href: 'https://t.me/cascudox', src: '/telegram_logo.svg', alt: 'Telegram' },
                { href: 'https://dexscreener.com/solana/4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump', src: '/dexs-b.png', alt: 'DexScreener' },
              ].map(({ href, src, alt }, index) => (
                <a
                  key={index}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transform transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75 rounded-full"
                  aria-label={alt}
                >
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-800/50 backdrop-blur-sm rounded-full border border-gray-700 hover:border-teal-400/50 hover:bg-gray-700/50 transition-all duration-300">
                    <Image
                      src={src}
                      alt={alt}
                      width={24}
                      height={24}
                      className="object-contain w-6 h-6 filter brightness-75 hover:brightness-100 transition-all"
                    />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 w-full">
          <div className="flex flex-col sm:flex-row justify-between items-center w-full overflow-hidden">
            <div className="text-gray-500 text-sm mb-4 sm:mb-0 text-center sm:text-left">
              © 2024 ALPHA Club. Built on Solana.
            </div>
            <div className="flex items-center space-x-4 sm:space-x-6 flex-wrap justify-center sm:justify-end">
              <div className="flex items-center space-x-2 text-gray-500 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0"></div>
                <span className="whitespace-nowrap">Live Rewards Active</span>
              </div>
              <a 
                href="https://solana.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" viewBox="0 0 646 96" fill="currentColor">
                  <path d="M108.53 75.6899L90.81 94.6899C90.4267 95.1026 89.9626 95.432 89.4464 95.6573C88.9303 95.8827 88.3732 95.9994 87.81 95.9999H3.81C3.40937 95.9997 3.01749 95.8827 2.68235 95.6631C2.34722 95.4436 2.08338 95.1311 1.92313 94.7639C1.76288 94.3967 1.71318 93.9908 1.78012 93.5958C1.84706 93.2008 2.02772 92.8338 2.3 92.5399L20 73.5399C20.3833 73.1273 20.8474 72.7979 21.3636 72.5725C21.8797 72.3472 22.4368 72.2305 23 72.2299H107C107.404 72.2216 107.802 72.333 108.143 72.5502C108.484 72.7674 108.754 73.0806 108.917 73.4504C109.081 73.8203 109.131 74.2303 109.062 74.6288C108.993 75.0273 108.808 75.3965 108.53 75.6899ZM90.81 37.4199C90.4253 37.0091 89.9608 36.6811 89.445 36.4558C88.9292 36.2306 88.3728 36.1129 87.81 36.11H3.81C3.40937 36.1102 3.01749 36.2272 2.68235 36.4468C2.34722 36.6663 2.08338 36.9788 1.92313 37.346C1.76288 37.7132 1.71318 38.1191 1.78012 38.5141C1.84706 38.9091 2.02772 39.2761 2.3 39.57L20 58.58C20.3847 58.9908 20.8492 59.3188 21.365 59.5441C21.8808 59.7693 22.4372 59.887 23 59.8899H107C107.4 59.8878 107.79 59.7693 108.124 59.5491C108.458 59.3288 108.72 59.0162 108.879 58.6494C109.038 58.2826 109.087 57.8774 109.019 57.4833C108.952 57.0892 108.772 56.7232 108.5 56.43L90.81 37.4199ZM3.81 23.7699H87.81C88.3732 23.7694 88.9303 23.6527 89.4464 23.4273C89.9626 23.202 90.4267 22.8726 90.81 22.4599L108.53 3.45995C108.808 3.16647 108.993 2.79726 109.062 2.39877C109.131 2.00028 109.081 1.59031 108.917 1.22045C108.754 0.850591 108.484 0.537368 108.143 0.320195C107.802 0.103021 107.404 -0.0084012 107 -5.10783e-05H23C22.4368 0.000541762 21.8797 0.117167 21.3636 0.342553C20.8474 0.567938 20.3833 0.897249 20 1.30995L2.3 20.3099C2.02772 20.6038 1.84706 20.9708 1.78012 21.3658C1.71318 21.7608 1.76288 22.1667 1.92313 22.5339C2.08338 22.9011 2.34722 23.2136 2.68235 23.4331C3.01749 23.6527 3.40937 23.7697 3.81 23.7699Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};