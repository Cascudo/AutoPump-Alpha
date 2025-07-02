// src/pages/admin.tsx - MINIMAL FIX: Just change component import
import type { NextPage } from "next";
import Head from "next/head";
import { useState } from 'react';
import { AdminGuard } from '../components/AdminGuard';
import { AdminDashboardStats } from '../components/AdminDashboardStats';
import { RewardDistributionAdmin } from '../components/RewardDistributionAdmin';
import { AdminBaselinePanel } from '../components/AdminBaselinePanel';
// ✅ ONLY CHANGE: Switch to AdminGiveawayCreator for package-based pricing (DEFAULT IMPORT)
import AdminGiveawayCreator from '../components/AdminGiveawayCreator';

type AdminSection = 'dashboard' | 'users' | 'rewards' | 'vip' | 'giveaways' | 'burns' | 'settings';

interface MenuItem {
  id: AdminSection;
  label: string;
  icon: string;
  description: string;
  badge?: string;
}

const Admin: NextPage = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      description: 'Overview & live stats'
    },
    {
      id: 'users',
      label: 'Users & Members',
      icon: '👥',
      description: 'User management, baseline entries',
      badge: 'NEW'
    },
    {
      id: 'rewards',
      label: 'Rewards & Draws',
      icon: '🎯',
      description: 'Daily draws, exclusions, testing'
    },
    {
      id: 'giveaways',
      label: 'Promotional Giveaways',
      icon: '🎁',
      description: 'Special prize draws & entry sales',
      badge: 'LIVE' // Updated to LIVE since packages are working
    },
    {
      id: 'vip',
      label: 'VIP Management',
      icon: '💎',
      description: 'Subscriptions, promotions',
      badge: 'LIVE'
    },
    {
      id: 'burns',
      label: 'Token Burns',
      icon: '🔥',
      description: 'Burn tracking & analytics'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      description: 'System configuration'
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardContent />;
      case 'users':
        return <UsersContent />;
      case 'rewards':
        return <RewardsContent />;
      case 'giveaways':
        return <GiveawaysContent />;
      case 'vip':
        return <VipContent />;
      case 'burns':
        return <BurnsContent />;
      case 'settings':
        return <SettingsContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div>
      <Head>
        <title>Admin Dashboard - ALPHA Club</title>
        <meta name="description" content="ALPHA Club administration panel - Authorized access only" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <AdminGuard requireAuth={true}>
        <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
          {/* Sidebar */}
          <div className="w-80 bg-black/60 backdrop-blur-xl border-r border-gray-800/50 p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="text-3xl">🔥</div>
              <div>
                <h1 className="text-xl font-bold text-white">ALPHA Club</h1>
                <p className="text-sm text-gray-400">Admin Dashboard</p>
              </div>
            </div>

            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 relative ${
                    activeSection === item.id 
                      ? 'bg-purple-600/20 border border-purple-500/30 text-white' 
                      : 'hover:bg-gray-800/50 text-gray-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-gray-400">{item.description}</div>
                      </div>
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.badge === 'LIVE' ? 'bg-green-600 text-white' :
                        item.badge === 'NEW' ? 'bg-blue-600 text-white' :
                        'bg-gray-600 text-gray-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </nav>

            <div className="mt-8 p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl border border-purple-500/30">
              <div className="text-sm text-gray-300 mb-2">🚀 System Status</div>
              <div className="text-xs text-green-400">✅ All systems operational</div>
              <div className="text-xs text-gray-400">Package pricing LIVE</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-8">
            <div className="max-w-7xl">
              {renderContent()}
            </div>
          </div>
        </div>
      </AdminGuard>
    </div>
  );
};

// Content Components - PRESERVING ALL EXISTING LOGIC
const DashboardContent = () => (
  <div className="space-y-8">
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h2>
        <p className="text-gray-400">Monitor ALPHA Club performance and manage system operations</p>
      </div>
      <div className="text-2xl animate-pulse">🔥</div>
    </div>
    
    <AdminDashboardStats />
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <button className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-xl font-semibold transition-all">🎯 Quick Actions</button>
      <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-xl font-semibold transition-all">💎 VIP Analytics</button>
      <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-semibold transition-all">👥 User Overview</button>
      <button className="bg-pink-600 hover:bg-pink-700 text-white p-4 rounded-xl font-semibold transition-all">🎁 Create Giveaway</button>
    </div>
  </div>
);

const UsersContent = () => (
  <div className="space-y-8">
    <AdminBaselinePanel />
  </div>
);

const RewardsContent = () => (
  <div className="space-y-8">
    <RewardDistributionAdmin />
  </div>
);

// ✅ ONLY CHANGE: Switch to AdminGiveawayCreator for package-based pricing
const GiveawaysContent = () => (
  <div className="space-y-8">
    <div className="flex justify-between items-center mb-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Promotional Giveaways</h2>
        <p className="text-gray-400">Create and manage special prize draws with package-based entry pricing</p>
      </div>
      <div className="text-2xl">🎁</div>
    </div>
    
    <AdminGiveawayCreator onGiveawayCreated={() => {
      console.log('✅ Giveaway created successfully!');
      // Optionally add success notification here
    }} />
  </div>
);

const VipContent = () => <div className="space-y-8">VIP Management Coming Soon</div>;
const BurnsContent = () => <div className="space-y-8">Token Burn Analytics Coming Soon</div>;
const SettingsContent = () => <div className="space-y-8">System Settings Coming Soon</div>;

export default Admin;