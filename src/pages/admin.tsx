// src/pages/admin.tsx - SECURED VERSION
import type { NextPage } from "next";
import Head from "next/head";
import { AdminGuard } from '../components/AdminGuard';
import { RewardDistributionAdmin } from '../components/RewardDistributionAdmin';

const Admin: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Admin Dashboard - ALPHA Club</title>
        <meta
          name="description"
          content="ALPHA Club administration panel - Authorized access only"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        {/* Prevent search engines from indexing admin pages */}
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      
      {/* Wrap everything in AdminGuard for security */}
      <AdminGuard requireAuth={true}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          {/* Welcome message for admin */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-500/20">
              <h1 className="text-2xl font-bold text-white mb-2">
                👋 Welcome, Admin!
              </h1>
              <p className="text-green-400">
                You have full access to the ALPHA Club administration panel.
              </p>
            </div>
          </div>

          {/* Admin Components */}
          <RewardDistributionAdmin />
          
        </div>
      </AdminGuard>
    </div>
  );
};

export default Admin;